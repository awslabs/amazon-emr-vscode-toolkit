/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import { Uri, window, Disposable } from "vscode";
import { QuickPickItem } from "vscode";
import { workspace } from "vscode";
import glob = require("glob");

/**
 * A file opener using window.createQuickPick().
 *
 * It shows how the list of items can be dynamically updated based on
 * the user's input in the filter field.
 */
export async function quickOpen() {
  const uri = await pickFile();
  if (uri) {
    const document = await workspace.openTextDocument(uri);
    await window.showTextDocument(document);
  }
}

class FileItem implements QuickPickItem {
  label: string;
  description: string;

  constructor(public base: Uri, public uri: Uri) {
    this.label = path.basename(uri.fsPath);
    this.description = path.dirname(path.relative(base.fsPath, uri.fsPath));
  }
}

class MessageItem implements QuickPickItem {
  label: string;
  description = "";
  detail: string;

  constructor(public base: Uri, public message: string) {
    this.label = message.replace(/\r?\n/g, " ");
    this.detail = base.fsPath;
  }
}

export async function pickFile(placeHolder?: string) {
  const disposables: Disposable[] = [];
  try {
    return await new Promise<Uri | undefined>((resolve, reject) => {
      const input = window.createQuickPick<FileItem | MessageItem>();
      input.placeholder = placeHolder
        ? placeHolder
        : "Type to search for files";
      disposables.push(
        input.onDidChangeValue((value) => {
          input.items = [];
          if (!value) {
            return;
          }
          input.busy = true;
          const cwds = workspace.workspaceFolders
            ? workspace.workspaceFolders.map((f) => f.uri.fsPath)
            : [process.cwd()];
          cwds.map((cwd) => {
            glob(`**/${value}*`, {cwd, nodir: true}, function (err, filenames) {
              if (!err) {
                input.items = input.items.concat(
                  filenames.map(
                    (filename) =>
                      new FileItem(
                        Uri.file(cwd),
                        Uri.file(path.join(cwd, filename))
                      )
                  )
                );
              }
              if (err) {
                input.items = input.items.concat([
                  new MessageItem(Uri.file(cwd), err.message),
                ]);
              }
              input.busy = false;
            });
          });
        }),
        input.onDidChangeSelection((items) => {
          const item = items[0];
          if (item instanceof FileItem) {
            resolve(item.uri);
            input.hide();
          }
        }),
        input.onDidHide(() => {
          resolve(undefined);
          input.dispose();
        })
      );
      input.show();
    });
  } finally {
    disposables.forEach((d) => d.dispose());
  }
}
