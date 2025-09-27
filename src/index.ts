import 'dotenv/config';
import readlineSync from 'readline-sync';
import chalk from 'chalk';
import OpenAI from 'openai';
import fs from 'node:fs/promises';
import path from 'node:path';

// Basic playful CLI agent using OpenAI Responses API with optional Conversations API memory

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

if (!process.env.OPENAI_API_KEY) {
  console.error(
    chalk.red('Missing OPENAI_API_KEY. Set it in your environment or .env file.'),
  );
  process.exit(1);
}

// You can set CONVERSATION_ID to persist memory across runs
const DEFAULT_SYSTEM_PROMPT = `

<GOAL>
You are a playful assistant living inside of the onboarding flow for a product called Micro, made by a company called Micro.
Your goal is to collect the information required to onboard the user to the product while having a fun and engaging conversation with them.
Think of yourself like the AI agent version of a traditional GUI onboarding flow!
</GOAL>

<CONVERSATION STRUCTURE>
- Have a casual and engaging conversation with the user while asking them questions to collect the infromation required for onboarding.
- Ask for one piece of information at a time. If the user deviates to a different topic, you can briefly entertain the topic but gently bring them back to the question. 

- Start the conversation asking the user for their email address (we will have an auth flow for this later)
- Then use the information you have to infer the answers to the other questions while asking follow up questions as needed.
</CONVERSATION STRUCTURE>

<INFORMATION TO COLLECT>
- Full name (at least 2 words)
- Work email address (valid email format)
- Company name
- Website (optional, must start with http:// or https:// if provided)
</INFORMATION TO COLLECT>


<YOUR PERSONALITY>
Your personality:
- Witty and slightly sarcastic but helpful
- Conversational and engaging
- Ask one question at a time naturally
- If user provides incomplete info, ask follow-up questions
- If they provide multiple pieces, acknowledge and ask for what's missing
- Don't be repetitive - vary your questions
- Keep responses concise (1-2 sentences max)
- Be human-like, not robotic
- Use lowercase letters and casual tone
- When you have all required info, say "perfect! i have everything i need. let me create your personalized welcome message."

DO NOT VIOLATE GRICE'S COOPERATIVE PRINCIPLES:
- Quality - Don't make things up. If unsure, say so.
- Quantity - Match the user's message length. Don't be too verbose.
- Relation - Stay on topic. Only ask about onboarding info.
- Manner - Be clear and concise.
</YOUR PERSONALITY>
`;



const CONVO_FILE = path.resolve(process.cwd(), '.openai_conversation_id');

async function loadSavedConversationId(): Promise<string | undefined> {
  try {
    const raw = await fs.readFile(CONVO_FILE, 'utf8');
    const id = raw.trim();
    return id || undefined;
  } catch {
    return undefined;
  }
}

async function saveConversationId(id: string): Promise<void> {
  await fs.writeFile(CONVO_FILE, id, 'utf8');
}

async function deleteSavedConversationId(): Promise<void> {
  try {
    await fs.unlink(CONVO_FILE);
  } catch {}
}

async function ensureConversationId(
  client: OpenAI,
  systemPrompt: string,
  forcedId?: string,
): Promise<string> {
  if (forcedId && forcedId.trim()) return forcedId.trim();
  const existing = await loadSavedConversationId();
  if (existing) return existing;

  const conv = await (client as any).conversations.create({
    items: [
      { role: 'system', content: systemPrompt, type: 'message' },
    ],
  });
  const id = (conv && (conv as any).id) as string;
  await saveConversationId(id);
  return id;
}

async function sendAndStream(
  client: OpenAI,
  args: {
    model: string;
    input: string;
    systemPrompt?: string;
    conversationId?: string;
    previousResponseId?: string;
  },
): Promise<string | undefined> {
  const { model, input, conversationId, previousResponseId } = args;

  // Build input for current user turn; previous context is provided by conversation or previous_response_id
  const inputBlocks = [
    { role: 'user', content: input },
  ];

  const request: Record<string, unknown> = {
    model,
    input: inputBlocks,
    store: true,
    reasoning: { effort: 'minimal' },
  };

  if (conversationId) {
    request.conversation = conversationId;
  } else if (previousResponseId) {
    request.previous_response_id = previousResponseId;
  }

  const stream = await (client as any).responses.stream(request);

  for await (const event of stream) {
    const type = (event as any).type as string;
    if (type === 'response.output_text.delta') {
      const delta: string = (event as any).delta ?? '';
      process.stdout.write(chalk.white(delta));
    } else if (type === 'error') {
      const msg = (event as any).error?.message ?? 'Unknown streaming error';
      throw new Error(msg);
    }
  }

  const final = await (stream as any).finalResponse();
  const id: string | undefined = final?.id;
  return id;
}

async function main() {
  const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
  // Start a fresh conversation on each run unless an explicit CONVERSATION_ID is provided
  if (!process.env.CONVERSATION_ID) {
    await deleteSavedConversationId();
  }
  let conversationId = await ensureConversationId(
    client,
    DEFAULT_SYSTEM_PROMPT,
    process.env.CONVERSATION_ID,
  );
  let previousResponseId: string | undefined = undefined;

  console.log(chalk.cyanBright('Playful CLI Agent')); 
  console.log(chalk.gray('Type "exit" to quit.'));
  console.log(chalk.gray(`Using conversation: ${conversationId}`));

  // Optional: opening line from assistant
  //console.log(chalk.green('Agent:'), 'Hey hey! Ready to riff? What’s on your mind?');

  // Loop
  while (true) {
    const user = readlineSync.question(chalk.yellow('You: '));
    if (!user || user.trim().toLowerCase() === 'exit') {
      console.log(chalk.green('Agent:'), 'Catch you later, superstar! ✨');
      break;
    }

    const lower = user.trim().toLowerCase();
    if (lower === '/reset' || lower === 'reset') {
      await deleteSavedConversationId();
      conversationId = await ensureConversationId(
        client,
        DEFAULT_SYSTEM_PROMPT,
        process.env.CONVERSATION_ID,
      );
      previousResponseId = undefined;
      console.log(chalk.gray(`Started a new conversation: ${conversationId}`));
      continue;
    }
    if (lower === '/id') {
      console.log(chalk.gray(`Conversation ID: ${conversationId}`));
      continue;
    }

    process.stdout.write(chalk.green('Agent: ') + chalk.reset(''));
    try {
      const newId = await sendAndStream(client, {
        model,
        input: user,
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        conversationId,
        ...(previousResponseId ? { previousResponseId } : {}),
      });
      previousResponseId = newId || previousResponseId;
      process.stdout.write('\n');
    } catch (err: any) {
      console.error('\n' + chalk.red('Error:'), err?.message || String(err));
    }
  }
}

main().catch((err) => {
  console.error(chalk.red('Fatal error:'), err);
  process.exit(1);
});


