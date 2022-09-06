// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as vscode from "vscode";
import {
  EMRServerlessClient,
  JobRunSummary,
  ListApplicationsCommand,
  ListJobRunsCommand,
  StartJobRunCommand,
} from "@aws-sdk/client-emr-serverless";

export class EMRServerlessProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  emrServerlessClient: EMRServerlessClient;
  private _ondidChangeTreeData: vscode.EventEmitter<
    EMRServerlessApplication | undefined | null | void
  > = new vscode.EventEmitter<
    EMRServerlessApplication | undefined | null | void
  >();
  readonly onDidChangeTreeData: vscode.Event<
    EMRServerlessApplication | undefined | null | void
  > = this._ondidChangeTreeData.event;

  refresh(): void {
    this._ondidChangeTreeData.fire();
  }

  constructor() {
    this.emrServerlessClient = new EMRServerlessClient({ region: "us-west-2" });
  }

  getTreeItem(element: EMRServerlessApplication): vscode.TreeItem {
    return element;
  }

  getChildren(element?: EMRServerlessApplication): Thenable<vscode.TreeItem[]> {
    if (element) {
      return Promise.resolve(element.getChildren());
    } else {
      return Promise.resolve(
        this.listEMRServerlessApplications(this.emrServerlessClient)
      );
    }
  }

  public async triggerServerlessJob(
      applicationID: string,
      entryPoint: string,
      logPath: string,
      jobRole: string,
  ): Promise<string> {
      const params = {
          applicationId: applicationID,
          executionRoleArn: jobRole,
          name: "test-deploy",
          jobDriver: {
              sparkSubmit: {
                entryPoint: entryPoint
              }
          },
          configurationOverrides: {
              monitoringConfiguration: {
                s3MonitoringConfiguration: {
                    logUri: logPath
                }
              }
          }
      };

      const startJobRunRequest = new StartJobRunCommand(params);
      const result = await this.emrServerlessClient.send(startJobRunRequest);
      return result.jobRunId!;
  }

  private async listEMRServerlessApplications(
      client: EMRServerlessClient
  ): Promise<EMRServerlessApplication[]> {
      const params = {};
      try {
          const result = await client.send(new ListApplicationsCommand(params));
          vscode.window.showInformationMessage("Fetching EMR Serverless applications");
          return (result.applications || []).map(app => {
              return new EMRServerlessApplication(
                  this.emrServerlessClient,
                  app.name || "",
                  app.id || "",
              );
          });
      } catch (error) {
          vscode.window.showErrorMessage("Error fetching EMR Serverless applications" + error);
          console.log(error);
          return [];
      }
  }
}

class EMRServerlessApplication extends vscode.TreeItem {
  constructor(
    private readonly client: EMRServerlessClient,
    public readonly name: string,
    public readonly id: string
  ) {
    super(name, vscode.TreeItemCollapsibleState.Collapsed);
    this.tooltip = `${this.name} (${this.id})`;
    this.description = this.id;
    this.client = client;
  }
  
  getTreeItem(element: EMRServerlessJobRun): vscode.TreeItem {
    return element;
  }

  getChildren(element?: EMRServerlessJobRun): Thenable<EMRServerlessJobRun[]> {
    return Promise.resolve(
      this.listJobRuns()
    );
  }

  private async listJobRuns(): Promise<EMRServerlessJobRun[]> {
    const params = {};
    try {
      const result = await this.client.send(new ListJobRunsCommand({ applicationId: this.id }));
      return result.jobRuns?.map(jobRun => {
        return new EMRServerlessJobRun(this.client, this.id, jobRun);
      }) || [];
    } catch (error) {
      vscode.window.showErrorMessage("Error fetching job runs!" + error);
      return [];
    }
  }
}

class EMRServerlessJobRun extends vscode.TreeItem {
    constructor(
        private readonly client: EMRServerlessClient,
        private readonly applicationId: string,
        private readonly jobRun: JobRunSummary,
    ) {
        super(jobRun.name? `${jobRun.name} (${jobRun.id}` : jobRun.id!);
        this.id = jobRun.id;
        this.description = jobRun.state;
        this.tooltip = jobRun.stateDetails;
    }
}