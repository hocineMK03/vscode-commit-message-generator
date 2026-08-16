# Commit Message Generator

![License](https://img.shields.io/github/license/hocineMK03/vscode-commit-message-generator)
![TypeScript](https://img.shields.io/badge/typescript-5%2B-blue)
![Stars](https://img.shields.io/github/stars/hocineMK03/vscode-commit-message-generator?style=social)
![Last Commit](https://img.shields.io/github/last-commit/hocineMK03/vscode-commit-message-generator)

A VS Code extension that writes your commit messages for you. It reads your **staged** git diff, sends it to a Groq-hosted model, and drops a clear, meaningful commit message straight into the Source Control input box (and/or your terminal).

No more `fix stuff` or `update`.

## How it works

1. Stage your changes (`git add`, or the `+` button in the Source Control panel).
2. Press **`Ctrl` + `Shift` + `P`** to open the Command Palette.
3. Type **`Generate Commit Message`** and hit Enter.
4. The first time only, paste in a Groq API key — grab one free at **https://console.groq.com/keys**.

That's it. The message appears in the Source Control box, ready to review and commit.

Your API key is stored in VS Code's encrypted secret storage  never in `settings.json`, never in your repo. To change it later, run **`Set Groq API Key`** from the Command Palette.

## Settings

| Setting | Default | What it does |
| --- | --- | --- |
| `commitMessageGenerator.model` | `llama-3.1-8b-instant` | Which Groq model to use. |
| `commitMessageGenerator.style` | `conventional` | `conventional`, `short`, or `detailed`. |
| `commitMessageGenerator.target` | `both` | `scmInputBox`, `terminal`, or `both`. |
| `commitMessageGenerator.maxDiffChars` | `12000` | Diff is truncated past this length before being sent. |

When `target` includes the terminal, the extension **types** `git commit -m "..."` into your active terminal but does not run it — you press Enter yourself.

## Development

```bash
npm install
npm run build     # bundle with esbuild
npm run watch     # rebuild on change
npm run compile   # type-check only
```

Press `F5` in VS Code to launch an Extension Development Host with the extension loaded.

## License

Released under the **MIT License**. You're free to use, modify, and distribute it — see [LICENSE](LICENSE) for the full text.
