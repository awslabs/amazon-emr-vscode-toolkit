// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { DescribeRegionsCommand, EC2Client } from "@aws-sdk/client-ec2";
import { fromIni } from "@aws-sdk/credential-providers";
import { loadSharedConfigFiles } from "@aws-sdk/shared-ini-file-loader";
import { AwsCredentialIdentityProvider } from "@aws-sdk/types";
import { Event, EventEmitter, window } from "vscode";

interface ClientConfig {
  region: string;
  credentials?: AwsCredentialIdentityProvider;
}

const DEFAULT_PROFILE_NAME = "default";
const DEFAULT_REGION = "us-east-1";

export class AwsContextCommands {
  private _profileName?: string;
  private _selectedRegion?: string;
  private _onDidRegionChange = new EventEmitter<string>();
  private _onDidConfigChange = new EventEmitter<void>();

  public constructor() {}

  public getClientConfig(): ClientConfig {
    let clientConfig: ClientConfig = { region: this.getRegion() };

    // If the user has an AWS_PROFILE environment set, or they've specified a profile name, use that.
    if (this.getProfileName()) {
      const _profile = this.getProfileName()!;
      clientConfig.credentials = fromIni({ profile: _profile });
    }

    return clientConfig;
  }
  public get onDidConfigChange(): Event<void> {
    return this._onDidConfigChange.event;
  }

  public getRegion(): string {
    // Determine the region in this order
    // 1. Region set explicity by user or derived from their profile
    // 2. Region defined in environment variables
    // 3. Default region
    return (
      this._selectedRegion ||
      process.env.AWS_REGION ||
      process.env.AWS_DEFAULT_REGION ||
      DEFAULT_REGION
    );
  }
  public get onDidRegionChange(): Event<string> {
    return this._onDidRegionChange.event;
  }

  public getProfileName(): string | undefined {
    // Prefer locally-set profile over AWS_PROFILE environment variable
    return this._profileName || process.env.AWS_PROFILE;
  }

  public async onCommandSetProfile() {
    const profileName = await this.getProfileNameFromUser();
    if (!profileName) {
      return;
    }

    // See if a region is defined in their profile
    const region = (await loadSharedConfigFiles()).configFile?.[profileName]
      ?.region;
    if (region) {
      console.log("Region found in profile: " + region);
      this._selectedRegion = region;
    }

    this._profileName = profileName;
    console.log("Setting profile to", profileName);
    this._onDidConfigChange.fire();
  }

  public async getProfileNameFromUser(): Promise<string | undefined> {
    const sharedIniFileLoader = require("@aws-sdk/shared-ini-file-loader");
    const profiles = await sharedIniFileLoader.loadSharedConfigFiles();
    const profileNames = Object.keys(profiles.configFile);

    const result = await window.showQuickPick(profileNames, {
      placeHolder: "Select AWS Profile",
    });
    return result;
  }

  public async onCommandSetRegion() {
    const region = await this.getRegionFromUser();
    if (!region) {
      return;
    }

    this._selectedRegion = region;
    this._onDidConfigChange.fire();
  }

  public async getRegionFromUser(): Promise<string | undefined> {
    const client = new EC2Client({});
    const command = new DescribeRegionsCommand({});
    const response = await client.send(command);
    if (!response) {
      const result = await window.showInputBox({
        title: "Set your desired AWS Region",
        placeHolder: "us-east-1",
      });
      return result;
    }

    const regionNames: string[] = response.Regions
      ? response.Regions.map((r) => r.RegionName!)
      : [];
    const result = await window.showQuickPick(regionNames, {
      placeHolder: "Select AWS Region",
    });
    return result;
  }
}
