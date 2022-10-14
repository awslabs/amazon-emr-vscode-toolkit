import { Table } from "@aws-sdk/client-glue";
import * as vscode from "vscode";
import { DefaultGlueClient } from "../clients/glueClient";
import * as crypto from "crypto";



export async function getWebviewContent(node: vscode.TreeItem, glueClient: DefaultGlueClient) {

    const databaseName: string = node.id!.split(" ")[1];
    const tableName: string = node.label!.toString().split(" ")[0];

    const table: Table | undefined = await glueClient.getTable(tableName, databaseName);
    let nonce = crypto.randomBytes(16).toString('base64');
    let jsScript: string = `
    const items = {array-json-objects};
    
    function loadTableData(tableColumns) {
      const table = document.getElementById("glueTableColumn");

      tableColumns.forEach( tableColumn => {
        let row = table.insertRow();
        let name = row.insertCell(0);
        name.innerHTML = tableColumn.Name;
        let dataType = row.insertCell(1);
        dataType.innerHTML = tableColumn.Type;
      });
    }

    loadTableData(items);`;

    jsScript = jsScript.replace("{array-json-objects}", JSON.stringify(table?.StorageDescriptor?.Columns));

    // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta
                http-equiv="Content-Security-Policy"
                content="default-src 'none'; script-src 'nonce-${nonce}';"
            >
        </head>

        <body>
          <h1>Glue Table details </h1>
          <h2> Database: ${table!.DatabaseName}  </h2>
          <h3> Name: ${table!.Name}  </h3>
          <h3> Version: ${table!.VersionId}  </h3>
          <h2>Columns</h2>
          <table id="glueTable">
            <thead>
              <tr>
                <th>Column Name</th>
                <th>Data Type</th>
              </tr>
            </thead>
            <tbody id="glueTableColumn"></tbody>
          </table>
          <script nonce="${nonce}">
            ${jsScript}
          </script>
        </body>
      </html>
    `;
  }