'use client';

import { Fragment, useMemo, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { CopyIcon, RefreshCcwIcon } from 'lucide-react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import type { PromptInputMessage } from '@/components/ai-elements/prompt-input';
import {
  PromptInput,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { Actions, Action } from '@/components/ai-elements/actions';
import { Response } from '@/components/ai-elements/response';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/components/ai-elements/sources';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import { Loader } from '@/components/ai-elements/loader';

type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'source-url'; url: string }
  | { type: 'reasoning'; text: string };

type UIMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: MessagePart[];
};

const DEFAULT_MODEL = 'openai/gpt-4o';
const DEFAULT_WEB_SEARCH = false;

const SAMPLE_SOURCES = [
  'https://example.com/article',
  'https://example.com/docs',
];

export default function ChatBotDemo() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat({ api: '/api/chat' });

  const normalizedMessages: UIMessage[] = useMemo(() => {
    if (!messages.length) {
      return [
        {
          id: 'assistant-welcome',
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: 'Hi there! Ask me anything or try attaching a file to the prompt input.',
            },
            {
              type: 'reasoning',
              text: 'This is a static reasoning trace to demonstrate the disclosure UI.',
            },
            ...SAMPLE_SOURCES.map<MessagePart>((url) => ({ type: 'source-url', url })),
          ],
        },
      ];
    }

    return messages.map((message) => {
      const maybeParts = (message as unknown as { parts?: MessagePart[] }).parts;
      if (Array.isArray(maybeParts) && maybeParts.length > 0) {
        return {
          id: message.id,
          role: message.role,
          parts: maybeParts,
        } satisfies UIMessage;
      }

      const content = Array.isArray(message.content)
        ? message.content.map((part) =>
            typeof part === 'string'
              ? { type: 'text', text: part }
              : { type: 'text', text: String(part) },
          )
        : [{ type: 'text', text: typeof message.content === 'string' ? message.content : JSON.stringify(message.content) }];
      return {
        id: message.id,
        role: message.role,
        parts: content,
      } satisfies UIMessage;
    });
  }, [messages]);

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text?.trim());
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    sendMessage(
      {
        text: message.text || 'Sent with attachments',
      },
      {
        body: {
          model: DEFAULT_MODEL,
          webSearch: DEFAULT_WEB_SEARCH,
        },
      },
    );
    setInput('');
  };

  const handleRetry = () => {
    const lastUserMessage = messages.filter((msg) => msg.role === 'user').at(-1);
    if (!lastUserMessage) {
      return;
    }
    const text = Array.isArray(lastUserMessage.content)
      ? lastUserMessage.content.join(' ')
      : typeof lastUserMessage.content === 'string'
        ? lastUserMessage.content
        : '';
    if (!text.trim()) {
      return;
    }
    sendMessage(
      { text },
      {
        body: {
          model: DEFAULT_MODEL,
          webSearch: DEFAULT_WEB_SEARCH,
        },
      },
    );
  };

  const latestAssistantMessage = normalizedMessages.filter((msg) => msg.role === 'assistant').at(-1);

  return (
    <div className="mx-auto flex h-screen max-w-4xl flex-col p-6">
      <Conversation className="flex-1 overflow-hidden">
        <ConversationContent>
          {normalizedMessages.map((message, index) => (
            <div key={message.id} className="space-y-2">
              {message.role === 'assistant' &&
                message.parts.filter((part) => part.type === 'source-url').length > 0 && (
                  <Sources>
                    <SourcesTrigger
                      count={message.parts.filter((part) => part.type === 'source-url').length}
                    />
                    {message.parts
                      .filter((part): part is Extract<MessagePart, { type: 'source-url' }> => part.type === 'source-url')
                      .map((part, i) => (
                        <SourcesContent key={`${message.id}-source-${i}`}>
                          <Source href={part.url} title={part.url} />
                        </SourcesContent>
                      ))}
                  </Sources>
                )}

              {message.parts.map((part, partIndex) => {
                switch (part.type) {
                  case 'text':
                    return (
                      <Fragment key={`${message.id}-${partIndex}`}>
                        <Message from={message.role}>
                          <MessageContent from={message.role}>
                            <Response>{part.text}</Response>
                          </MessageContent>
                        </Message>
                        {message.role === 'assistant' &&
                          latestAssistantMessage?.id === message.id &&
                          partIndex === message.parts.length - 1 && (
                            <Actions className="mt-2">
                              <Action label="Retry" onClick={() => handleRetry()}>
                                <RefreshCcwIcon className="h-3 w-3" />
                              </Action>
                              <Action
                                label="Copy"
                                onClick={() => navigator.clipboard.writeText(part.text)}
                              >
                                <CopyIcon className="h-3 w-3" />
                              </Action>
                            </Actions>
                          )}
                      </Fragment>
                    );
                  case 'reasoning':
                    return (
                      <Reasoning
                        key={`${message.id}-${partIndex}`}
                        className="w-full"
                        isStreaming={status === 'streaming' && index === normalizedMessages.length - 1}
                      >
                        <ReasoningTrigger />
                        <ReasoningContent>{part.text}</ReasoningContent>
                      </Reasoning>
                    );
                  case 'source-url':
                    return null;
                  default:
                    return null;
                }
              })}
            </div>
          ))}
          {status === 'submitted' && <Loader />}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput onSubmit={handleSubmit} className="mt-4" globalDrop multiple>
        <PromptInputBody>
          <PromptInputAttachments>
            {(attachment) => <PromptInputAttachment data={attachment} />}
          </PromptInputAttachments>
          <PromptInputTextarea onChange={(event) => setInput(event.target.value)} value={input} />
        </PromptInputBody>
        <PromptInputToolbar>
          <PromptInputTools />
          <PromptInputSubmit status={status} />
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );
}
