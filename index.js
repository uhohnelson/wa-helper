import express from "express";
import { readFileSync } from "fs";

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "secagent_verify";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || "";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "";
const SAMPLE_IMAGE_URL = process.env.SAMPLE_IMAGE_URL || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const STAFF_WHATSAPP = process.env.STAFF_WHATSAPP || "";

let KNOWLEDGE_BASE = "";
try {
  KNOWLEDGE_BASE = readFileSync("./knowledge.txt", "utf-8").trim();
  console.log("✓ Loaded knowledge.txt");
} catch (err) {
  console.warn("⚠ knowledge.txt not found, using fallback");
  KNOWLEDGE_BASE = `
Seven Kids Code Foundation is a kids coding and robotics program in Ghana.
Website: sevenkidscodefoundation.org
Programs: Python, Scratch, Roblox, Arduino, Blender, Robotics, AI, Web Development, Game Development.
Centers: Tema (Community 11) and Mataheko.
Contact: info@sevenkidscodefoundation.org, Tema: 030 395 5148, Mataheko: 030 332 3844.
  `.trim();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SYSTEM_INSTRUCTION = `
You are the WhatsApp assistant for Seven Kids Code Foundation — a kids coding and robotics program.

KNOWLEDGE BASE:
${KNOWLEDGE_BASE}

STRICT RULES:
1. Answer ONLY using information from the KNOWLEDGE BASE above.
2. If the customer asks about something unrelated to Seven Kids Code Foundation or kids coding/robotics (trivia, news, homework, general knowledge, or any topic not in the knowledge base), politely redirect them by saying you only help with Seven Kids Code.
3. If the customer asks about the program but the information is not in the knowledge base, output exactly "NEED_HUMAN" as your complete response.
4. NEVER invent fees, ages, enrollment details, class schedules, or program specifics not mentioned in the knowledge base.
5. Keep replies short (1-3 sentences maximum). Use plain, warm, friendly language for parents and kids.
6. Never answer questions about world events, history, science, math, or any general knowledge topics.
`.trim();

const OFF_TOPIC_REDIRECT = "I'm only here for Seven Kids Code — kids coding. What do you need?";

const NEED_HUMAN_MESSAGE = "Let me connect you with one of our teachers. They'll continue with you here shortly.";

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

async function notifyStaff(customerNumber, messageSnippet) {
  if (!STAFF_WHATSAPP) {
    console.log(`NEED_HUMAN from ${customerNumber}: ${messageSnippet}`);
    return;
  }
  try {
    const staffMessage = `🔔 Customer needs assistance\nFrom: ${customerNumber}\nMessage: "${messageSnippet.substring(0, 100)}"`;
    await sendText(STAFF_WHATSAPP, staffMessage);
    console.log(`Notified staff at ${STAFF_WHATSAPP}`);
  } catch (err) {
    console.error("Failed to notify staff:", err);
  }
}

async function askGemini(userText) {
  if (!GEMINI_API_KEY) return null;
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userText }],
        },
      ],
      generationConfig: { temperature: 0.3, maxOutputTokens: 180 },
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

  const hasWord = (word) => new RegExp(`\\b${word}\\b`, "i").test(text);
  
  // Greeting: only trigger on short messages or clear greeting patterns
  const isGreeting = (
    (text.length < 20 && (hasWord("hi") || hasWord("hello") || hasWord("hey"))) ||
    text.match(/^(hi|hello|hey|good morning|good evening|good afternoon)/i) ||
    text === "hi" || text === "hello" || text === "hey"
  );

  if (isGreeting) {
    reply =
      "Hi! Welcome to Seven Kids Code Foundation. We teach kids coding, robotics, and tech skills. How can I help you today?";
  } else if (
    hasWord("price") ||
    hasWord("cost") ||
    hasWord("fee") ||
    text.includes("how much") ||
    hasWord("quote") ||
    hasWord("rate")
  ) {
    reply =
      "For class fees, schedules, and enrollment info, email info@sevenkidscodefoundation.org or call us (Tema: 030 395 5148, Mataheko: 030 332 3844). One of our teachers will help you.";
  } else if (
    hasWord("human") ||
    hasWord("person") ||
    hasWord("call") ||
    hasWord("agent") ||
    hasWord("teacher") ||
    hasWord("talk") ||
    hasWord("staff")
  ) {
    reply =
      "No problem. One of our teachers will continue with you here shortly.";
  } else if (
    hasWord("program") ||
    hasWord("class") ||
    hasWord("course") ||
    hasWord("teach") ||
    hasWord("learn")
  ) {
    reply =
      "We teach Python, Scratch, Roblox, Arduino, Blender, Robotics, AI, and more! Check sevenkidscodefoundation.org or ask me what you'd like to know.";
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
      const geminiResponse = await askGemini(raw);
      
      if (geminiResponse) {
        if (geminiResponse.includes("NEED_HUMAN")) {
          reply = NEED_HUMAN_MESSAGE;
          await notifyStaff(to, raw);
        } else if (
          geminiResponse.toLowerCase().includes("i only help") ||
          geminiResponse.toLowerCase().includes("i help with eighties multimedia") ||
          geminiResponse.toLowerCase().includes("unrelated")
        ) {
          reply = OFF_TOPIC_REDIRECT;
        } else {
          reply = geminiResponse;
        }
      }
    }

    if (!reply) {
      reply =
        "Hi! I'm here to help with Seven Kids Code. Ask me about our coding programs, robotics classes, or how to enroll!";
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
