import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const { messages } = body;

  const lastMessage = messages?.at?.(-1)?.content ?? '';
  const reply =
    typeof lastMessage === 'string' && lastMessage.trim().length > 0
      ? `You said: ${lastMessage}`
      : 'Hello from the mock API!';

  return NextResponse.json({
    id: 'mock-response',
    role: 'assistant',
    content: reply,
  });
}
