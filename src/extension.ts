import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('Commit Message Generator is now active');

  const disposable = vscode.commands.registerCommand('commitMessageGenerator.generate', () => {
    vscode.window.showInformationMessage('Generate Commit Message was triggered!');
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}