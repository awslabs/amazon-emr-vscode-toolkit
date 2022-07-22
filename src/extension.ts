// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { AwsContextCommands } from "./aws_context";
import { DefaultEMRContainersClient } from "./clients/emrContainersClient";
import { connectToClusterCommand } from "./emr_connect";
import { EMRCluster, EMREC2Filter, EMREC2Provider } from "./emr_explorer";
import { EMRLocalEnvironment } from "./emr_local";
import { EMRServerlessProvider } from "./emr_serverless";
import { EMRContainersNode } from "./explorer/emrContainers";

// Workaround for https://github.com/aws/aws-sdk-js-v3/issues/3807
declare global {
  interface ReadableStream {}
}

// We create a global namespace for common variables
export interface Globals {
  readonly context: vscode.ExtensionContext;
  outputChannel: vscode.OutputChannel;
  awsContext: AwsContextCommands;
  selectedRegion: string;
  selectedProfile: string;
}
const globals = {} as Globals;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const logger = vscode.window.createOutputChannel("Amazon EMR");
  globals.outputChannel = logger;

  // Allow users to set profile and region
  const awsContext = new AwsContextCommands();
  globals.awsContext = awsContext;

  context.subscriptions.push(
    vscode.commands.registerCommand("emr-tools-v2.selectProfile", async () => {
      await awsContext.onCommandSetProfile();
    })
  );

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

  // Tree data providers
  const emrTools = new EMREC2Provider(
    vscode.workspace.rootPath + "",
    treeFilter,
    logger
  );
  vscode.window.registerTreeDataProvider("emrExplorer", emrTools);
  vscode.commands.registerCommand("emr-tools-v2.refreshEntry", () =>
    emrTools.refresh()
  );
  vscode.commands.registerCommand(
    "emr-tools-v2.connectToCluster",
    async (cluster: EMRCluster) => {
      await connectToClusterCommand(cluster);
    }
  );

  // EMR on EKS support
  const emrContainerTools = new EMRContainersProvider(globals);
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
  const emrServerlessTools = new EMRServerlessProvider();
  vscode.window.registerTreeDataProvider(
    "emrServerlessExplorer",
    emrServerlessTools
  );
  vscode.commands.registerCommand("emr-tools-v2.refreshServerlessEntry", () =>
    emrServerlessTools.refresh()
  );

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

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "emr-tools-v2.helloWorld",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage("Hello World from emr-tools!");
    }
  );

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
