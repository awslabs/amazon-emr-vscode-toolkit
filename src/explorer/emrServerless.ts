import * as vscode from "vscode";
import {
  DefaultEMRServerlessClient,
  JobRun,
} from "../clients/emrServerlessClient";

export class EMRServerlessNode
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    EMRApplicationNode | undefined | null | void
  > = new vscode.EventEmitter<EMRApplicationNode | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    EMRApplicationNode | undefined | null | void
  > = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public constructor(private readonly emr: DefaultEMRServerlessClient) {}

  getTreeItem(element: EMRApplicationNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: EMRApplicationNode): Promise<vscode.TreeItem[]> {
    if (element) {
      return Promise.resolve(element.getChildren());
    } else {
      const applications = await this.emr.listApplications();
      return Promise.resolve(
        applications.map(
          (app) => new EMRApplicationNode(app.id!, app.name!, this.emr)
        )
      );
    }
  }
}

export class EMRApplicationNode extends vscode.TreeItem {
  constructor(
    public readonly id: string,
    private readonly name: string,
    private readonly emr: DefaultEMRServerlessClient
  ) {
    super(name, vscode.TreeItemCollapsibleState.Collapsed);
    this.tooltip = `${this.name} (${this.id})`;
    this.description = this.id;
    this.contextValue = "EMRServerlessApplication";
  }

  getTreeItem(element: EMRServerlessJob): vscode.TreeItem {
    return element;
  }

  getChildren(element?: EMRServerlessJob): Thenable<EMRServerlessJob[]> {
    return Promise.resolve(
      this.emr
        .listJobRuns(this.id)
        .then((jobruns) =>
          jobruns.map((jobRun) => new EMRServerlessJob(this.id, jobRun))
        )
    );
  }
}

export class EMRServerlessJob extends vscode.TreeItem {
  constructor(
    private readonly virtualClusterId: string,
    private readonly jobRun: JobRun
  ) {
    const displayName = jobRun.name
      ? `${jobRun.name} (${jobRun.id})`
      : jobRun.id!;
    super(displayName);
    this.id = jobRun.id;
    this.description = jobRun.state;
    this.tooltip = jobRun.stateDetails;
  }
}
