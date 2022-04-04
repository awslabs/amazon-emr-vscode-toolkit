import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { EMR, ListClustersCommand, ClusterState, ListClustersInput } from "@aws-sdk/client-emr";

export class NodeDependenciesProvider implements vscode.TreeDataProvider<EMRCluster> {
  emrClient: EMR;
  private _onDidChangeTreeData: vscode.EventEmitter<EMRCluster | undefined | null | void> = new vscode.EventEmitter<EMRCluster | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<EMRCluster | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
  
  constructor(private workspaceRoot: string) {
    this.emrClient = new EMR({region: "us-west-2"});
  }

  getTreeItem(element: EMRCluster): vscode.TreeItem {
    return element;
  }

  getChildren(element?: EMRCluster): Thenable<EMRCluster[]> {
      return Promise.resolve(this.listEMRClusters(this.emrClient));
  }

  private async listEMRClusters(client: EMR): Promise<EMRCluster[]> {
    // Currently only show running or waiting clusters
    const params = {ClusterStates: [ClusterState.RUNNING, ClusterState.WAITING]};
    vscode.window.showInformationMessage('Fetching running and waiting clusters');
    try {
      const result = await client.send(new ListClustersCommand(params));
      return (result.Clusters || []).map(cluster => {
        return new EMRCluster(cluster.Name || "", cluster.Id || "", vscode.TreeItemCollapsibleState.None);
      });
    } catch (e) {
      vscode.window.showErrorMessage("Bummer!" + e);
      console.log("There was an error fetching clusters", e);
      return [];
    }
    
  }
}

class EMRCluster extends vscode.TreeItem {
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