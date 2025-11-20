// ==========================
//  WHATSAPP BOT — FINAL VERSION (Soumyaranjan + Sitesh)
//  Multi-user, Personalized Replies, Reminders, Smart Chat
// ==========================

// ▪ Authorized users
const USERS = {
  "918917472082": {
    name: "Soumyaranjan",
    storage: {}      // yaha user-specific data store hoga
  },
  "917848850967": {
    name: "Sitesh",
    storage: {}
  }
};

export default async function handler(req, res) {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  const TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

  // ==========================
  // 🔵 WEBHOOK VERIFICATION (GET)
  // ==========================
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Verification failed");
  }

  // ==========================
  // 🟢 INCOMING MESSAGE (POST)
  // ==========================
  if (req.method === "POST") {
    try {
      const body = req.body;
      console.log("POST RECEIVED:", JSON.stringify(body, null, 2));

      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const message = changes?.value?.messages?.[0];

      if (message) {
        const from = message.from;
        const normalized = from.replace(/[^0-9]/g, "");
        const text = message.text?.body?.trim() || "";

        // ==========================
        // ❌ BLOCK OTHERS
        // ==========================
        if (!USERS[normalized]) {
          console.log("❌ Not allowed:", from);
          return res.status(200).send("IGNORED");
        }

        const user = USERS[normalized];
        console.log(`✔ Allowed user: ${user.name} (${from}) → ${text}`);

        // ==========================
        // SMART REPLY
        // ==========================
        let reply = handleSmartReply(user, text);

        // ==========================
        // SEND REPLY
        // ==========================
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
              text: { body: reply },
            }),
          }
        );
      }

      return res.status(200).send("EVENT_RECEIVED");
    } catch (err) {
      console.error("Reply error:", err);
      return res.status(500).send("SERVER ERROR");
    }
  }

  return res.status(404).send("Not Found");
}

// =======================================================
// 🔥 SMART REPLY BRAIN
// =======================================================
function handleSmartReply(user, text) {

  // ==========================
  // 1) Greetings (SPECIAL)
  // ==========================
  if (/^(hi|hello|hey)$/i.test(text)) {
    return `Hello ${user.name}! 👋\nHow can I help you?`;
  }

  // ==========================
  // 2) THANK YOU reply
  // ==========================
  if (/thank/i.test(text)) {
    return `Always here for you, ${user.name}! 🤝`;
  }

  // ==========================
  // 3) REMINDER PARSING (natural language)
  // ==========================
  const reminderRegex = /(remind|reminder).*?(at|@)?\s*([0-9:apm ]+)\s*(to|for)?\s*(.*)/i;
  const match = text.match(reminderRegex);

  if (match) {
    const time = match[3]?.trim();
    const task = match[5]?.trim();

    if (time && task) {
      // SAVE user-specific reminder
      user.storage.lastReminder = {
        time,
        task,
        created: Date.now()
      };

      return `⏰ Reminder set successfully!\nTime: *${time}*\nTask: *${task}*\n(I will trigger through n8n)`;
    }
  }

  // ==========================
  // 4) Show last reminder
  // ==========================
  if (text.toLowerCase() === "last reminder") {
    if (user.storage.lastReminder) {
      const r = user.storage.lastReminder;
      return `📝 Your last saved reminder:\nTime: *${r.time}*\nTask: *${r.task}*`;
    }
    return `Koi reminder saved nahi hai ${user.name}!`;
  }

  // ==========================
  // 5) DEFAULT PERSONALIZED REPLY
  // ==========================
  return `${user.name}, you said: ${text}`;
}
