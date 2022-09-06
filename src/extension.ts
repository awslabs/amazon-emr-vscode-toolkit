// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { AwsContextCommands } from "./aws_context";
import { DefaultEMRClient } from "./clients/emrClient";
import { DefaultEMRContainersClient } from "./clients/emrContainersClient";
import { DefaultEMRServerlessClient } from "./clients/emrServerlessClient";
import { EMREC2Filter } from "./emr_explorer";
import { EMRLocalEnvironment } from "./emr_local";
import { copyIdCommand } from "./explorer/commands";
import { EMRContainersNode } from "./explorer/emrContainers";
import { EMRNode } from "./explorer/emrEC2";
import { EMRServerlessNode } from "./explorer/emrServerless";

// Workaround for https://github.com/aws/aws-sdk-js-v3/issues/3807
declare global {
  interface ReadableStream {}
}

// We create a global namespace for common variables
export interface Globals {
  context: vscode.ExtensionContext;
  outputChannel: vscode.OutputChannel;
  awsContext: AwsContextCommands;
  selectedRegion: string;
  selectedProfile: string;
}
const globals = {} as Globals;
export { globals };

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const logger = vscode.window.createOutputChannel("Amazon EMR");
  globals.outputChannel = logger;

  // Allow users to set profile and region
  const awsContext = new AwsContextCommands();
  globals.awsContext = awsContext;

  // Allow other modules to access vscode context
  globals.context = context;

  // context.subscriptions.push(
  //   vscode.commands.registerCommand("emr-tools-v2.selectProfile", async () => {
  //     await awsContext.onCommandSetProfile();
  //   })
  // );

  context.subscriptions.push(
    vscode.commands.registerCommand("emr-tools-v2.selectRegion", async () => {
      await awsContext.onCommandSetRegion();
    })
  );

  const treeFilter = new EMREC2Filter();
  context.subscriptions.push(
    vscode.commands.registerCommand("emr-tools-v2.filterClusters", async () => {
      await treeFilter.run();
    })
  );

  // EMR on EC2 support
  const emrExplorer = new EMRNode(new DefaultEMRClient(globals), treeFilter);
  vscode.window.registerTreeDataProvider("emrExplorer", emrExplorer);
  vscode.commands.registerCommand("emr-tools-v2.refreshEntry", () =>
    emrExplorer.refresh()
  );

  // Tree data providers
  // const emrTools = new EMREC2Provider(
  //   vscode.workspace.rootPath + "",
  //   treeFilter,
  //   logger
  // );
  // vscode.window.registerTreeDataProvider("emrExplorer", emrTools);
  // vscode.commands.registerCommand("emr-tools-v2.refreshEntry", () =>
  //   emrTools.refresh()
  // );
  // vscode.commands.registerCommand(
  //   "emr-tools-v2.connectToCluster",
  //   async (cluster: EMRCluster) => {
  //     await connectToClusterCommand(cluster);
  //   }
  // );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "emr-tools-v2.copyId",
      async (node: vscode.TreeItem) => await copyIdCommand(node)
    )
  );

  // EMR on EKS support
  // const emrContainerTools = new EMRContainersProvider(globals);
  const emrContainerExplorer = new EMRContainersNode(
    new DefaultEMRContainersClient(globals)
  );
  vscode.window.registerTreeDataProvider(
    "emrContainersExplorer",
    emrContainerExplorer
  );
  vscode.commands.registerCommand("emr-tools-v2.refreshContainerEntry", () =>
    emrContainerExplorer.refresh()
  );

  // EMR Serverless support
  // const emrServerlessTools = new EMRServerlessProvider();
  const emrServerlessTools = new EMRServerlessNode(
    new DefaultEMRServerlessClient(globals)
  );
  vscode.window.registerTreeDataProvider(
    "emrServerlessExplorer",
    emrServerlessTools
  );
  vscode.commands.registerCommand("emr-tools-v2.refreshServerlessEntry", () =>
    emrServerlessTools.refresh()
  );

  // When the region changes, refresh all our explorers
  globals.awsContext.onDidRegionChange((region) => {
    emrExplorer.refresh();
    emrContainerExplorer.refresh();
    emrServerlessTools.refresh();
  });

  // Deployment support for all our available options
  // Removing until future release :)
  // context.subscriptions.push(
  //   vscode.commands.registerCommand(
  //     "emr-tools-v2.deploy", async () => {
  //       await new EMRDeployer(emrTools, emrContainerTools, emrServerlessTools).run();
  //     }
  //   )
  // );

  // Local environment support
  const emrLocalCreator = new EMRLocalEnvironment(context);
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "emr-tools-v2.localEnvironmentMagic",
      async () => {
        await emrLocalCreator.run();
      }
    )
  );

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "emr-tools-v2" is now active!');
}
// this method is called when your extension is deactivated
export function deactivate() {}
