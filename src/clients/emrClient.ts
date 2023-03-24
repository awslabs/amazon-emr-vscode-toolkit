// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as vscode from "vscode";
import { Globals } from "../extension";
import {
  DescribeClusterCommand,
  EMR,
  ListClustersCommand,
  ListStepsCommand,
  AddJobFlowStepsCommand,
  AddJobFlowStepsCommandInput,
} from "@aws-sdk/client-emr";
import { EMREC2Filter } from "../emr_explorer";

export interface Cluster {
  readonly id?: string;
  readonly name?: string;
  readonly apps?: ClusterApp[];
  readonly instanceCollectionType?: string;
}

export interface ClusterApp {
  readonly name: string;
  readonly version: string;
}

export interface ClusterStep {
  readonly id?: string;
  readonly name?: string;
  readonly state?: string;
  readonly stateDetails?: string;
}

export class DefaultEMRClient {
  public constructor(private readonly globals: Globals) {}

  private async createEMR(): Promise<EMR> {
    return new EMR(this.globals.awsContext.getClientConfig());
  }

  public async listClusters(stateFilter?: EMREC2Filter): Promise<Cluster[]> {
    const emr = await this.createEMR();
    const showStates = stateFilter
      ? stateFilter.getStates()
      : EMREC2Filter.defaultStates;
    const params = {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      ClusterStates: showStates,
    };
    let clusters: Cluster[];

    this.globals.outputChannel.appendLine(
      `EMR: Fetching clusters from ${this.globals.awsContext.getRegion()} region.`
    );

    try {
      const result = await emr.send(new ListClustersCommand(params));
      //   clusters = result.Clusters
      //     ? result.Clusters.map(c => {
      //         return <Cluster>{id: c.Id, name: c.Name};
      //     })
      //     : [];
      clusters = result.Clusters
        ? result.Clusters.map(({ Id: id, Name: name }) => ({ id, name }))
        : [];
    } catch (error) {
      vscode.window.showErrorMessage("Error fetching EMR clusters!" + error);
      return [];
    }
    return clusters;
  }

  public async describeCluster(
    clusterId: string
  ): Promise<Cluster | undefined> {
    const emr = await this.createEMR();
    let cluster: Cluster;

    try {
      const result = await emr.send(
        // eslint-disable-next-line @typescript-eslint/naming-convention
        new DescribeClusterCommand({ ClusterId: clusterId })
      );
      cluster = <Cluster>{
        id: result.Cluster?.Id,
        name: result.Cluster?.Name,
        apps: result.Cluster?.Applications?.map(
          ({ Name: name, Version: version }) => ({ name, version })
        ),
        instanceCollectionType: result.Cluster?.InstanceCollectionType,
      };
    } catch (error) {
      vscode.window.showErrorMessage(
        "Error fetching EMR cluster details!" + error
      );
      return undefined;
    }

    return cluster;
  }

  public async listSteps(clusterId: string): Promise<ClusterStep[]> {
    const emr = await this.createEMR();
    let steps: ClusterStep[];

    this.globals.outputChannel.appendLine(
      `EMR: Fetching cluster steps from ${clusterId} cluster.`
    );

    try {
      const result = await emr.send(
        // eslint-disable-next-line @typescript-eslint/naming-convention
        new ListStepsCommand({ ClusterId: clusterId })
      );
      steps = result.Steps
        ? result.Steps.map((s) => {
            return <ClusterStep>{
              id: s.Id,
              name: s.Name,
              state: s.Status?.State,
              stateDetails: s.Status?.StateChangeReason?.Message,
            };
          })
        : [];
    } catch (error) {
      vscode.window.showErrorMessage(
        "Error fetching EMR cluster steps!" + error
      );
      return [];
    }
    return steps;
  }

  public async startJobRun(
    clusterId: string,
    entryPoint: string
  ): Promise<ClusterStep> {
    this.globals.outputChannel.appendLine(
      `EMR on EC2: Starting job run (${clusterId}).`
    );

    const emr = await this.createEMR();
    let step: ClusterStep = {};
    let scriptName = entryPoint.split("/").reverse()[0];

    let jobRunParams: AddJobFlowStepsCommandInput = {
      JobFlowId: clusterId,
      Steps: [
        {
          Name: `vs-code: ${scriptName}`,
          HadoopJarStep: {
            Jar: "command-runner.jar",
            Args: ["spark-submit", "--deploy-mode", "cluster", entryPoint],
          },
        },
      ],
    };

    try {
      const result = await emr.send(new AddJobFlowStepsCommand(jobRunParams));
      let step: ClusterStep = { id: result.StepIds![0] };
      return step;
    } catch (error) {
      vscode.window.showErrorMessage(
        "There was an error running the EMR on EC2 job:" + error
      );
    }

    return step;
  }
}
