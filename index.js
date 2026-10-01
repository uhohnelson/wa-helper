import express from "express";

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "secagent_verify";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || "";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "";
const SAMPLE_IMAGE_URL = process.env.SAMPLE_IMAGE_URL || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BUSINESS_CONTEXT = `
You are the WhatsApp assistant for Eighties Multimedia (also called 8 Multimedia).
Based in Tema, Greater Accra, Ghana. Website: eightmultimedia.com
Services: graphic design (logos, branding, posters, flyers, packaging, corporate identity),
video editing and production, website development, and audio (jingles, voice, sound).
Rules:
- Keep replies short (1-3 short sentences). Plain English.
- Never invent exact prices. For pricing, ask for the job, deadline, and brief, then say a team member will quote.
- If they want a human, say someone will continue here shortly.
- Do not claim services you do not offer.
- Be friendly and professional.
`.trim();

async function waSend(body) {
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
    }
  );
  if (!res.ok) console.error("WA send failed", res.status, await res.text());
}

async function showTyping(messageId) {
  await waSend({
    status: "read",
    message_id: messageId,
    typing_indicator: { type: "text" },
  });
}

async function sendText(to, text) {
  await waSend({ to, type: "text", text: { body: text } });
}

async function sendImage(to, imageUrl, caption) {
  await waSend({
    to,
    type: "image",
    image: { link: imageUrl, ...(caption ? { caption } : {}) },
  });
}

async function askGemini(userText) {
  if (!GEMINI_API_KEY) return null;
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${BUSINESS_CONTEXT}\n\nCustomer message:\n${userText}\n\nReply as the assistant only.`,
            },
          ],
        },
      ],
      generationConfig: { temperature: 0.4, maxOutputTokens: 180 },
    }),
  });
  if (!res.ok) {
    console.error("Gemini failed", res.status, await res.text());
    return null;
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
}

function keywordReply(text) {
  let reply = null;
  let sendSampleImage = false;

  if (
    text.includes("hi") ||
    text.includes("hello") ||
    text.includes("hey") ||
    text.includes("good morning") ||
    text.includes("good evening")
  ) {
    reply =
      "Hi, welcome to Eighties Multimedia. We do graphic design, video editing and production, website development, and audio. What can we help you with today?";
  } else if (
    text.includes("price") ||
    text.includes("cost") ||
    text.includes("how much") ||
    text.includes("quote") ||
    text.includes("rate")
  ) {
    reply =
      "Happy to help with a quote. Tell me the job (design, video, website, or audio), your deadline, and a short brief. A team member will follow up with pricing.";
  } else if (
    text.includes("human") ||
    text.includes("person") ||
    text.includes("call") ||
    text.includes("agent") ||
    text.includes("talk") ||
    text.includes("staff")
  ) {
    reply =
      "No problem. Someone from Eighties Multimedia will continue with you here shortly.";
  } else if (
    text.includes("portfolio") ||
    text.includes("sample") ||
    text.includes("example") ||
    text.includes("picture")
  ) {
    reply =
      "Here is a sample of our work. You can also browse more at eightmultimedia.com. Which service are you interested in?";
    sendSampleImage = true;
  }

  return { reply, sendSampleImage };
}

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  res.sendStatus(200);
  try {
    const change = req.body?.entry?.[0]?.changes?.[0]?.value;
    const msg = change?.messages?.[0];
    if (!msg || !WHATSAPP_TOKEN || !PHONE_NUMBER_ID) return;

    const to = msg.from;
    const raw = (msg.text?.body || "").trim();
    const text = raw.toLowerCase();
    if (!raw) return;

    await showTyping(msg.id);
    await sleep(900);

    const keyed = keywordReply(text);
    let reply = keyed.reply;

    if (!reply) {
      reply = await askGemini(raw);
    }
    if (!reply) {
      reply =
        "Thanks for messaging Eighties Multimedia. Tell me if you need design, video, a website, or audio, and I will help.";
    }

    if (keyed.sendSampleImage && SAMPLE_IMAGE_URL) {
      await sendImage(to, SAMPLE_IMAGE_URL, reply);
    } else {
      await sendText(to, reply);
    }
  } catch (e) {
    console.error(e);
  }
});

app.get("/", (_req, res) => res.send("ok"));
app.listen(process.env.PORT || 3000, () => console.log("listening"));
