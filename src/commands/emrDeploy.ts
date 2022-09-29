// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// We want folks to be able to developer EMR jobs locally.
// We give them an option to create an EMR environment
// They select:
// - Type of job (pyspark, scala, SQL)
// - EMR Release (only those supported by EMR on EKS)
// - Region (used to build the local Image URI)

import { QuickPickItem, window } from "vscode";
import { MultiStepInput } from "./../helpers";
import * as fs from "fs";
import * as vscode from "vscode";
import {
  DefaultEMRServerlessClient,
  JobRun,
} from "../clients/emrServerlessClient";
import { DefaultS3Client } from "../clients/s3Client";
import { pickFile } from "../utils/quickPickItem";
import { basename } from "path";

// Step 1, add EMR Deploy option for EMR Serverless
// Command: "EMR Serverless: Deploy and start job"
// Process:
// - Ask for (and save):
//     - S3 bucket/prefix for code location
//     - IAM Job Role ARN
//     - S3 log bucket (optional)
// - Copy main entry script to S3
// - Copy any additional .py files to s3
// - call StartJobRunCommand

// - open explorer view ;)


interface State {
  title: string;
  step: number;
  totalSteps: number;
  resourceGroup: QuickPickItem | string;

  s3TargetURI: string;
  applicationID: string;
  jobRoleARN: string;
  s3LogTargetURI: string;
  srcScriptURI: string;
}
export class EMRServerlessDeploy {
  context: vscode.ExtensionContext;
  title: string;
  previousAppID: string | undefined;
  previousS3TargetURI: string | undefined;
  previousJobRoleARN: string | undefined;

  

  constructor(
    context: vscode.ExtensionContext,
    private readonly emr: DefaultEMRServerlessClient,
    private readonly s3: DefaultS3Client
  ) {
    this.context = context;
    this.title = "Deploy to EMR Serverless";

    this.previousAppID = undefined;
    this.previousS3TargetURI = undefined;
    this.previousJobRoleARN = undefined;
  }



  async collectInputs() {
    const state = {} as Partial<State>;
    await MultiStepInput.run((input) => this.insertS3TargetURI(input, state));
    return state as State;
  }



  async insertS3TargetURI(
    input: MultiStepInput,
    state: Partial<State>
  ) {
    let defaultTarget = "s3://bucket-name/prefix/";
    if (this.previousS3TargetURI) {
      defaultTarget = this.previousS3TargetURI;
    }
    const pick = await input.showInputBox({
      title: this.title,
      step: 1,
      totalSteps: 4,
      value: defaultTarget,
      prompt: "Provide an S3 URI where you want to upload your code.",
      validate: this.validateBucketURI,
      shouldResume: this.shouldResume,
    });

    state.s3TargetURI = pick.valueOf();
    this.previousS3TargetURI = state.s3TargetURI;
    return (input: MultiStepInput) => this.insertJobRoleARN(input, state);
  }

  async insertJobRoleARN(
    input: MultiStepInput,
    state: Partial<State>
  ) {
    let defaultJobRole = this.previousJobRoleARN  ? this.previousJobRoleARN : "arn:aws:iam::xxx:role/job-role";
    const pick = await input.showInputBox({
      title: this.title,
      step: 2,
      totalSteps: 4,
      value: defaultJobRole,
      prompt:
        "Provide an IAM Role that has access to the resources for your job.",
      validate: this.validateJobRole,
      shouldResume: this.shouldResume,
      ignoreFocusOut: true,
    });

    state.jobRoleARN = pick.valueOf();
    this.previousJobRoleARN = state.jobRoleARN;
    return (input: MultiStepInput) => this.selectApplicationID(input, state);
  }

  async selectApplicationID(
    input: MultiStepInput,
    state: Partial<State>
  ) {
    let defaultAppId = this.previousAppID  ? this.previousAppID : "00f3aabbccdd123";
    // TODO: Populate the list of application IDs automatically
    const pick = await input.showInputBox({
      title: this.title,
      step: 2,
      totalSteps: 4,
      value: defaultAppId,
      prompt: "Provide the EMR Serverless Application ID.",
      validate: this.validateApplicationID,
      shouldResume: this.shouldResume,
      ignoreFocusOut: true,
    });

    state.applicationID = pick.valueOf();
    this.previousAppID = state.applicationID;
    return (input: MultiStepInput) => this.selectSourceFile(input, state);
  }

  async selectSourceFile(
    input: MultiStepInput,
    state: Partial<State>
  ) {
    const uri = await pickFile("Type the filename with your source code.");
    if (uri) {
      state.srcScriptURI = uri.fsPath;
    }
  }

  async validateBucketURI(uri: string): Promise<string | undefined> {
    if (!uri.startsWith("s3://")) {
      return "S3 location must start with s3://";
    }
    return undefined;
  }

  async validateJobRole(uri: string): Promise<string | undefined> {
    if (!uri.startsWith("arn:aws:iam::")) {
      return "Job role must be a full ARN: arn:aws:iam::<ACCOUNT_ID>:role/<ROLE_NAME>";
    }
    return undefined;
  }

  async validateApplicationID(
    appId: string
  ): Promise<string | undefined> {
    if (appId.length !== 16) {
      return "Provide just the Application ID, like 00f3ranvrvchl625";
    }
    return undefined;
  }

  shouldResume() {
    // Could show a notification with the option to resume.
    return new Promise<boolean>((resolve, reject) => {
      // noop
    });
  }

  public async run() {
    const state = await this.collectInputs();

    const detail = `Entry point: ${state.s3TargetURI}${basename(
      state.srcScriptURI
    )}\nApplication ID: ${state.applicationID}\nJob Role: ${state.jobRoleARN}`;

    const confirmDeployment = await vscode.window
      .showInformationMessage(
        "Confirm EMR Serverless deployment",
        { modal: true, detail },
        "Yes"
      )
      .then((answer) => {
        return answer === "Yes";
      });

    if (confirmDeployment) {
      await this.deploy(
        state.applicationID,
        state.jobRoleARN,
        state.srcScriptURI,
        state.s3TargetURI
      );
    }
    // Do I do a "deploy" and "run"
  }

  private async deploy(
    applicationID: string,
    executionRoleARN: string,
    sourceFile: string,
    s3TargetURI: string
  ) {
    const data = fs.readFileSync(sourceFile);
    const bucketName = s3TargetURI.split("/")[2];
    const key = s3TargetURI.split("/").slice(3).join("/");
    const fullS3Key = `${key.replace(/\/$/, '')}/${basename(sourceFile)}`;
    const fullS3Path = `s3://${bucketName}/${fullS3Key}`;

    await this.s3.uploadFile(bucketName, fullS3Key, data);
    
    this.emr.startJobRun(applicationID, executionRoleARN,fullS3Path);

    vscode.window.showInformationMessage("Your job has been submitted, refresh the EMR Serverless view to keep an eye on it.");
  }
}
