// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { DescribeRegionsCommand, EC2Client } from "@aws-sdk/client-ec2";
import { Event, EventEmitter, window } from "vscode";

export class AwsContextCommands {
  private _profileName: string;
  private _selectedRegion: string;
  private _onDidRegionChange = new EventEmitter<string>();

  public constructor() {
    this._profileName = "default";
    this._selectedRegion = "us-east-1";
  }

  public getRegion(): string {
    return this._selectedRegion;
  }
  public get onDidRegionChange(): Event<string> {
    return this._onDidRegionChange.event;
}

  public getProfileName(): string {
    return this._profileName;
  }

  public async onCommandSetProfile() {
    const profileName = await this.getProfileNameFromUser();
    if (!profileName) {
      return;
    }

    this._profileName = profileName;
    // AWS.config.credentials = new SharedIniFileCredentials({ profile: profileName });
    console.log("Setting profile to", profileName);
    process.env.AWS_PROFILE = profileName;
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
    this._onDidRegionChange.fire(region);
  }

  public async getRegionFromUser(): Promise<string|undefined> {
    const client = new EC2Client({});
    const command = new DescribeRegionsCommand({});
    const response = await client.send(command);
    if (!response) { return; }

    const regionNames: string[] =( response.Regions ? response.Regions.map(r => r.RegionName!) : []);
    const result = await window.showQuickPick(regionNames, {
      placeHolder: "Select AWS REgion",
    });
    return result;
  }
}
