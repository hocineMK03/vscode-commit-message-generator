import * as vscode from 'vscode';
import simpleGit, { SimpleGit } from 'simple-git';

export interface StagedInfo {
  diff: string;
  recentSubjects: string[];
}

function getGitForWorkspace(): SimpleGit {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    throw new Error('No workspace folder is open.');
  }
  return simpleGit(folders[0].uri.fsPath);
}

export async function getStagedInfo(maxDiffChars: number): Promise<StagedInfo> {
  const git = getGitForWorkspace();

  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    throw new Error('This workspace folder is not a git repository.');
  }

  const diff = await git.diff(['--staged']);
  if (!diff.trim()) {
    throw new Error('No staged changes found. Stage some files first (git add).');
  }

  const truncatedDiff =
    diff.length > maxDiffChars
      ? diff.slice(0, maxDiffChars) + '\n\n[... diff truncated for length ...]'
      : diff;

  let recentSubjects: string[] = [];
  try {
    const log = await git.log({ maxCount: 10 });
    recentSubjects = log.all.map((entry) => entry.message);
  } catch {
    recentSubjects = [];
  }

  return { diff: truncatedDiff, recentSubjects };
}

export async function setSCMInputBox(message: string): Promise<void> {
  const gitExtension = vscode.extensions.getExtension('vscode.git');
  if (!gitExtension) {
    throw new Error('Built-in Git extension is not available.');
  }
  const api = gitExtension.isActive
    ? gitExtension.exports.getAPI(1)
    : (await gitExtension.activate()).getAPI(1);

  const repo = api.repositories[0];
  if (!repo) {
    throw new Error('No git repository found by the VS Code Git extension.');
  }
  repo.inputBox.value = message;
}

export function sendToTerminal(commitMessage: string): void {
  const terminal = vscode.window.activeTerminal ?? vscode.window.createTerminal('Commit Message Generator');
  terminal.show();

  const escaped = commitMessage.replace(/"/g, '\\"');
  terminal.sendText(`git commit -m "${escaped}"`, false);
}