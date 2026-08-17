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

function createClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey, baseURL: 'https://api.groq.com/openai/v1' });
}

// Groq serves speech and moderation models from the same endpoint; none of them
// can write a commit message, so keep them out of the picker.
const NON_CHAT_MODEL = /whisper|tts|playai|guard/i;

export async function listChatModels(apiKey: string): Promise<string[]> {
  const models = await createClient(apiKey).models.list();
  return models.data
    .map((m) => m.id)
    .filter((id) => !NON_CHAT_MODEL.test(id))
    .sort();
}

export async function generateCommitMessage(args: GenerateArgs): Promise<string> {
  const client = createClient(args.apiKey);

  // Reasoning models (gpt-oss, qwen3, deepseek-r1...) spend tokens thinking before
  // they emit any content, so they need a bigger budget and the lowest effort setting.
  const isReasoningModel = /gpt-oss|qwen3|deepseek-r1/i.test(args.model);

  const response = await client.chat.completions.create({
    model: args.model,
    max_completion_tokens: isReasoningModel ? 2000 : 500,
    ...(isReasoningModel ? { reasoning_effort: 'low' } : {}),
    messages: [{ role: 'user', content: buildPrompt(args) }],
  });

  const choice = response.choices[0];
  const text = choice?.message?.content;
  if (!text) {
    if (choice?.finish_reason === 'length') {
      throw new Error(
        `The model "${args.model}" ran out of tokens before writing a message. ` +
          'Try a smaller diff (commitMessageGenerator.maxDiffChars) or a non-reasoning model ' +
          'such as llama-3.1-8b-instant.'
      );
    }
    throw new Error(
      `The model "${args.model}" did not return a text response (finish reason: ${
        choice?.finish_reason ?? 'unknown'
      }).`
    );
  }
  return text.trim();
}