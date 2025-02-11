// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as vscode from "vscode";
import { SSMClient, StartSessionCommand, StartSessionCommandInput } from "@aws-sdk/client-ssm";
import { EMRCluster } from './emr_explorer';

export async function connectToClusterCommand(
    cluster: EMRCluster
): Promise<void> {
    // For now, we'll just forward some default ports
    // TODO: Get the active primary node of the passed cluster
    const targetNode = "i-0ce9287cb94b72a8b";
    console.log("Connecting to ", targetNode);
    const client = new SSMClient({ region: "us-west-2" });
    const params = {
        DocumentName: "AWS-StartPortForwardingSession",
        Target: targetNode,
        Parameters: {"portNumber":["22"],"localPortNumber":["2222"]}

    };
    const command = new StartSessionCommand(params);
    const response = await client.send(command);
    console.log("Response is: ", response);
    // Unfortunately, we *ALSO* Need to start a shell session with the actual
    // SSM utility. aws-toolkit does ths and has a method for installing it as well.
    // (see installSsmCli https://github.com/aws/aws-toolkit-vscode/search?q=installSsmCli)
}