// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as vscode from "vscode";

/**
 * Copies the arn of the resource represented by the given node.
 */
 export async function copyIdCommand(
    node: vscode.TreeItem,
): Promise<void> {
    await vscode.env.clipboard.writeText(node.id!);
}
