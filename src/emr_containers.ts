import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import {
  EMRContainersClient,
  ListVirtualClustersCommand,
} from "@aws-sdk/client-emr-containers";

export class EMRContainersProvider
  implements vscode.TreeDataProvider<EMRVirtualCluster>
{
  emrContainersClient: EMRContainersClient;
  private _onDidChangeTreeData: vscode.EventEmitter<
    EMRVirtualCluster | undefined | null | void
  > = new vscode.EventEmitter<EMRVirtualCluster | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    EMRVirtualCluster | undefined | null | void
  > = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  constructor() {
    this.emrContainersClient = new EMRContainersClient({ region: "us-east-1" });
  }

  getTreeItem(element: EMRVirtualCluster): vscode.TreeItem {
    return element;
  }

  getChildren(element?: EMRVirtualCluster): Thenable<EMRVirtualCluster[]> {
    return Promise.resolve(
      this.listEMRVirtualClusters(this.emrContainersClient)
    );
  }

  private async listEMRVirtualClusters(
    client: EMRContainersClient
  ): Promise<EMRVirtualCluster[]> {
    const params = {};
    try {
      // Note that this requires aws-sdk<=v3.30.0 
      // due to https://github.com/aws/aws-sdk-js-v3/issues/3511
      const result = await client.send(new ListVirtualClustersCommand(params));
      vscode.window.showInformationMessage("Fetching EMR Virtual clusters");
      return (result.virtualClusters || []).map((cluster) => {
        return new EMRVirtualCluster(
          cluster.name || "",
          cluster.id || "",
          vscode.TreeItemCollapsibleState.None
        );
      });
    } catch (error) {
      vscode.window.showErrorMessage("Bummer!" + error);
      console.log("There was an error fetching clusters", error);
      return [];
    }
  }
}

class EMRVirtualCluster extends vscode.TreeItem {
  constructor(
    public readonly name: string,
    public readonly id: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(name, collapsibleState);
    this.tooltip = `${this.name} (${this.id})`;
    this.description = this.id;
  }
}
