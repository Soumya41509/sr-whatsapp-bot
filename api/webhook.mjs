export default async function handler(req, res) {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  const TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

  // -------------------------
  // Webhook GET Verification
  // -------------------------
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const challenge = req.query["hub.challenge"];
    const token = req.query["hub.verify_token"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK VERIFIED");
      return res.status(200).send(challenge);
    }

    return res.status(403).send("Verification failed");
  }

  // -------------------------
  // Handle Incoming Messages
  // -------------------------
  if (req.method === "POST") {
    try {
      console.log("POST RECEIVED:", JSON.stringify(req.body, null, 2));

      const entry = req.body.entry?.[0];
      const changes = entry?.changes?.[0];
      const message = changes?.value?.messages?.[0];

      // If no actual message → ignore
      if (!message || !message.from) {
        return res.status(200).send("NO_MESSAGE");
      }

      const from = message.from;
      const text = message.text?.body || "";

      // -------------------------
      // Send Reply using fetch
      // -------------------------
      await fetch(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: from,
          type: "text",
          text: { body: `You said: ${text}` }
        })
      });

      return res.status(200).send("EVENT_RECEIVED");
    } catch (error) {
      console.error("Reply error:", error);
      return res.status(500).send("Server Error");
    }
  }

  // -------------------------
  // Unknown Route
  // -------------------------
  return res.status(404).send("Not Found");
}
