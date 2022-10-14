// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as vscode from "vscode";
import { Globals } from "../extension";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export class DefaultS3Client {
  public constructor(private readonly globals: Globals) {}

  private async createS3(): Promise<S3Client> {
    return new S3Client({
      region: this.globals.awsContext.getRegion(),
    });
  }

  public async uploadFile(bucket: string, key: string, body: Buffer): Promise<undefined> {
    this.globals.outputChannel.appendLine(`S3: Uploading file to ${bucket}/${key}`);
    const s3 = await this.createS3();

    const params = {
      Bucket: bucket,
      Key: key,
      Body: body,
    };

    try {
      const results = await s3.send(new PutObjectCommand(params));
      this.globals.outputChannel.appendLine(`S3: Upload complete.`);
    } catch (error) {
      vscode.window.showErrorMessage("Error uploading file to S3!" + error);
    }

    return undefined;
  }
}
