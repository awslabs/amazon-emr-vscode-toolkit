// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as vscode from "vscode";
import {
  EMRServerlessClient,
  JobDriver,
  JobRunSummary,
  ListApplicationsCommand,
  ListJobRunsCommand,
  ListJobRunsRequest,
  StartJobRunCommand,
  StartJobRunCommandInput,
  StartJobRunRequest,
} from "@aws-sdk/client-emr-serverless";
import { Globals } from "../extension";

export interface Application {
    readonly id?: string;
    readonly name?: string;
}

export interface JobRun {
    readonly applicationId?: string;
    readonly id?: string;
    readonly name?: string;
    readonly state?: string;
    readonly stateDetails?: string;
  }

export class DefaultEMRServerlessClient {
    public constructor(private readonly globals: Globals) {}

    private async createEMRServerless(): Promise<EMRServerlessClient> {
        return new EMRServerlessClient(this.globals.awsContext.getClientConfig());
    }

    public async listApplications(): Promise<Application[]> {
        this.globals.outputChannel.appendLine(
            `EMR Serverless: Fetching applications from ${this.globals.awsContext.getRegion()} region.`
          );
          const emr = await this.createEMRServerless();
          let applications: Application[];

          try {
            const result = await emr.send(new ListApplicationsCommand({}));
      
            applications = result.applications ?? [];
          } catch (error) {
            vscode.window.showErrorMessage(
              "Error fetching EMR Serverless applications!" + error
            );
            return [];
          }
      
          return applications;
    }

    public async listJobRuns(applicationId: string): Promise<JobRun[]> {
        this.globals.outputChannel.appendLine(
          `EMR Serverless: Fetching job runs for application ${applicationId}.`
        );
        const emr = await this.createEMRServerless();
        let jobRuns: JobRun[] = [];
        let request: ListJobRunsRequest = {
          applicationId: applicationId,
        };
    
        try {
          do {
            const result = await emr.send(new ListJobRunsCommand(request));
            jobRuns = jobRuns.concat(result.jobRuns ?? []);
            if (!result.nextToken || jobRuns.length >= 100) {
              break;
            }
            request['nextToken'] = result.nextToken;
          } while (request['nextToken']);
        } catch (error) {
          vscode.window.showErrorMessage(
            "Error fetching EMR application job runs!" + error
          );
        }

        return jobRuns;
      }
  
    public async startJobRun(applicationId: string, executionRoleARN: string, entryPoint: string, logPrefix: string): Promise<JobRun> {
      this.globals.outputChannel.appendLine(
        `EMR Serverless: Starting job run (${applicationId}).`
      );

      const emr = await this.createEMRServerless();
      let jobRun: JobRun = {};

      let jobRunParams: StartJobRunCommandInput = {
        applicationId,
        executionRoleArn: executionRoleARN,
        jobDriver: {
          sparkSubmit: {entryPoint: entryPoint}
        }
      };

      if (logPrefix) {
        jobRunParams.configurationOverrides = {
          monitoringConfiguration: {
            s3MonitoringConfiguration: {logUri: logPrefix}
          }
        };
      }

      try {
        const result = await emr.send(
          new StartJobRunCommand(jobRunParams)
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          "There was an error running the EMR Serverless job:" + error
        );
      }


      return jobRun;
    }
}