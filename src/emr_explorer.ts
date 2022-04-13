import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import {
  EMR,
  ListClustersCommand,
  ClusterState,
  ListClustersInput,
  DescribeClusterCommand,
  DescribeClusterCommandInput,
  Application,
} from "@aws-sdk/client-emr";

export class NodeDependenciesProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  emrClient: EMR;
  private _onDidChangeTreeData: vscode.EventEmitter<
    EMRCluster | undefined | null | void
  > = new vscode.EventEmitter<EMRCluster | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    EMRCluster | undefined | null | void
  > = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  constructor(private workspaceRoot: string) {
    this.emrClient = new EMR({ region: "us-west-2" });
  }

  getTreeItem(element: EMRCluster): vscode.TreeItem {
    return element;
  }

  getChildren(element?: EMRCluster): Thenable<vscode.TreeItem[]> {
    if (element) {
      return Promise.resolve(element.getChildren());
    } else {
      return Promise.resolve(this.listEMRClusters(this.emrClient));
    }
  }

  private async listEMRClusters(client: EMR): Promise<EMRCluster[]> {
    // Currently only show running or waiting clusters
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const params = {
      ClusterStates: [ClusterState.RUNNING, ClusterState.WAITING],
    };
    vscode.window.showInformationMessage(
      "Fetching running and waiting clusters"
    );
    try {
      const result = await client.send(new ListClustersCommand(params));
      return (result.Clusters || []).map((cluster) => {
        return new EMRCluster(
          cluster.Name || "",
          cluster.Id || "",
          this.emrClient,
          vscode.TreeItemCollapsibleState.Collapsed
        );
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
    private readonly emr: EMR,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(name, collapsibleState);
    this.tooltip = `${this.name} (${this.id})`;
    this.description = this.id;
  }

  public async getChildren(element?: EMRCluster): Promise<vscode.TreeItem[]> {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const response = await this.emr.send(
      new DescribeClusterCommand({ ClusterId: this.id })
    );
    return [
      new EMRClusterApps(
        this.emr,
        response.Cluster ? response.Cluster.Applications : undefined
      ),
      new EMRClusterInstances(this.emr),
    ];
  }
}

class EMRClusterApps extends vscode.TreeItem {
  constructor(
    private readonly emr: EMR,
    private readonly apps: Application[] | undefined
  ) {
    super("Apps", vscode.TreeItemCollapsibleState.Collapsed);
  }

  getTreeItem(element: EMRClusterApps): vscode.TreeItem {
    return element;
  }

  getChildren(): vscode.TreeItem[] {
    return (this.apps || []).map((item) => new EMRAppNode(item));
  }
}

class EMRClusterInstances extends vscode.TreeItem {
  constructor(private readonly emr: EMR) {
    super("Instances", vscode.TreeItemCollapsibleState.Collapsed);
  }

  getTreeItem(element: EMRClusterApps): vscode.TreeItem {
    return element;
  }

  getChildren(): vscode.TreeItem[] {
    return [
      new vscode.TreeItem(
        "Master - r5.4xl",
        vscode.TreeItemCollapsibleState.None
      ),
      new vscode.TreeItem(
        "Core - 2 r5.8xl",
        vscode.TreeItemCollapsibleState.None
      ),
    ];
  }
}

class EMRAppNode extends vscode.TreeItem {
  constructor(private readonly app: Application) {
    super(app.Name || "Unknown");
    this.description = app.Version;
  }
}
