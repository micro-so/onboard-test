## Playful CLI Agent (OpenAI Responses API)

Run a lighthearted CLI chat agent using the OpenAI Responses API. Supports streaming output and optional persistent conversation id.

### Prerequisites
- Node.js 18+

### Setup
1. Install deps:
   ```bash
   npm install
   ```
2. Copy env file and set your key:
   ```bash
   cp .env.example .env
   # edit .env to set OPENAI_API_KEY
   ```
   Optional: set `OPENAI_MODEL` (default: `gpt-4o-mini`) and `CONVERSATION_ID` to persist server-side memory.

### Dev
```bash
npm run dev
```

### Build & Run
```bash
npm run build
npm start
```

### Notes
- Keep your API key private. Do not commit `.env`.
- Memory: The agent uses the Conversations API. On first run it creates a conversation (seeded with the playful system prompt) and saves the id in `.openai_conversation_id`. Subsequent runs reuse it. You can also pre-set `CONVERSATION_ID` to force a specific one.
- Commands: type `/id` to print the current conversation id, `/reset` to start a new conversation and replace the saved id.


