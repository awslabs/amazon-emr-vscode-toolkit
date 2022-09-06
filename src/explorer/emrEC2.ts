// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as vscode from "vscode";
import {
  Cluster,
  ClusterApp,
  ClusterStep,
  DefaultEMRClient,
} from "../clients/emrClient";
import { EMREC2Filter } from "../emr_explorer";
import { globals } from "../extension";

export class EMRNode implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    EMRClusterNode | undefined | null | void
  > = new vscode.EventEmitter<EMRClusterNode | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    EMRClusterNode | undefined | null | void
  > = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public constructor(
    private readonly emr: DefaultEMRClient,
    private stateFilter: EMREC2Filter
  ) {
    stateFilter.onDidChange((message) => {
      this.refresh();
    });
  }

  getTreeItem(element: EMRClusterNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: EMRClusterNode): Promise<vscode.TreeItem[]> {
    if (element) {
      return Promise.resolve(element.getChildren());
    } else {
      return Promise.resolve(
        this.emr
          .listClusters(this.stateFilter)
          .then((clusters) =>
            clusters.map(
              (cluster) =>
                new EMRClusterNode(cluster.id!, cluster.name!, this.emr)
            )
          )
      );
    }
  }
}

export class EMRClusterNode extends vscode.TreeItem {
  constructor(
    public readonly id: string,
    private readonly name: string,
    private readonly emr: DefaultEMRClient
  ) {
    super(name, vscode.TreeItemCollapsibleState.Collapsed);
    this.tooltip = `${name} (${id})`;
    this.description = id;
    this.contextValue = "EMRCluster";
  }

  public async getChildren(
    element?: EMRClusterNode
  ): Promise<vscode.TreeItem[]> {
    const response = await this.emr.describeCluster(this.id);

    return [
      new EMRClusterAppsNode(response?.apps),
      response
        ? new EMRClusterStepsNode(response, this.emr)
        : new vscode.TreeItem("Steps"),
    ];
  }
}

class EMRClusterAppsNode extends vscode.TreeItem {
  constructor(private readonly apps: ClusterApp[] | undefined) {
    super("Apps", vscode.TreeItemCollapsibleState.Collapsed);
  }

  getTreeItem(element: EMRClusterAppsNode): vscode.TreeItem {
    return element;
  }

  getChildren(): vscode.TreeItem[] {
    return (this.apps || []).map((item) => new EMRAppNode(item));
  }
}

class EMRAppNode extends vscode.TreeItem {
  constructor(private readonly app: ClusterApp) {
    super(app.name || "Unknown");
    this.description = app.version;
  }
}

class EMRClusterStepsNode extends vscode.TreeItem {
  constructor(
    private readonly cluster: Cluster,
    private readonly emr: DefaultEMRClient
  ) {
    super("Steps", vscode.TreeItemCollapsibleState.Collapsed);
  }

  getTreeItem(element: EMRClusterStepsNode): vscode.TreeItem {
    return element;
  }

  async getChildren(
    element?: EMRClusterStepsNode | undefined
  ): Promise<vscode.TreeItem[]> {
    const response = await this.emr.listSteps(this.cluster.id!);
    const emptyStep = new vscode.TreeItem("[No Steps found]");
    if (response.length === 0) {
      return [emptyStep];
    } else {
      return response.map((item) => new EMRStepNode(item));
    }
  }
}

class EMRStepNode extends vscode.TreeItem {
  constructor(private readonly step: ClusterStep) {
    super(`${step.name || step.id} [${step.state}]`);
    this.id = step.id;
    this.description = step.id;
    this.tooltip = step.stateDetails;
    this.contextValue = "EMRClusterStep";

    if (step.state === "FAILED") {
      this.iconPath = {
        dark: vscode.Uri.joinPath(
          globals.context.extensionUri,
          "resources",
          "dark",
          "alert-circle.svg"
        ),
        light: vscode.Uri.joinPath(
          globals.context.extensionUri,
          "resources",
          "light",
          "alert-circle.svg"
        ),
      };
    }
  }
}
