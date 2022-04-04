import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { EMR, ListClustersCommand, ClusterState } from "@aws-sdk/client-emr";

export class NodeDependenciesProvider implements vscode.TreeDataProvider<EMRCluster> {
  emrClient: EMR;
  constructor(private workspaceRoot: string) {
    this.emrClient = new EMR({region: "us-west-2"});
  }

  getTreeItem(element: EMRCluster): vscode.TreeItem {
    return element;
  }

  getChildren(element?: EMRCluster): Thenable<EMRCluster[]> {
      return Promise.resolve(this.listEMRClusters(this.emrClient));
  }

  getOldChildren(element?: Dependency): Thenable<Dependency[]> {
    if (!this.workspaceRoot) {
      vscode.window.showInformationMessage('No dependency in empty workspace');
      return Promise.resolve([]);
    }

    if (element) {
      return Promise.resolve(
        this.getDepsInPackageJson(
          path.join(this.workspaceRoot, 'node_modules', element.label, 'package.json')
        )
      );
    } else {
      const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
      if (this.pathExists(packageJsonPath)) {
        return Promise.resolve(this.getDepsInPackageJson(packageJsonPath));
      } else {
        vscode.window.showInformationMessage('Workspace has no package.json');
        return Promise.resolve([]);
      }
    }
  }

  private async listEMRClusters(client: EMR): Promise<EMRCluster[]> {
    // Currently only show running or waiting clusters
    const params = {ClusterStates: [ClusterState.RUNNING, ClusterState.WAITING]};
    vscode.window.showInformationMessage('Fetching running and waiting clusters');
    try {
      const result = await client.send(new ListClustersCommand(params));
      vscode.window.showInformationMessage('There were: ' + (result.Clusters || []).length) + " clusters";
      return (result.Clusters || []).map(cluster => {
        return new EMRCluster(cluster.Name || "", cluster.Id || "", vscode.TreeItemCollapsibleState.Collapsed);
      });
    } catch (e) {
      vscode.window.showErrorMessage("Bummer!" + e);
      console.log("There was an error fetching clusters", e);
      return [];
    }
    
  }

  /**
   * Given the path to package.json, read all its dependencies and devDependencies.
   */
  private getDepsInPackageJson(packageJsonPath: string): Dependency[] {
    if (this.pathExists(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      const toDep = (moduleName: string, version: string): Dependency => {
        if (this.pathExists(path.join(this.workspaceRoot, 'node_modules', moduleName))) {
          return new Dependency(
            moduleName,
            version,
            vscode.TreeItemCollapsibleState.Collapsed
          );
        } else {
          return new Dependency(moduleName, version, vscode.TreeItemCollapsibleState.None);
        }
      };

      const deps = packageJson.dependencies
        ? Object.keys(packageJson.dependencies).map(dep =>
            toDep(dep, packageJson.dependencies[dep])
          )
        : [];
      const devDeps = packageJson.devDependencies
        ? Object.keys(packageJson.devDependencies).map(dep =>
            toDep(dep, packageJson.devDependencies[dep])
          )
        : [];
      return deps.concat(devDeps);
    } else {
      return [];
    }
  }

  private pathExists(p: string): boolean {
    try {
      fs.accessSync(p);
    } catch (err) {
      return false;
    }
    return true;
  }
}

class Dependency extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    private version: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.tooltip = `${this.label}-${this.version}`;
    this.description = this.version;
  }

  iconPath = {
    light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
    dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
  };
}

class EMRCluster extends vscode.TreeItem {
  constructor(
    public readonly name: string,
    public readonly id: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(name, collapsibleState);
    this.tooltip = `${this.name} (${this.id})`;
    this.description = this.id;
  }
}