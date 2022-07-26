import * as vscode from "vscode";
import {
  EMRContainersClient,
  ListJobRunsCommand,
  ListVirtualClustersCommand,
  ListVirtualClustersResponse,
} from "@aws-sdk/client-emr-containers";
import { Globals } from "../extension";

export interface VirtualCluster {
  readonly id?: string;
  readonly name?: string;
}

export interface JobRun {
  readonly virtualClusterId?: string;
  readonly id?: string;
  readonly name?: string;
  readonly state?: string;
  readonly stateDetails?: string;
}

export class DefaultEMRContainersClient {
  public constructor(private readonly globals: Globals) {}

  private async createEMRContainers(): Promise<EMRContainersClient> {
    return new EMRContainersClient({
      region: this.globals.awsContext.getRegion(),
    });
  }

  public async listVirtualClusters(): Promise<VirtualCluster[]> {
    this.globals.outputChannel.appendLine(
      `EMR Containers: Fetching virtual clusters from ${this.globals.awsContext.getRegion()} region.`
    );
    const emr = await this.createEMRContainers();
    let virtualClusters: VirtualCluster[];

    try {
      // Note that this requires aws-sdk<=v3.30.0
      // due to https://github.com/aws/aws-sdk-js-v3/issues/3511
      const result = await emr.send(new ListVirtualClustersCommand({}));

      virtualClusters = result.virtualClusters ?? [];
    } catch (error) {
      vscode.window.showErrorMessage(
        "Error fetching EMR virtual clusters!" + error
      );
      return [];
    }

    return virtualClusters;
  }

  public async listJobRuns(virtualClusterId: string): Promise<JobRun[]> {
    this.globals.outputChannel.appendLine(
      `EMR Containers: Fetching job runs for virtual cluster ${virtualClusterId}.`
    );
    const emr = await this.createEMRContainers();
    let jobRuns: JobRun[] = [];

    try {
      const result = await emr.send(
        new ListJobRunsCommand({
          virtualClusterId: virtualClusterId,
        })
      );
      jobRuns = result.jobRuns ?? [];
    } catch (error) {
      vscode.window.showErrorMessage(
        "Error fetching EMR virtual cluster job runs!" + error
      );
    }

    return jobRuns;
  }
}
