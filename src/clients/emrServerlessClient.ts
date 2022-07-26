import * as vscode from "vscode";
import {
  EMRServerlessClient,
  JobRunSummary,
  ListApplicationsCommand,
  ListJobRunsCommand,
  StartJobRunCommand,
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
        return new EMRServerlessClient({
            region: this.globals.awsContext.getRegion(),
        });
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
    
        try {
          const result = await emr.send(
            new ListJobRunsCommand({
              applicationId: applicationId,
            })
          );
          jobRuns = result.jobRuns ?? [];
        } catch (error) {
          vscode.window.showErrorMessage(
            "Error fetching EMR application job runs!" + error
          );
        }
    
        return jobRuns;
      }
}