import { Table } from "@aws-sdk/client-glue";
import * as vscode from "vscode";
import { DefaultGlueClient } from "../clients/glueClient";
import * as crypto from "crypto";



export async function getWebviewContent(node: vscode.TreeItem, glueClient: DefaultGlueClient, extensionUri: vscode.Uri, webview: vscode.Webview) {

    const databaseName: string = node.id!.split(" ")[1];
    const tableName: string = node.label!.toString().split(" ")[0];

    const table: Table | undefined = await glueClient.getTable(tableName, databaseName);
    let nonce = crypto.randomBytes(16).toString('base64');
    let jsScript: string = `
    const items = {array-json-objects};

    function parseSchema(s) {
      if (s.startsWith("array<")) {
        return new Array(parseSchema(s.slice(6, -1)));
      } else if (s.startsWith("struct<")) {
        return parseStructFields(s.slice(7, -1));
      } else if (s.indexOf(":") > -1) {
        return parseStructFields(s);
      } else {
        return s;
      }
    }
    
    reCommaSplit = RegExp(",(?![^<]*>)");
    reColonSplit = RegExp(":(?![^<]*>)");
    
    // Ref: https://spark.apache.org/docs/2.1.2/api/python/_modules/pyspark/sql/types.html
    function parseStructFields(s) {
      const parts = s.split(reCommaSplit);
      const fields = {};
    
      parts.forEach((part) => {
        const name_and_type = part.split(reColonSplit);
        const field_name = name_and_type[0];
        field_type = parseSchema(name_and_type[1]);
        fields[field_name] = field_type;
      });
      return fields;
    }
    
    function loadTableData(tableColumns) {
      const table = document.getElementById("glueTableColumn");

      tableColumns.forEach( tableColumn => {
        let typeValue = tableColumn.Type;
        if (typeValue && typeValue.indexOf('<') > -1) {
          typeValue = "struct: " + JSON.stringify(parseSchema(typeValue), null, 2);
        }
        let row = table.insertRow();
        let name = row.insertCell(0);
        p = document.createElement("pre")
        p.appendChild(document.createTextNode(tableColumn.Name));
        name.appendChild(p);
        name.className = "column1";
        let dataType = row.insertCell(1);
        p2 = document.createElement("pre")
        p2.appendChild(document.createTextNode(typeValue));
        dataType.appendChild(p2);
      });
    }

    loadTableData(items);`;

    jsScript = jsScript.replace("{array-json-objects}", JSON.stringify(table?.StorageDescriptor?.Columns));
    const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath( extensionUri, 'media', 'glue.css'));

    // const stylePath = vscode.Uri.file(path.join(context.extensionPath, 'media', 'glue.css'));
    // const styleSrc = panel.webview.asWebviewUri(stylePath);

    // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta
                http-equiv="Content-Security-Policy"
                content="default-src 'none'; script-src 'nonce-${nonce}'; style-src ${webview.cspSource}; font-src ${webview.cspSource};"
            >
          <link href="${codiconsUri}" rel="stylesheet" />
          <link rel="stylesheet" type="text/css" href="${styleUri}">
        </head>

        <body>
        <div class="container">
          <header><h1>Glue Table details</h1></header>
          <ul class="meta">
            <li class="icons"><i class="codicon codicon-database"></i> ${table!.DatabaseName}</li>
            <li class="icons"><i class="codicon codicon-table"></i> ${table!.Name}</li>
            <li class="icons"><i class="codicon codicon-versions"></i> version: ${table!.VersionId}</li>
          </ul>
    
          <h2>Columns</h2>
          <table id="glueTable">
            <thead>
              <tr>
                <th class="column1">Column Name</th>
                <th class="column2">Data Type</th>
              </tr>
            </thead>
            <tbody id="glueTableColumn"></tbody>
          </table>
        </div>
          

          <script nonce="${nonce}">
            ${jsScript}
          </script>
        </body>
      </html>
    `;
  }