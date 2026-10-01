import express from "express";

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "secagent_verify";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || "";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "";

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
    const text = (msg.text?.body || "").trim().toLowerCase();
    const reply =
      text.includes("price") || text.includes("cost")
        ? "Thanks. Tell me what service you need and I will share prices."
        : text.includes("hello") || text === "hi"
          ? "Hi. How can I help you today?"
          : "Thanks for your message. A person will follow up soon.";

    await fetch(
      `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: reply },
        }),
      }
    );
  } catch (e) {
    console.error(e);
  }
});

app.get("/", (_req, res) => res.send("ok"));
app.listen(process.env.PORT || 3000, () => console.log("listening"));
