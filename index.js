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

    let reply =
      "Thanks for messaging Eighties Multimedia. We help with graphic design, video, websites, and audio. Tell me which one you need.";

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
      text.includes("logo") ||
      text.includes("brand") ||
      text.includes("poster") ||
      text.includes("flyer") ||
      text.includes("graphic") ||
      text.includes("design") ||
      text.includes("packaging") ||
      text.includes("business card")
    ) {
      reply =
        "We handle graphic design and branding, from logos and flyers to packaging and corporate identity. What do you need designed, and when do you need it?";
    } else if (
      text.includes("video") ||
      text.includes("film") ||
      text.includes("edit") ||
      text.includes("shoot") ||
      text.includes("production")
    ) {
      reply =
        "We offer video editing and production for business and creative projects. Is this an edit of existing footage, a full shoot, or both?";
    } else if (
      text.includes("website") ||
      text.includes("web") ||
      text.includes("site") ||
      text.includes("app")
    ) {
      reply =
        "We build business websites. Is this a new site or a redesign of what you already have?";
    } else if (
      text.includes("audio") ||
      text.includes("sound") ||
      text.includes("jingle") ||
      text.includes("voice") ||
      text.includes("music") ||
      text.includes("podcast")
    ) {
      reply =
        "We do audio work for brands and productions. Tell me if you need a jingle, voice work, sound design, or something else.";
    } else if (
      text.includes("portfolio") ||
      text.includes("work") ||
      text.includes("sample") ||
      text.includes("example")
    ) {
      reply =
        "You can see samples of our work at eightmultimedia.com. Tell me which service you care about and I can point you the right way.";
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
      text.includes("location") ||
      text.includes("where") ||
      text.includes("tema") ||
      text.includes("accra") ||
      text.includes("address")
    ) {
      reply =
        "We are based in Tema, Greater Accra, and work with clients across Ghana. Share your project and we will guide you from there.";
    }

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
