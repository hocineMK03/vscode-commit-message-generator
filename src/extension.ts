import * as vscode from 'vscode';
import { generateCommitMessage, listChatModels, CommitStyle } from './groq';
import { getStagedInfo, setSCMInputBox, sendToTerminal } from './git';
const API_KEY_SECRET = 'commitMessageGenerator.apiKey';

async function getApiKey(context: vscode.ExtensionContext): Promise<string> {
  let key = await context.secrets.get(API_KEY_SECRET);
  if (!key) {
    key = await vscode.window.showInputBox({
      title: 'Groq API Key',
      prompt: 'Enter your Groq API key (stored securely, never in settings.json)',
      password: true,
      ignoreFocusOut: true,
    });
    if (!key) {
      throw new Error('An API key is required to generate commit messages.');
    }
    await context.secrets.store(API_KEY_SECRET, key);
  }
  return key;
}

async function generateCommand(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('commitMessageGenerator');
  const model = config.get<string>('model', 'llama-3.1-8b-instant');
  const style = config.get<CommitStyle>('style', 'conventional');
  const maxDiffChars = config.get<number>('maxDiffChars', 12000);
  const target = config.get<string>('target', 'both');
  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Generating commit message...' },
    async () => {
      try {
        const apiKey = await getApiKey(context);
        const { diff, recentSubjects } = await getStagedInfo(maxDiffChars);
        const message = await generateCommitMessage({ apiKey, model, style, diff, recentSubjects });
                if (target === 'scmInputBox' || target === 'both') {
          await setSCMInputBox(message);
        }
        if (target === 'terminal' || target === 'both') {
          sendToTerminal(message);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Commit Message Generator: ${msg}`);
      }
    }
  );
}

async function setApiKeyCommand(context: vscode.ExtensionContext) {
  const key = await vscode.window.showInputBox({
    title: 'Groq API Key',
    prompt: 'Enter your Groq API key (stored securely, never in settings.json)',
    password: true,
    ignoreFocusOut: true,
  });
  if (key) {
    await context.secrets.store(API_KEY_SECRET, key);
    vscode.window.showInformationMessage('Groq API key saved.');
  }
}

async function selectModelCommand(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('commitMessageGenerator');
  const current = config.get<string>('model', 'llama-3.1-8b-instant');

  let picked: string | undefined;
  try {
    const apiKey = await getApiKey(context);
    const models = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Loading Groq models...' },
      () => listChatModels(apiKey)
    );
    const items: vscode.QuickPickItem[] = models.map((id) => ({
      label: id,
      description: id === current ? 'current' : undefined,
    }));
    items.push({ label: 'Enter a model name manually...', alwaysShow: true });

    const choice = await vscode.window.showQuickPick(items, {
      title: 'Select Groq Model',
      placeHolder: `Current: ${current}`,
      ignoreFocusOut: true,
    });
    if (!choice) {
      return;
    }
    picked = choice.label.startsWith('Enter a model name') ? undefined : choice.label;
    if (!picked) {
      picked = await promptForModelName(current);
    }
  } catch (err) {
    // No key yet, offline, or a bad key: fall back to typing the name.
    const msg = err instanceof Error ? err.message : String(err);
    vscode.window.showWarningMessage(`Could not load the model list (${msg}). Enter a model name instead.`);
    picked = await promptForModelName(current);
  }

  if (!picked) {
    return;
  }
  await config.update('model', picked, vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage(`Commit Message Generator: model set to ${picked}.`);
}

function promptForModelName(current: string): Thenable<string | undefined> {
  return vscode.window.showInputBox({
    title: 'Groq Model',
    prompt: 'Model ID to use for generating commit messages',
    value: current,
    ignoreFocusOut: true,
  });
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('commitMessageGenerator.generate', () => generateCommand(context)),
    vscode.commands.registerCommand('commitMessageGenerator.setApiKey', () => setApiKeyCommand(context)),
    vscode.commands.registerCommand('commitMessageGenerator.selectModel', () => selectModelCommand(context))
  );
}

export function deactivate() {}