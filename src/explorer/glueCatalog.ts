// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as vscode from "vscode";
import { DefaultGlueClient } from "../clients/glueClient";
import { Database, Table } from "@aws-sdk/client-glue";

export class GlueCatalogNode
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
  GlueCatalogDatabaseNode | undefined | null | void
  > = new vscode.EventEmitter<
  GlueCatalogDatabaseNode | undefined | null | void
  >();
  readonly onDidChangeTreeData: vscode.Event<
  GlueCatalogDatabaseNode | undefined | null | void
  > = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public constructor(private readonly glue: DefaultGlueClient) {}

  getTreeItem(element: GlueCatalogDatabaseNode): vscode.TreeItem {
    return element;
  }

  async getChildren(
    element?: GlueCatalogDatabaseNode
  ): Promise<vscode.TreeItem[]> {
    if (element) {
      return Promise.resolve(element.getChildren());
    } else {
      const glueDatabases = await this.glue.listDatabases();
      return Promise.resolve(
        glueDatabases.map(
          (glueDatabase: Database) =>
            new GlueCatalogDatabaseNode(glueDatabase.Name!, this.glue)
        )
      );
    }
  }
}

export class GlueCatalogDatabaseNode extends vscode.TreeItem {
  constructor(
    private readonly databaseName: string,
    private readonly glue: DefaultGlueClient
  ) {
    super(databaseName, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = "Glue Database";
  }

  getTreeItem(element: GlueCatalogTable): vscode.TreeItem {
    return element;
  }

  getChildren(
    element?: GlueCatalogTable
  ): Thenable<GlueCatalogTable[]> {
    return Promise.resolve(
      this.glue
        .listTables(this.databaseName)
        .then((tables) =>
          tables.map((table) => new GlueCatalogTable(table))
        )
    );
  }

}

export class GlueCatalogTable extends vscode.TreeItem {
  constructor(
    private readonly gluetable: Table
  ) {
    super(`${gluetable.Name} v:${gluetable.VersionId}`);
    this.contextValue = "GlueCatalogTable";
    this.id = `${gluetable.Name} ${gluetable.DatabaseName}`;
    this.tooltip = gluetable.VersionId;
  }
}
