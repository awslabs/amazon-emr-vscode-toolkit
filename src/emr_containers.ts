import * as vscode from "vscode";
import {
  EMRContainersClient,
  JobRun,
  ListJobRunsCommand,
  ListVirtualClustersCommand,
} from "@aws-sdk/client-emr-containers";

export class EMRContainersProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
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

  getChildren(element?: EMRVirtualCluster): Thenable<vscode.TreeItem[]> {
    if (element) {
      return Promise.resolve(element.getChildren());
    } else {
      return Promise.resolve(
        this.listEMRVirtualClusters(this.emrContainersClient)
      );
    }
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
          this.emrContainersClient,
          cluster.name || "",
          cluster.id || "",
        );
      });
    } catch (error) {
      vscode.window.showErrorMessage("Bummer!" + error);
      console.log("There was an error fetching clusters", error);
      return [];
    }
  }
}

// EOD: Pass cluster to EMRVIrtualCluster
// Update listJobRuns

class EMRVirtualCluster extends vscode.TreeItem {
  constructor(
    private readonly client: EMRContainersClient,
    public readonly name: string,
    public readonly id: string,
  ) {
    super(name, vscode.TreeItemCollapsibleState.Collapsed);
    this.tooltip = `${this.name} (${this.id})`;
    this.description = this.id;
    this.client = client;
  }
  
  getTreeItem(element: EMRVirtualClusterJob): vscode.TreeItem {
    return element;
  }

  getChildren(element?: EMRVirtualClusterJob): Thenable<EMRVirtualClusterJob[]> {
    return Promise.resolve(
      this.listJobRuns()
    );
  }

  private async listJobRuns(): Promise<EMRVirtualClusterJob[]> {
    const params = {};
    try {
      const result = await this.client.send(new ListJobRunsCommand({ virtualClusterId: this.id }));
      return result.jobRuns?.map(jobRun => {
        return new EMRVirtualClusterJob(this.client, this.id, jobRun);
      }) || [];
    } catch (error) {
      vscode.window.showErrorMessage("Error fetching job runs!" + error);
      return [];
    }
  }
}

class EMRVirtualClusterJob extends vscode.TreeItem {
  constructor(
    private readonly client: EMRContainersClient,
    private readonly virtualClusterId: string,
    private readonly jobRun: JobRun,
  ) {
    super(jobRun.name!);
    this.id = jobRun.id;
    this.description = jobRun.state;
    this.tooltip = jobRun.stateDetails;
  }
}
