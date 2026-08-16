import OpenAI from 'openai';

export type CommitStyle = 'conventional' | 'short' | 'detailed';

interface GenerateArgs {
  apiKey: string;
  model: string;
  style: CommitStyle;
  diff: string;
  recentSubjects: string[];
}

function buildPrompt({ style, diff, recentSubjects }: Omit<GenerateArgs, 'apiKey' | 'model'>): string {
  const styleInstruction: Record<CommitStyle, string> = {
    conventional:
      'Use the Conventional Commits format: "<type>(<scope>): <description>". ' +
      'Pick type from feat, fix, docs, style, refactor, perf, test, chore, build, ci. ' +
      'Keep the summary line under 72 characters. Add a short body only if it adds real information.',
    short: 'Write a single concise summary line under 60 characters. No body, no prefix.',
    detailed:
      'Write a summary line under 72 characters, then a blank line, then a bullet-point body ' +
      'explaining what changed and why, based only on what the diff shows.',
  };

  const historyBlock =
    recentSubjects.length > 0
      ? `Recent commit subjects in this repo, for style reference (do not copy content, just match tone/format):\n${recentSubjects
          .map((s) => `- ${s.split('\n')[0]}`)
          .join('\n')}`
      : 'No prior commit history available in this repo.';

  return `You write git commit messages from a staged diff. ${styleInstruction[style]}

${historyBlock}

Rules:
- Base the message only on what's actually in the diff. Never invent context that isn't shown.
- Do not include the diff or any markdown code fences in your answer.
- Return ONLY the commit message text, nothing else — no preamble, no explanation.

Staged diff:
${diff}`;
}

export async function generateCommitMessage(args: GenerateArgs): Promise<string> {
  const client = new OpenAI({
    apiKey: args.apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });

  const response = await client.chat.completions.create({
    model: args.model,
    max_tokens: 500,
    messages: [{ role: 'user', content: buildPrompt(args) }],
  });

  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new Error('The model did not return a text response.');
  }
  return text.trim();
}