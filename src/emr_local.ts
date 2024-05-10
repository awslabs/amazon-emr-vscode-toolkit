// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// We want folks to be able to developer EMR jobs locally.
// We give them an option to create an EMR environment
// They select:
// - Type of job (pyspark, scala, SQL)
// - EMR Release (only those supported by EMR on EKS)
// - Region (used to build the local Image URI)

import { QuickPickItem, window } from "vscode";
import { MultiStepInput } from "./helpers";
import * as fs from "fs";
import * as vscode from "vscode";
import path = require("path");

function welcomeText(region: string, accountId: string, authType: string) {
  const envUpdate = (authType === "ENV_FILE") ? "- Update .devcontainer/aws.env with your AWS credentials.\n": "";
  return `# EMR Local Container

## Getting Started

Thanks for installing your local EMR environment. To get started, there are a few steps.

${envUpdate}- Login to ECR with the following command:

        aws ecr get-login-password --region ${region} \\
        | docker login \\
            --username AWS \\
            --password-stdin \\
            ${accountId}.dkr.ecr.${region}.amazonaws.com

- Use the \`Remote-Containers: Reopen in Container\` command to build your new environment.

## Usage tips

- You can start a new shell with the \`pyspark\` command in a terminal.
    - If you've configured your AWS credentials in \`.env\`, you should have access to everything you need.
- A sample PySpark script has been created for you in the \`emr_tools_demo.py\` file.

`;
}

export class EMRLocalEnvironment {
  context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public async run() {
    const title = "Create Local Environment";

    interface State {
      title: string;
      step: number;
      totalSteps: number;
      resourceGroup: QuickPickItem | string;

      jobType: string;
      emrRelease: string;
      region: string;
      accountId: string;
      authType: string;
    }

    interface RegionMapping {
      label: string;
      accountId: string;
    }

    interface AuthOption {
      label: string;
      code: string;
    }

    interface EMRContainerEntry {
      label: string;
      releaseVersion: string;
    }

    const emrReleases = [
      { label: "EMR 6.15.0", releaseVersion: "emr-6.15.0" },
      { label: "EMR 6.14.0", releaseVersion: "emr-6.14.0" },
      { label: "EMR 6.13.0", releaseVersion: "emr-6.13.0" },
      { label: "EMR 6.12.0", releaseVersion: "emr-6.12.0" },
      { label: "EMR 6.11.0", releaseVersion: "emr-6.11.0" },
      { label: "EMR 6.10.0", releaseVersion: "emr-6.10.0" },
      { label: "EMR 6.9.0", releaseVersion: "emr-6.9.0" },
      { label: "EMR 6.8.0", releaseVersion: "emr-6.8.0" },
      { label: "EMR 6.7.0", releaseVersion: "emr-6.7.0" },
      { label: "EMR 6.6.0", releaseVersion: "emr-6.6.0" },
      { label: "EMR 6.5.0", releaseVersion: "emr-6.5.0" },
      { label: "EMR 6.4.0", releaseVersion: "emr-6.4.0" },
      { label: "EMR 6.2.0", releaseVersion: "emr-6.2.0" },
      { label: "EMR 6.2.0", releaseVersion: "emr-6.2.0" },
      { label: "EMR 5.35.0", releaseVersion: "emr-5.35.0" },
      { label: "EMR 5.34.0", releaseVersion: "emr-5.34.0" },
      { label: "EMR 5.33.0", releaseVersion: "emr-5.33.0" },
      { label: "EMR 5.32.0", releaseVersion: "emr-5.32.0" },
    ];

    async function collectInputs() {
      const state = {} as Partial<State>;
      await MultiStepInput.run((input) => pickJobType(input, state));
      return state as State;
    }

    async function pickJobType(input: MultiStepInput, state: Partial<State>) {
      const pick = await input.showQuickPick({
        title,
        step: 1,
        totalSteps: 4,
        placeholder: "Pick a sample job type",
        items: [{ label: "PySpark" }],
        activeItem:
          typeof state.resourceGroup !== "string"
            ? state.resourceGroup
            : undefined,
        shouldResume: shouldResume,
      });

      state.jobType = pick.label;
      return (input: MultiStepInput) => pickEMRRelease(input, state);
    }

    async function pickEMRRelease(
      input: MultiStepInput,
      state: Partial<State>
    ) {
      const pick = await input.showQuickPick({
        title,
        step: 2,
        totalSteps: 4,
        placeholder: "Pick an EMR release version",
        items: emrReleases,
        shouldResume: shouldResume,
      });

      state.emrRelease = (pick as EMRContainerEntry).releaseVersion;
      return (input: MultiStepInput) => pickImageRegion(input, state);
    }

    async function pickImageRegion(
      input: MultiStepInput,
      state: Partial<State>
    ) {
      const regionMapping = [
        { label: "ap-northeast-1", accountId: "059004520145" },
        { label: "ap-northeast-2", accountId: "996579266876" },
        { label: "ap-south-1", accountId: "235914868574" },
        { label: "ap-southeast-1", accountId: "671219180197" },
        { label: "ap-southeast-2", accountId: "038297999601" },
        { label: "ca-central-1", accountId: "351826393999" },
        { label: "eu-central-1", accountId: "107292555468" },
        { label: "eu-north-1", accountId: "830386416364" },
        { label: "eu-west-1", accountId: "483788554619" },
        { label: "eu-west-2", accountId: "118780647275" },
        { label: "eu-west-3", accountId: "307523725174" },
        { label: "sa-east-1", accountId: "052806832358" },
        { label: "us-east-1", accountId: "755674844232" },
        { label: "us-east-2", accountId: "711395599931" },
        { label: "us-west-1", accountId: "608033475327" },
        { label: "us-west-2", accountId: "895885662937" },
      ];
      const pick = await input.showQuickPick({
        title,
        step: 3,
        totalSteps: 4,
        placeholder: "Pick a region to pull the container image from",
        items: regionMapping,
        shouldResume: shouldResume,
      });

      state.region = pick.label;
      state.accountId = (pick as RegionMapping).accountId;

      return (input: MultiStepInput) => pickAuthenticationType(input, state);
    }

    async function pickAuthenticationType(
      input: MultiStepInput,
      state: Partial<State>
    ) {
      const areEnvVarsSet =
        process.env.AWS_ACCESS_KEY_ID !== undefined &&
        process.env.AWS_SECRET_ACCESS_KEY !== undefined;
      const authOptions = [
        {
          label: "Use existing ~/.aws config",
          code: "AWS_CONFIG",
          description: "Mount your ~/.aws directory to the container.",
        },
        {
          label: "Environment Variables",
          code: "ENV_VAR",
          description: `If you already have AWS_* environment variables defined.`,
        },
        {
          label: ".env file",
          code: "ENV_FILE",
          description: "A sample file will be created for you.",
        },
        {
          label: "None",
          code: "NONE",
          description:
            "Requires you to define credentials yourself in the container",
        },
      ];

      const pick = await input.showQuickPick({
        title,
        step: 4,
        totalSteps: 4,
        placeholder: "Select an authentication mechanism for your container",
        items: authOptions,
        shouldResume: shouldResume,
      });

      state.authType = (pick as AuthOption).code;
    }

    function shouldResume() {
      // Could show a notification with the option to resume.
      return new Promise<boolean>((resolve, reject) => {
        // noop
      });
    }

    const state = await collectInputs();

    // We made it here, now we can create the local environment for the user
    await this.createDevContainer(
      state.emrRelease,
      state.region,
      state.accountId,
      state.authType
    );
  }

  private async createDevContainer(
    release: string,
    region: string,
    account: string,
    authType: string
  ) {
    const stripJSONComments = (data: string) => {
      var re = new RegExp("//(.*)", "g");
      return data.replace(re, "");
    };

    // selectWorkspace will be useful
    // https://github.com/cantonios/vscode-project-templates/blob/b8e7f65c82fd4fe210c1c188f96eeabdd2b3b317/src/projectTemplatesPlugin.ts#L45
    if (vscode.workspace.workspaceFolders === undefined) {
      vscode.window.showErrorMessage(
        "Amazon EMR: Working folder not found, open a folder and try again."
      );
      return;
    }

    const wsPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    if (!fs.existsSync(wsPath + "/.devcontainer")) {
      fs.mkdirSync(wsPath + "/.devcontainer");
    }
    const targetDcPath = vscode.Uri.file(wsPath + "/.devcontainer");

    const demoFileName = "emr_tools_demo.py";
    const samplePyspark = this.context.asAbsolutePath(
      path.join("templates", demoFileName)
    );

    const dcPath = this.context.asAbsolutePath(
      path.join("templates", "devcontainer.json")
    );
    const envPath = this.context.asAbsolutePath(
      path.join("templates", "aws.env")
    );
    // TODO: Don't implement this yet - we wouldn't want to overwrite a .gitignore
    const gitIgnorePath = this.context.asAbsolutePath(
      path.join("templates", "_.gitignore")
    );
    const devContainerConfig = JSON.parse(
      stripJSONComments(fs.readFileSync(dcPath).toString())
    );
    // Update the devcontainer with the requisite release and Image URI details
    devContainerConfig["build"]["args"]["RELEASE"] = release;
    devContainerConfig["build"]["args"]["REGION"] = region;
    devContainerConfig["build"]["args"]["EMR_ACCOUNT_ID"] = account;

    // This is useful to prevent EC2 Metadata errors as well as allows pyspark in Jupyter to work
    devContainerConfig["containerEnv"]["AWS_REGION"] = region;

    // Depending on auth type, set the corresponding section in the devcontainer
    if (authType === "AWS_CONFIG") {
      devContainerConfig["mounts"] = [
        "source=${localEnv:HOME}${localEnv:USERPROFILE}/.aws,target=/home/hadoop/.aws,type=bind"
      ];
    } else if (authType === "ENV_VAR") {
      devContainerConfig['containerEnv'] = {
        ...devContainerConfig['containerEnv'],
        ...{
          /* eslint-disable @typescript-eslint/naming-convention */
          "AWS_ACCESS_KEY_ID": "${localEnv:AWS_ACCESS_KEY_ID}",
          "AWS_SECRET_ACCESS_KEY": "${localEnv:AWS_SECRET_ACCESS_KEY}",
          "AWS_SESSION_TOKEN": "${localEnv:AWS_SESSION_TOKEN}",
          /* eslint-enable @typescript-eslint/naming-convention */
        }
      };
    } else if (authType === "ENV_FILE") {
      devContainerConfig['runArgs'] = [
        "--env-file", "${localWorkspaceFolder}/.devcontainer/aws.env"
      ];
      fs.copyFileSync(envPath, targetDcPath.fsPath + "/aws.env");
    }

    // TODO (2022-07-22): Optionally, add mounts of ~/.aws exists
    // "source=${env:HOME}${env:USERPROFILE}/.aws,target=/home/hadoop/.aws,type=bind"
    // Also make adding environment credentials optional...they could get exposed in logs

    const dockerfilePath = this.context.asAbsolutePath(
      path.join("templates", "pyspark.dockerfile")
    );
    const dockerfile = fs.readFileSync(dockerfilePath).toString();

    fs.writeFileSync(
      targetDcPath.fsPath + "/devcontainer.json",
      JSON.stringify(devContainerConfig, null, "  ")
    );
    fs.writeFileSync(targetDcPath.fsPath + "/Dockerfile", dockerfile);
    fs.copyFileSync(samplePyspark, wsPath + `/${demoFileName}`);

    const howtoPath = vscode.Uri.file(wsPath).fsPath + "/emr-local.md";
    fs.writeFileSync(howtoPath, welcomeText(region, account, authType));
    vscode.workspace
      .openTextDocument(howtoPath)
      .then((a: vscode.TextDocument) => {
        vscode.window.showTextDocument(a, 1, false);
      });

    // var setting: vscode.Uri = vscode.Uri.parse("untitled:" + "emr-local.md");
    // vscode.workspace
    //   .openTextDocument(setting)
    //   .then((a: vscode.TextDocument) => {
    //     vscode.window.showTextDocument(a, 1, false).then((e) => {
    //       e.edit((edit) => {
    //         edit.insert(
    //           new vscode.Position(0, 0),
    //           welcomeText(region, account)
    //         );
    //       });
    //     });
    //   });
  }
}
