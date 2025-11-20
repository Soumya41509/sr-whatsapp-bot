// ✅ Allowed users – ONLY these two numbers will get bot replies
const ALLOWED_NUMBERS = [
  "918917472082",
  "917848850967"
];

export default async function handler(req, res) {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  const TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

  // 🔵 Webhook Verification (GET)
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }

    return res.status(403).send("Verification failed");
  }

  // 🟢 Handle Incoming Messages (POST)
  if (req.method === "POST") {
    console.log("POST RECEIVED:", JSON.stringify(req.body, null, 2));

    try {
      const entry = req.body.entry?.[0];
      const changes = entry?.changes?.[0];
      const message = changes?.value?.messages?.[0];

      if (message) {
        const from = message.from;              // Sender phone number
        const text = message.text?.body || "";  // Message body

        // 🚫 If sender is NOT allowed → ignore completely
        const normalized = from.replace(/[^0-9]/g, "");
        if (!ALLOWED_NUMBERS.includes(normalized)) {
          console.log("❌ Not allowed:", from);
          return res.status(200).send("IGNORED");
        }

        console.log("✔ Allowed user:", from, "→", text);

        // 🟢 Send reply
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
              text: { body: `You said: ${text}` },
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

  res.status(404).send("Not Found");
}
