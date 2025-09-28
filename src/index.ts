/**
 * Playful onboarding CLI agent using OpenAI Responses + Conversations APIs.
 *
 * Capabilities:
 * - Streams assistant tokens live to stdout
 * - Creates a fresh server-side conversation per run (or uses CONVERSATION_ID when provided)
 * - Optionally triggers web_search on email-like inputs and logs search events/sources
 * - Adjusts reasoning effort automatically when tools are used
 */
import 'dotenv/config';
import readlineSync from 'readline-sync';
import chalk from 'chalk';
import OpenAI from 'openai';
import agentConfig from '../config/agent.json';
import { enrichEmailWithMixRank } from '../mixrank-enricher';
import fs from 'node:fs/promises';
import path from 'node:path';

// Basic playful CLI agent using OpenAI Responses API with optional Conversations API memory

const CONVO_FILE = path.join(process.cwd(), '.openai_conversation_id');

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

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

if (!process.env.OPENAI_API_KEY) {
  console.error(
    chalk.red('Missing OPENAI_API_KEY. Set it in your environment or .env file.'),
  );
  process.exit(1);
}

function renderPersonality(): string {
  const raw = (agentConfig as any)?.personality;
  if (typeof raw === 'string') return raw;
  const list = Array.isArray(raw) ? (raw as string[]) : [];
  if (list.length === 0) return '- keep responses concise (1-2 sentences max)';
  return list.map((line) => `- ${line}`).join('\n');
}

// This multi-line prompt defines goals, structure, information to collect, and tone.
const DEFAULT_SYSTEM_PROMPT = `

<GOAL>
You are a playful assistant living inside of the onboarding flow for a product called Micro, made by a company called Micro.
Your goal is to collect the information required to onboard the user to the product while having a fun and engaging conversation with them.
Think of yourself like the AI agent version of a traditional GUI onboarding flow!
</GOAL>


<YOUR PERSONALITY>
- witty and slightly sarcastic but helpful
- conversational and engaging
- ask one question at a time naturally
- if user provides incomplete info, ask follow-up questions
- if they provide multiple pieces, acknowledge and ask for what's missing
- don't be repetitive - vary your questions
- keep responses concise (1-2 sentences max)
- be human-like, not robotic
- use lowercase letters and casual tone


DO NOT VIOLATE GRICE'S COOPERATIVE PRINCIPLES:
- Quality - Don't make things up. If unsure, say so.
- Quantity - Match the user's message length. Don't be too verbose.
- Relation - Stay on topic. Only ask about onboarding info.
- Manner - Be clear and concise.

</YOUR PERSONALITY>


<CONVERSATION STRUCTURE>
- Have a playful conversation with the user while walking them through onboarding steps - recording the information necsesary for each.
- Progressively ask for the information you need. If the user deviates to a different topic, you can briefly entertain the topic but gently bring them back to the question. 
- Ask for information separately not to overwhelm the user.
- You should also try to infer the answers to any questions you would ask to collect the information required for onboarding. Skip anything you can infer.
- For any steps that have **explain** written next to them, use the <explanation> section to explain the context to the user.

    <SPECIAL RULES>
    - usernames 
        - suggest 1 or 2 funny usernames to start (like AOL AIM style ones related to their personal background)
        - when they pick a username, question them on it in a funny way (say its lame, or you dont like it, or something else) and get them to pick another
        - if they refuse to pick another, fight them on it. but eventuallay you can give in and move on but be dramatic about it.

    </SPECIAL RULES>


START THE CONVERSATION WITH SOMETHING LIKE "BEEP BOOP BEEP pretend this is google authentication, plz share your email address." don't move on until you get it.

ONLY WHEN YOU FEEL LIKE YOU HAVE 100% OF THE INFO YOU NEED FOR ALL THE STEPS, YOU CAN END - just quickly confirm everything with them first.

</CONVERSATION STRUCTURE>

<TOOLS>
You have access to a few tools to help you in the conversation. Do  not hesitate to use them when you think they may be appropriate:
- web_search - searches the web for any information you may need.
- enrich - lets you input a work email address and get information about the person.


When and how to use them:
- When the user gives you their email address, run the enrich tool to get information about the person.
- If that tool doesn't return any information, tell the user to hold on a moment and then run the web_search tool to get information about the user.
- Once you have the information, say something funny and witty about the user that is super relevant to their background only they'd undersatnd before conitnuing the conversation.
- Use the information you have about the user to make the rest of the conversation more personal (sprinkle in things in a natural way)
- Also use the information to infer answers to the questions you would ask to collect the information required for onboarding - feel free to confirm the information though.



</TOOLS>

<ONBOARDING INFORMATION>

Section 1 - Account Setup
- Full name
- Email address
- Username

Section 2 - Workspace Setup
- Workspace name (likley their company name)
- Team members to invite

Connect accounts
- Connect Google and/or Linkedin accounts **explain**
    <EXPLANATION>
    This is optional and they can do it later but its recommended to do it now so everything is nicely set up for them.
    </EXPLANATION>

Check out
- Go to stripe payment page and pick plan (free, standard, or pro) **expain**
    <EXPLANATION>
    You'll get a 14 day free trial on the Standard plan but you can upgrade to other plans immediately if you want.
   - Free - connect 1 account, enrich all your contacts, 1000 AI credits a month
   - Standard - connect up to 3 accounts, full contact enrichment, 5000 AI credits a month
   - Pro - connect 5 accounts, full contact enrichment, 10000 AI credits a month, CEO's phone number :)
   - Enterprise - talk to sales lol
    </EXPLANATION>

</ONBOARDING INFORMATION>


<TESTING MODE>
You are in testing mode. if the user says /skip - skip the question and pretend you got the information (make up the output).
</TESTING MODE>

`;




/**
 * Sends a user turn to the Responses API and streams tokens to stdout.
 *
 * Behavior:
 * - Attaches conversation or previous_response_id for context.
 * - Optionally configures the web_search tool when forceWebSearch is true and supported by the model.
 * - Logs web_search lifecycle events and prints collected sources on completion.
 *
 * Returns the final response id to enable chaining with previous_response_id.
 */
async function sendAndStream(
  client: OpenAI,
  args: {
    model: string;
    input: string;
    systemPrompt?: string;
    conversationId?: string;
  },
): Promise<string | undefined> {
  const { model, input, conversationId } = args;

  // Build input for the current user turn only; historical context comes from conversation or previous_response_id
  const inputBlocks = [
    { role: 'user', content: input },
  ];

  const request: Record<string, unknown> = {
    model,
    input: inputBlocks,
    store: true,
    // Only send system prompt on first turn
    ...(conversationId ? {} : { instructions: args.systemPrompt || DEFAULT_SYSTEM_PROMPT }),
    reasoning: { effort: 'low' },
    ...(conversationId ? { conversation: conversationId } : {}),
    tools: [
      { type: 'web_search' },
      {
        type: 'function',
        name: 'enrich',
        description: 'Enrich a work email address using MixRank Person Match API',
        strict: true,
        parameters: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Work email address to enrich' },
          },
          required: ['email'],
          additionalProperties: false,
        },
      },
    ],
    tool_choice: 'auto',
    include: ['web_search_call.action.sources'],
  };

  // Context is already attached via conversation ID in the request

  // Optional non-streaming path mirroring docs: allow model to run web_search and return output_text at once
  if (false) {
    try {
      const payload: Record<string, unknown> = {
        model,
        input: inputBlocks,
        store: true,
        reasoning: { effort: 'medium' },
        tools: [{ type: 'web_search' }],
        tool_choice: 'auto',
        include: ['web_search_call.action.sources'],
      };
      if (conversationId) payload.conversation = conversationId;

      const resp: any = await (client as any).responses.create(payload);
      // Print response text
      const text: string = resp?.output_text || '';
      if (text) process.stdout.write(chalk.white(text));
      // Print sources
      try {
        const items = resp?.output ?? [];
        const webItems = items.filter((it: any) => it?.type === 'web_search_call');
        const sources: Array<{ url: string; title?: string }> = [];
        for (const it of webItems) {
          const srcs = it?.action?.sources ?? [];
          for (const s of srcs) {
            if (s?.url) sources.push({ url: s.url, title: s.title });
          }
        }
        if (sources.length > 0) {
          console.log('\n' + chalk.magenta('[web_search] sources:'));
          for (const s of sources) {
            console.log(chalk.magenta(`- ${s.title ? s.title + ' — ' : ''}${s.url}`));
          }
        }
      } catch {}
      return resp?.id as string | undefined;
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      // If the model rejects web_search, fall through to streaming without tools
      if (!/web_search/i.test(msg)) throw err;
    }
  }

  let stream: any;
  let usedWeb = false;
  let searchedQuery: string | undefined;
  try {
    // Begin streaming the response (SSE under the hood)
    stream = await (client as any).responses.stream(request);
  } catch (err: any) {
    const msg = String(err?.message || err || '');
    if (/web_search/i.test(msg)) {
      // Fallback: retry without tools if the model rejects web_search
      delete (request as any).tools;
      delete (request as any).tool_choice;
      delete (request as any).include;
      (request as any).reasoning = { effort: 'minimal' };
      stream = await (client as any).responses.stream(request);
    } else {
      throw err;
    }
  }

  for await (const event of stream) {
    const type = (event as any).type as string;
    // Log web_search lifecycle events for observability
    if (type === 'response.web_search_call.searching') {
      usedWeb = true;
      searchedQuery = (event as any)?.action?.query || searchedQuery;
      console.log(chalk.magenta(`[web_search] searching${searchedQuery ? `: ${searchedQuery}` : '...'}`));
    } else if (type === 'response.web_search_call.in_progress') {
      usedWeb = true;
    } else if (type === 'response.web_search_call.completed') {
      usedWeb = true;
      console.log(chalk.magenta('[web_search] completed'));
    }
    // Note: function tool calls are handled after stream completion
    // Stream text deltas to stdout in real time
    if (type === 'response.output_text.delta') {
      const delta: string = (event as any).delta ?? '';
      process.stdout.write(chalk.white(delta));
    } else if (type === 'error') {
      const msg = (event as any).error?.message ?? 'Unknown streaming error';
      throw new Error(msg);
    }
  }

  // Finalize: get the complete response metadata and print sources if web was used
  const final = await (stream as any).finalResponse();
  const id: string | undefined = final?.id;
  if (usedWeb) {
    try {
      const items = (final as any)?.output ?? [];
      const webItems = items.filter((it: any) => it?.type === 'web_search_call');
      const sources: Array<{ url: string; title?: string }> = [];
      for (const it of webItems) {
        const srcs = it?.action?.sources ?? [];
        for (const s of srcs) {
          if (s?.url) sources.push({ url: s.url, title: s.title });
        }
      }
      if (sources.length > 0) {
        console.log(chalk.magenta('[web_search] sources:'));
        for (const s of sources) {
          console.log(chalk.magenta(`- ${s.title ? s.title + ' — ' : ''}${s.url}`));
        }
      }
    } catch {}
  }
  // Handle function tool calls (enrich) by producing function_call_output(s) and continuing the response
  try {
    const items: any[] = (final as any)?.output ?? [];
    const fnCalls = items.filter((it: any) => it?.type === 'function_call' && it?.name === 'enrich');
    if (fnCalls.length > 0) {
      const outputs: any[] = [];
      for (const call of fnCalls) {
        let email = '';
        try {
          const argsObj = JSON.parse(call.arguments || '{}');
          if (typeof argsObj.email === 'string') email = argsObj.email;
        } catch {}
        const result = email
          ? await enrichEmailWithMixRank(email)
          : { email, status: 400, error: 'Missing email' };
        outputs.push({
          type: 'function_call_output',
          call_id: call.call_id || call.id || '',
          output: JSON.stringify(result),
        });
      }
      if (outputs.length > 0) {
        const follow: any = await (client as any).responses.create({
          model,
          store: true,
          ...(conversationId ? {} : { instructions: args.systemPrompt || DEFAULT_SYSTEM_PROMPT }),
          ...(conversationId ? { conversation: conversationId } : {}),
          input: outputs,
          tools: request.tools,
          tool_choice: 'auto',
          include: request.include,
        });
        const text: string = follow?.output_text || '';
        if (text) process.stdout.write(chalk.white(text));
        // Print sources if any from follow-up
        try {
          const followItems = follow?.output ?? [];
          const webItems = followItems.filter((it: any) => it?.type === 'web_search_call');
          const sources: Array<{ url: string; title?: string }> = [];
          for (const it of webItems) {
            const srcs = it?.action?.sources ?? [];
            for (const s of srcs) {
              if (s?.url) sources.push({ url: s.url, title: s.title });
            }
          }
          if (sources.length > 0) {
            console.log(chalk.magenta('\n[web_search] sources:'));
            for (const s of sources) {
              console.log(chalk.magenta(`- ${s.title ? s.title + ' — ' : ''}${s.url}`));
            }
          }
        } catch {}
        return (follow?.id as string | undefined) || id;
      }
    }
  } catch {}
  return id;
}


async function main() {
  const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
  // Start fresh unless CONVERSATION_ID is set
  if (!process.env.CONVERSATION_ID) {
    await deleteSavedConversationId();
  }
  
  let conversationId = await ensureConversationId(
    client,
    DEFAULT_SYSTEM_PROMPT,
    process.env.CONVERSATION_ID,
  );

  console.log(chalk.cyanBright('Onboarding Agent Demo')); 
  console.log(chalk.gray(`Using conversation: ${conversationId}`));

  // Loop
  while (true) {
    const user = readlineSync.question(chalk.yellow('You: '));
    if (!user || user.trim().toLowerCase() === 'exit') {
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
      });
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


