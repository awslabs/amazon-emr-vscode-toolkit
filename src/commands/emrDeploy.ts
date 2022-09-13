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
export class EMRServerlessDeploy {
  context: vscode.ExtensionContext;
  previousAppID: string | undefined;
  previousS3TargetURI: string | undefined;

  constructor(
    context: vscode.ExtensionContext,
    private readonly emr: DefaultEMRServerlessClient,
    private readonly s3: DefaultS3Client
  ) {
    this.context = context;

    this.previousAppID = undefined;
    this.previousS3TargetURI = undefined;
  }

  public async run() {
    const title = "Deploy to EMR Serverless";

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

    async function collectInputs() {
      const state = {} as Partial<State>;
      await MultiStepInput.run((input) => insertS3TargetURI(input, state));
      return state as State;
    }

    async function insertS3TargetURI(
      input: MultiStepInput,
      state: Partial<State>
    ) {
      const pick = await input.showInputBox({
        title,
        step: 1,
        totalSteps: 4,
        value: "s3://bucket-name/prefix/",
        prompt: "s3://bucket-name/prefix/",
        validate: validateBucketURI,
        shouldResume: shouldResume,
      });

      state.s3TargetURI = pick.valueOf();
      return (input: MultiStepInput) => insertJobRoleARN(input, state);
    }

    async function insertJobRoleARN(
      input: MultiStepInput,
      state: Partial<State>
    ) {
      const pick = await input.showInputBox({
        title,
        step: 2,
        totalSteps: 4,
        value: "arn:aws:iam:xxx:blah",
        prompt:
          "Provide an IAM Role that has access to the resources for your job.",
        validate: validateJobRole,
        shouldResume: shouldResume,
        ignoreFocusOut: true,
      });

      state.jobRoleARN = pick.valueOf();
      return (input: MultiStepInput) => selectApplicationID(input, state);
    }

    async function selectApplicationID(
      input: MultiStepInput,
      state: Partial<State>
    ) {
      // TODO: Populate the list of application IDs automatically
      const pick = await input.showInputBox({
        title,
        step: 2,
        totalSteps: 4,
        value: "00f3ranvrvchl625",
        prompt: "Provide the EMR Serverless Application ID.",
        validate: validateApplicationID,
        shouldResume: shouldResume,
        ignoreFocusOut: true,
      });

      state.applicationID = pick.valueOf();
      return (input: MultiStepInput) => selectSourceFile(input, state);
    }

    async function selectSourceFile(
      input: MultiStepInput,
      state: Partial<State>
    ) {
      const uri = await pickFile("Type the filename with your source code.");
      if (uri) {
        state.srcScriptURI = uri.fsPath;
      }
    }

    async function validateBucketURI(uri: string): Promise<string | undefined> {
      if (!uri.startsWith("s3://")) {
        return "S3 location must start with s3://";
      }
      return undefined;
    }

    async function validateJobRole(uri: string): Promise<string | undefined> {
      if (!uri.startsWith("arn:aws:iam::")) {
        return "Job role must be a full ARN: arn:aws:iam::<ACCOUNT_ID>:role/<ROLE_NAME>";
      }
      return undefined;
    }

    async function validateApplicationID(
      appId: string
    ): Promise<string | undefined> {
      if (appId.length !== 16) {
        return "Provide just the Application ID, like 00f3ranvrvchl625";
      }
      return undefined;
    }

    function shouldResume() {
      // Could show a notification with the option to resume.
      return new Promise<boolean>((resolve, reject) => {
        // noop
      });
    }

    const state = await collectInputs();

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
    // Do I do a "deploy" and "run "
  }

  private async deploy(
    applicationID: string,
    executionRoleARN: string,
    sourceFile: string,
    s3TargetURI: string
  ) {
    // this.s3.uploadFile();
    // this.emr.startJobRun()
    console.log(
      "Your job has been started, refresh the EMR Serverless view to keep an eye on it."
    );
  }
}
