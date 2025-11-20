// =======================================================
//   WHATSAPP BOT — FINAL FULLY FIXED VERSION (PASTE THIS)
// =======================================================

// ✔ Fetch Fix for Vercel / Node
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// ✔ Allowed Users (Separate data per user)
const USERS = {
  "918917472082": { name: "Soumyaranjan", storage: {} },
  "917848850967": { name: "Sitesh", storage: {} }
};

export default async function handler(req, res) {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  const TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

  // =======================================================
  // WEBHOOK VERIFICATION (GET)
  // =======================================================
  if (req.method === "GET") {
    if (
      req.query["hub.mode"] === "subscribe" &&
      req.query["hub.verify_token"] === VERIFY_TOKEN
    ) {
      return res.status(200).send(req.query["hub.challenge"]);
    }
    return res.status(403).send("Verification failed");
  }

  // =======================================================
  // HANDLE POST / MESSAGES
  // =======================================================
  if (req.method === "POST") {
    try {
      const entry = req.body.entry?.[0];
      const changes = entry?.changes?.[0];
      const message = changes?.value?.messages?.[0];

      // No message received
      if (!message) {
        return res.status(200).send("NO_MESSAGE");
      }

      const from = message.from;
      const number = from.replace(/[^0-9]/g, "");
      const text = message.text?.body?.trim() || "";

      // Unknown user → ignore
      if (!USERS[number]) {
        console.log("❌ Unauthorized user:", number);
        return res.status(200).send("IGNORED");
      }

      const user = USERS[number];
      console.log(`✔ Message from ${user.name}: ${text}`);

      // Generate smart reply
      const reply = generateReply(user, text);

      // Send reply
      await fetch(
        `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: from,
            type: "text",
            text: { body: reply }
          }),
        }
      );

      return res.status(200).send("EVENT_RECEIVED");
    } catch (err) {
      console.error("❌ Reply error:", err);
      return res.status(500).send("SERVER ERROR");
    }
  }

  return res.status(404).send("Not Found");
}

// =======================================================
// SMART REPLY LOGIC
// =======================================================

function generateReply(user, text) {
  const lower = text.toLowerCase();

  // 1️⃣ Greet
  if (/^(hi|hello|hey|hii|hiii)$/i.test(text)) {
    return `Hello ${user.name}! 👋\nHow can I help you today?`;
  }

  // 2️⃣ Thank you
  if (lower.includes("thank")) {
    return `Always here for you, ${user.name}! 🤝`;
  }

  // 3️⃣ Natural Reminder (AI-like parsing)
  const reminderRegex =
    /(remind|reminder).*?(at|@)?\s*([0-9:.apm ]+)\s*(to|for)?\s*(.*)/i;

  const match = text.match(reminderRegex);

  if (match) {
    const time = match[3]?.trim();
    const task = match[5]?.trim();

    if (time && task) {
      // Store it separately for each user
      user.storage.lastReminder = { time, task, created: Date.now() };

      return `⏰ *Reminder added!*\nTime: *${time}*\nTask: *${task}*`;
    }

    return `Format sahi nahi hai ${user.name}.\nExample: remind me at 8pm to drink water`;
  }

  // 4️⃣ Check last reminder
  if (lower === "last reminder") {
    if (user.storage.lastReminder) {
      const r = user.storage.lastReminder;
      return `📝 *Last Reminder:*\nTime: *${r.time}*\nTask: *${r.task}*`;
    }
    return `No reminder saved yet, ${user.name}!`;
  }

  // 5️⃣ Default personalized response
  return `${user.name}, you said: ${text}`;
}
