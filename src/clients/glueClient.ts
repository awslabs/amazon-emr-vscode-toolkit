// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as vscode from "vscode";
import {
    GlueClient,
    GetDatabasesCommand,
    Database,
    Table,
    GetTablesRequest,
    GetTablesCommand,
    GetTableCommand,
    GetTableRequest
} from "@aws-sdk/client-glue";
import { Globals } from "../extension";

export class DefaultGlueClient {
    public constructor(private readonly globals: Globals) { }

    private async createGlueClient(): Promise<GlueClient> {
        return new GlueClient(this.globals.awsContext.getClientConfig());
    }

    public async listDatabases(): Promise<Database[]> {
        this.globals.outputChannel.appendLine(
            `Glue Catalog: Fetching databases from ${this.globals.awsContext.getRegion()} region.`
        );
        const glue = await this.createGlueClient();
        let databases;
        try {
            const result = await glue.send(new GetDatabasesCommand({}));

            databases = result.DatabaseList ?? [];
        } catch (error) {
            vscode.window.showErrorMessage(
                "Error fetching Glue Databases!" + error
            );
            return [];
        }

        return databases;
    }


    public async listTables(databaseName: string): Promise<Table[]> {

        this.globals.outputChannel.appendLine(
            `Glue Catalog: Fetching tables of database ${databaseName} from ${this.globals.awsContext.getRegion()} region.`
        );
        const glue = await this.createGlueClient();
        let tables: Table[];

        try {

            let input: GetTablesRequest = {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                DatabaseName: databaseName,
            };

            const result = await glue.send(new GetTablesCommand(input));
            
            tables = result.TableList ?? [];

        } catch (error) {
            vscode.window.showErrorMessage(
                "Error fetching Glue Tables!" + error
            );
            return [];

        }

        return tables;

    }

    public async getTable(tableName: string, databaseName: string): Promise<Table | undefined>{

        this.globals.outputChannel.appendLine(
            `Glue Catalog: Fetching table of database ${databaseName} from ${this.globals.awsContext.getRegion()} region.`
        );
        const glue = await this.createGlueClient();
        let table: Table | undefined;

        try {

            let input: GetTableRequest = {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                DatabaseName: databaseName,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                Name: tableName,
            };

            const result = await glue.send(new GetTableCommand(input));
            
            table = result.Table || undefined;

        } catch (error) {
            vscode.window.showErrorMessage(
                "Error fetching Glue Tables!" + error
            );
            return undefined;

        }

        return table;

    }

}
