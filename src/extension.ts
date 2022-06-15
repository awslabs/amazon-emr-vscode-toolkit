// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { connectToClusterCommand } from "./emr_connect";
import { EMRContainersProvider } from "./emr_containers";
import { EMRDeployer } from "./emr_deploy";
import { EMRCluster, EMREC2Filter, EMREC2Provider } from "./emr_explorer";
import { EMRServerlessProvider } from "./emr_serverless";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  let logger = vscode.window.createOutputChannel("Amazon EMR");

  const treeFilter = new EMREC2Filter();
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "emr-tools-v2.filterClusters", async () => {
        await treeFilter.run();
      }
    )
  );

  // Tree data providers
  const emrTools = new EMREC2Provider(vscode.workspace.rootPath + "", treeFilter, logger);
  vscode.window.registerTreeDataProvider("emrExplorer", emrTools);
  vscode.commands.registerCommand("emr-tools-v2.refreshEntry", () =>
    emrTools.refresh()
  );
  vscode.commands.registerCommand("emr-tools-v2.connectToCluster", async (cluster: EMRCluster) => {
    await connectToClusterCommand(cluster);
  });

  // EMR on EKS support
  const emrContainerTools = new EMRContainersProvider();
  vscode.window.registerTreeDataProvider("emrContainersExplorer", emrContainerTools);
  vscode.commands.registerCommand("emr-tools-v2.refreshContainerEntry", () =>
    emrContainerTools.refresh()
  );

  // EMR Serverless support
  const emrServerlessTools = new EMRServerlessProvider();
  vscode.window.registerTreeDataProvider("emrServerlessExplorer", emrServerlessTools);
  vscode.commands.registerCommand("emr-tools-v2.refreshServerlessEntry", () => emrServerlessTools.refresh());

  // Deployment support for all our available options
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "emr-tools-v2.deploy", async () => {
        await new EMRDeployer(emrTools, emrContainerTools, emrServerlessTools).run();
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
