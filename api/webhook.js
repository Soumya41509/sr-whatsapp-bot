// =======================================================
//  WHATSAPP BOT — COMMONJS VERSION (VERCEL SAFE)
// =======================================================

// ✔ Fetch for Node.js (CommonJS Compatible)
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// ✔ Allowed users
const USERS = {
  "918917472082": { name: "Soumyaranjan", storage: {} },
  "917848850967": { name: "Sitesh", storage: {} }
};

// EXPORT USING COMMONJS
module.exports = async function handler(req, res) {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  const TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

  // =======================================================
  // WEBHOOK VERIFICATION (GET)
  // =======================================================
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }

    return res.status(403).send("Verification failed");
  }

  // =======================================================
  // HANDLE POST (MESSAGES)
  // =======================================================
  if (req.method === "POST") {
    try {
      const entry = req.body.entry?.[0];
      const changes = entry?.changes?.[0];
      const message = changes?.value?.messages?.[0];

      if (!message) {
        return res.status(200).send("NO_MESSAGE");
      }

      const from = message.from;
      const number = from.replace(/[^0-9]/g, "");
      const text = message.text?.body?.trim() || "";

      // User not allowed
      if (!USERS[number]) {
        console.log("❌ Unauthorized user:", number);
        return res.status(200).send("IGNORED");
      }

      const user = USERS[number];

      // Generate smart reply
      const reply = generateReply(user, text);

      // SEND REPLY
      await fetch(
        `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: from,
            type: "text",
            text: { body: reply }
          })
        }
      );

      return res.status(200).send("EVENT_RECEIVED");
    } catch (err) {
      console.error("❌ SERVER ERROR:", err);
      return res.status(500).send("SERVER ERROR");
    }
  }

  res.status(404).send("Not Found");
};

// =======================================================
// SMART REPLY SYSTEM
// =======================================================

function generateReply(user, text) {
  const lower = text.toLowerCase();

  // GREETING
  if (/^(hi|hello|hey|hii|hiii)$/i.test(text)) {
    return `Hello ${user.name}! 👋\nHow can I help you today?`;
  }

  // THANK YOU
  if (lower.includes("thank")) {
    return `Always here for you, ${user.name}! 🤝`;
  }

  // NATURAL REMINDER PARSER
  const regex =
    /(remind|reminder).*?(at|@)?\s*([0-9:.apm ]+)\s*(to|for)?\s*(.*)/i;

  const match = text.match(regex);

  if (match) {
    const time = match[3]?.trim();
    const task = match[5]?.trim();

    if (time && task) {
      user.storage.lastReminder = { time, task, created: Date.now() };

      return `⏰ *Reminder set!*\nTime: *${time}*\nTask: *${task}*`;
    }

    return `Format sahi nahi hai ${user.name}.\nUse:\nremind me at 8pm to drink water`;
  }

  // LAST REMINDER
  if (lower === "last reminder") {
    if (user.storage.lastReminder) {
      const r = user.storage.lastReminder;
      return `📝 *Last Reminder:*\nTime: *${r.time}*\nTask: *${r.task}*`;
    }
    return `Koi reminder saved nahi hai ${user.name}!`;
  }

  // DEFAULT REPLY
  return `${user.name}, you said: ${text}`;
}
