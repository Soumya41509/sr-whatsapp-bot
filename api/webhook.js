// ==========================
//  WHATSAPP BOT — FINAL VERSION
//  Multi-user, Separate Data, Smart Chat, Reminder Parsing
// ==========================

// ▪ Authorized numbers ONLY
const USERS = {
  "918917472082": {
    name: "Soumya",
    storage: {}      // yaha user-specific data store hoga
  },
  "917848850967": {
    name: "Friend",
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
        // ❌ BLOCK UNAUTHORIZED USERS
        // ==========================
        if (!USERS[normalized]) {
          console.log("❌ Not allowed:", from);
          return res.status(200).send("IGNORED");
        }

        const user = USERS[normalized];
        console.log(`✔ Allowed user: ${user.name} (${from}) → ${text}`);

        // ==========================
        // 🔵 SMART REPLY LOGIC
        // ==========================
        let reply = handleSmartReply(user, text);

        // ==========================
        // 🟢 SEND MESSAGE BACK
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
// 🔥 MAIN BRAIN — USER-SPECIFIC CHAT & REMINDER HANDLING
// =======================================================
function handleSmartReply(user, text) {

  // ==========================
  // 1) GREETING
  // ==========================
  if (/hi|hello|hey/i.test(text)) {
    return `Hello ${user.name}! 👋  
Bol bata kya kaam hai?`;
  }

  // ==========================
  // 2) REMINDER PARSER
  // ==========================
  if (text.toLowerCase().startsWith("remind:")) {

    const parts = text.replace("remind:", "").trim().split(",");
    const reminderTime = parts[0]?.trim();
    const reminderTask = parts[1]?.trim();

    if (reminderTime && reminderTask) {
      // store user-specific reminder
      user.storage.lastReminder = {
        time: reminderTime,
        task: reminderTask,
        created: Date.now()
      };

      return `⏰ *Reminder Added!*  
Time: *${reminderTime}*  
Task: *${reminderTask}*  
(Bhai abhi ye save ho gaya — actual trigger n8n se hoga 🎯)`;
    }

    return "Format galat hai bhai 🤦‍♂️\nUse:  
*remind: 5pm, pani peena* 💧";
  }

  // ==========================
  // 3) USER-SPECIFIC DATA TESTING
  // ==========================
  if (text === "last reminder") {
    if (user.storage.lastReminder) {
      const r = user.storage.lastReminder;
      return `📝 *Your Last Reminder*\nTime: ${r.time}\nTask: ${r.task}`;
    }
    return "Koi reminder saved nahi hai bhai!";
  }

  // ==========================
  // 4) DEFAULT REPLY
  // ==========================
  return `${user.name}, you said: ${text}`;
}
