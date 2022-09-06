// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// We can package and deploy EMR jobs
// EMR on EC2
// - Optionally package into (virtualenv|container)
// - Upload script to S3 (ask for deployment bucket once)
// - Call EMR Add Step
// - Show window with driver logs?
// EMR on EKS
// - Optionally package into container image / push to ECR
// - Upload script to S3 (ask for deployment bucket once)
// - Ask for jobRole
// - Call startJobRun
// EMR Serverless
// - Optionally package into virtualenv
// - Upload script to S3 (ask for deployment bucket once)
// - Ask for jobRole
// - Ask for S3 log bucket/prefix
// - Call startJobRun

import { QuickPickOptions, window } from "vscode";
import { EMRContainersProvider } from "./emr_containers";
import { EMREC2Provider } from "./emr_explorer";
import { EMRServerlessProvider } from "./emr_serverless";

export class EMRDeployer {
  emrOnEC2: EMREC2Provider;
  emrOnEKS: EMRContainersProvider;
  emrServerless: EMRServerlessProvider;

  constructor(emrEC2: EMREC2Provider, emrEks: EMRContainersProvider, emrServerless: EMRServerlessProvider) {
    this.emrOnEC2 = emrEC2;
    this.emrOnEKS = emrEks;
    this.emrServerless = emrServerless;
  }

  public async run() {
    const deployType = await this.pickDeploymentType();
    console.log(deployType);
    if (deployType === "EMR on EC2") {
      const clusterID = await this.pickEMRCluster();
      console.log(clusterID);
      const bucket = await this.pickS3Bucket();
      console.log(bucket);
    } else if (deployType === "EMR on EKS") {
      const clusterID = await this.pickVirtualEMRCluster();
      console.log(clusterID);
      const bucket = await this.pickS3Bucket();
      console.log(bucket);
      const role = await this.pickEMRContainersRole();
    } else if (deployType === "EMR Serverless") {
      // TODO (2022-06-15): We need a way for the user to interrupt this workflow
      const applicationID = await this.pickApplicationID();
      const bucket = await this.pickS3Bucket();
      const role = await this.pickEMRServerlessRole();

      const jobId = this.emrServerless.triggerServerlessJob(
        applicationID!,
        `s3://${bucket}/code/pyspark/extreme_weather.py`,
        `s3://${bucket}/logs/`,
        role!,
      );
      console.log(jobId);
    }
  }

  async pickDeploymentType() {
    const pick = await window.showQuickPick([
      "EMR on EC2",
      "EMR on EKS",
      "EMR Serverless",
    ]);
    return pick;
  }

  // Should probably move these into the providers themselves.
  async pickEMRCluster() {
    const pick = await window.showQuickPick(["j-123", "j-456"]);
    return pick;
  }

  async pickVirtualEMRCluster() {
    const pick = await window.showQuickPick(["1234567890"]);
    return pick;
  }

  async pickApplicationID() {
    return await window.showInputBox({
      title: "Select an EMR Serverless application",
      placeHolder: "00f1d2h27340f60l",
      ignoreFocusOut: true,
    });
  }

  async pickS3Bucket() {
    return await window.showQuickPick(["dacort-demo-code"]);
  }

  async pickEMRContainersRole() {
    return await window.showInputBox({
      title: "Select EMR on EKS execution role",
      placeHolder: "iam:xxx:role/emr-containers",
    //   prompt: "This role must have access to ",
      ignoreFocusOut: true, // The user might switch to another window to get the role arn
    });
  }

  async pickEMRServerlessRole() {
    return await window.showInputBox({
      title: "Select EMR Serverless execution role",
      placeHolder: "iam:xxx:role/emr-serverless",
    //   prompt: "This role must have access to ",
      ignoreFocusOut: true, // The user might switch to another window to get the role arn
    });
  }
}
