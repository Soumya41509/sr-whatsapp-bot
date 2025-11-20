// =======================================================
//  WHATSAPP BOT — FINAL VERSION (Multi-user + Smart AI Replies)
//  Users: Soumyaranjan (918917472082), Sitesh (917848850967)
// =======================================================

// ALLOWED USERS WITH SEPARATE STORAGE
const USERS = {
  "918917472082": {
    name: "Soumyaranjan",
    storage: {}
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
  // INCOMING MESSAGE (POST)
  // =======================================================
  if (req.method === "POST") {
    try {
      const entry = req.body.entry?.[0];
      const changes = entry?.changes?.[0];
      const message = changes?.value?.messages?.[0];

      if (message) {
        const from = message.from;
        const number = from.replace(/[^0-9]/g, "");
        const text = message.text?.body?.trim() || "";

        // ONLY ALLOWED USERS
        if (!USERS[number]) {
          console.log("❌ Unauthorized user:", number);
          return res.status(200).send("IGNORED");
        }

        const user = USERS[number];
        console.log(`✔ Message received from ${user.name}: ${text}`);

        // GENERATE SMART REPLY
        const reply = handleSmartReply(user, text);

        // SEND MESSAGE
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
// SMART AI REPLY SYSTEM
// =======================================================
function handleSmartReply(user, text) {
  const lower = text.toLowerCase();

  // 1) Greetings
  if (/^(hi|hello|hey|hii|hiii)$/i.test(text)) {
    return `Hello ${user.name}! 👋\nHow can I help you today?`;
  }

  // 2) Thank you response
  if (lower.includes("thank")) {
    return `Always here for you, ${user.name}! 🤝`;
  }

  // 3) Natural-language reminder parsing
  const reminderRegex =
    /(remind|reminder).*?(at|@)?\s*([0-9:.apm ]+)\s*(to|for)?\s*(.*)/i;

  const match = text.match(reminderRegex);

  if (match) {
    const time = match[3]?.trim();
    const task = match[5]?.trim();

    if (time && task) {
      user.storage.lastReminder = {
        time,
        task,
        created: Date.now(),
      };

      return `⏰ *Reminder set successfully!*\nTime: *${time}*\nTask: *${task}*\n(I will trigger it from automation flow)`;
    }

    return `Format thoda galat hai ${user.name}!\nUse like:\n*remind me at 5pm to drink water*`;
  }

  // 4) Show last reminder
  if (lower === "last reminder") {
    if (user.storage.lastReminder) {
      const r = user.storage.lastReminder;
      return `📝 *Your Last Reminder:*\nTime: *${r.time}*\nTask: *${r.task}*`;
    }
    return `No reminder saved yet, ${user.name}!`;
  }

  // 5) Default Personalized
  return `${user.name}, you said: ${text}`;
}
