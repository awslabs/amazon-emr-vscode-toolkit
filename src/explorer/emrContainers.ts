import * as vscode from "vscode";
import {
  DefaultEMRContainersClient,
  JobRun,
} from "../clients/emrContainersClient";

export class EMRContainersNode
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    EMRVirtualClusterNode | undefined | null | void
  > = new vscode.EventEmitter<
    EMRVirtualClusterNode | undefined | null | void
  >();
  readonly onDidChangeTreeData: vscode.Event<
    EMRVirtualClusterNode | undefined | null | void
  > = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public constructor(private readonly emr: DefaultEMRContainersClient) {}

  getTreeItem(element: EMRVirtualClusterNode): vscode.TreeItem {
    return element;
  }

  async getChildren(
    element?: EMRVirtualClusterNode
  ): Promise<vscode.TreeItem[]> {
    if (element) {
      return Promise.resolve(element.getChildren());
    } else {
      const virtualClusters = await this.emr.listVirtualClusters();
      return Promise.resolve(
        virtualClusters.map(
          (cluster) =>
            new EMRVirtualClusterNode(cluster.id!, cluster.name!, this.emr)
        )
      );
    }
  }
}

export class EMRVirtualClusterNode extends vscode.TreeItem {
  constructor(
    public readonly id: string,
    private readonly name: string,
    private readonly emr: DefaultEMRContainersClient
  ) {
    super(name, vscode.TreeItemCollapsibleState.Collapsed);
    this.tooltip = `${this.name} (${this.id})`;
  }

  getTreeItem(element: EMRVirtualClusterJob): vscode.TreeItem {
    return element;
  }

  getChildren(
    element?: EMRVirtualClusterJob
  ): Thenable<EMRVirtualClusterJob[]> {
    return Promise.resolve(
      this.emr
        .listJobRuns(this.id)
        .then((jobruns) =>
          jobruns.map((jobRun) => new EMRVirtualClusterJob(this.id, jobRun))
        )
    );
  }
}

export class EMRVirtualClusterJob extends vscode.TreeItem {
  constructor(
    private readonly virtualClusterId: string,
    private readonly jobRun: JobRun
  ) {
    super(jobRun.name!);
    this.id = jobRun.id;
    this.description = jobRun.state;
    this.tooltip = jobRun.stateDetails;
  }
}
