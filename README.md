# WhatsApp Cloud API Bot for Seven Kids Code Foundation

Express.js WhatsApp bot with knowledge-grounded replies powered by Google Gemini.

## Features

- **Knowledge-grounded responses**: Replies are strictly based on `knowledge.txt` — no general knowledge or trivia
- **Keyword fast-path**: Instant replies for greetings, enrollment/pricing info, and teacher handoff requests
- **Off-topic detection**: Politely redirects parents/kids asking unrelated questions
- **Teacher handoff**: Detects when questions aren't covered and notifies teachers
- **Word-boundary matching**: Prevents false positives (e.g., "chance" won't trigger "call" handler, "this" won't trigger "hi" greeting)

## Environment Variables

Configure these in Railway (or your `.env` file for local development):

### Required
- `WHATSAPP_TOKEN` — WhatsApp Cloud API access token
- `PHONE_NUMBER_ID` — WhatsApp phone number ID
- `GEMINI_API_KEY` — Google Gemini API key

### Optional
- `VERIFY_TOKEN` — Webhook verification token (default: `secagent_verify`)
- `GEMINI_MODEL` — Gemini model name (default: `gemini-3.5-flash-lite`)
- `SAMPLE_IMAGE_URL` — Sample image URL (if using image replies)
- `STAFF_WHATSAPP` — Teacher WhatsApp number (E.164 format, e.g., `233501234567`) for NEED_HUMAN notifications
- `PORT` — Server port (default: `3000`)

## Knowledge Base

Edit `knowledge.txt` to update program information, classes, locations, and contact details. The bot will:
- Answer only from the knowledge base
- Redirect off-topic questions
- Trigger teacher handoff for uncovered program questions

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

1. **Keyword Path**: Fast replies for common patterns (greetings, enrollment info, teacher handoff)
2. **Gemini Path**: Knowledge-grounded replies using Gemini with strict system instructions
3. **Fallback**: Generic help message if both paths fail

### Response Flow

- **OFF_TOPIC**: Parent/kid asks trivia/general knowledge → polite redirect
- **NEED_HUMAN**: Program question not in knowledge base → teacher notification + handoff message
- **ANSWER**: Question covered in knowledge base → direct answer (1-3 sentences)

## Support

For questions about Seven Kids Code Foundation, visit sevenkidscodefoundation.org or contact info@sevenkidscodefoundation.org
