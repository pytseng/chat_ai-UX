# SecretStash

Mobile-first chat PoC for travel & fashion styling, based on the [Figma design](https://www.figma.com/design/uhdU04wu6CwxM5YA6cvg7N/Cursor-Learning-File?node-id=184-524).

## Setup

```bash
npm install
cp .env.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local
npm run dev
```

Open http://localhost:5173 on your phone (same network) or resize the browser to mobile width.

## Stack

- **Frontend:** Vite + React + TypeScript
- **Backend:** Express proxy for Claude API (keeps API key off the client)
- **Model:** Claude Sonnet via streaming SSE
- **Web search:** Anthropic `web_search` for news/events (not weather)
- **Weather:** [Open-Meteo](https://open-meteo.com/) via `get_weather` tool — live outdoor forecasts with lat/lon + elevation support (no API key required)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API (3001) + Vite (5173) |
| `npm run build` | Production frontend build |
