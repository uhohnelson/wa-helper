# WhatsApp Cloud API Bot for Eighties Multimedia

Express.js WhatsApp bot with knowledge-grounded replies powered by Google Gemini.

## Features

- **Knowledge-grounded responses**: Replies are strictly based on `knowledge.txt` — no general knowledge or trivia
- **Keyword fast-path**: Instant replies for greetings, pricing, portfolio, and human handoff requests
- **Off-topic detection**: Politely redirects customers asking unrelated questions
- **Human handoff**: Detects when questions aren't covered and notifies staff
- **Word-boundary matching**: Prevents false positives (e.g., "chance" won't trigger "call" handler)

## Environment Variables

Configure these in Railway (or your `.env` file for local development):

### Required
- `WHATSAPP_TOKEN` — WhatsApp Cloud API access token
- `PHONE_NUMBER_ID` — WhatsApp phone number ID
- `GEMINI_API_KEY` — Google Gemini API key

### Optional
- `VERIFY_TOKEN` — Webhook verification token (default: `secagent_verify`)
- `GEMINI_MODEL` — Gemini model name (default: `gemini-3.5-flash-lite`)
- `SAMPLE_IMAGE_URL` — Portfolio image URL (sent with portfolio requests)
- `STAFF_WHATSAPP` — Staff WhatsApp number (E.164 format, e.g., `233501234567`) for NEED_HUMAN notifications
- `PORT` — Server port (default: `3000`)

## Knowledge Base

Edit `knowledge.txt` to update business information, services, and policies. The bot will:
- Answer only from the knowledge base
- Redirect off-topic questions
- Trigger human handoff for uncovered business questions

## Deployment

This bot is designed for Railway:

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Railway will automatically deploy on push to `main`

## Local Development

```bash
npm install
node index.js
```

Set up ngrok or a similar tunnel for WhatsApp webhook testing.

## How It Works

1. **Keyword Path**: Fast replies for common patterns (greetings, pricing, portfolio, human)
2. **Gemini Path**: Knowledge-grounded replies using Gemini with strict system instructions
3. **Fallback**: Generic help message if both paths fail

### Response Flow

- **OFF_TOPIC**: Customer asks trivia/general knowledge → polite redirect
- **NEED_HUMAN**: Business question not in knowledge base → staff notification + handoff message
- **ANSWER**: Question covered in knowledge base → direct answer (1-3 sentences)

## Support

For issues or questions, contact Eighties Multimedia at eightmultimedia.com
