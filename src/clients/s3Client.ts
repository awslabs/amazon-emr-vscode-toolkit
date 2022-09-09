// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as vscode from "vscode";
import { Globals } from "../extension";
import { S3Client } from "@aws-sdk/client-s3";

export class DefaultS3Client {
  public constructor(private readonly globals: Globals) {}

  private async createS3(): Promise<S3Client> {
    return new S3Client({
      region: this.globals.awsContext.getRegion(),
    });
  }

  public async uploadFile(bucket: string, key: string): Promise<undefined> {
    this.globals.outputChannel.appendLine(`S3: Uploading file to ${bucket}.`);
    const s3 = await this.createS3();

    try {
      //   const result = await emr.send(
      //     new ListJobRunsCommand({
      //       applicationId: applicationId,
      //     })
      //   );
      //   jobRuns = result.jobRuns ?? [];
    } catch (error) {
      vscode.window.showErrorMessage("Error uploading file to S3!" + error);
    }

    return undefined;
  }
}
