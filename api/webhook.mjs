export default async function handler(req, res) {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  const TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

  // -----------------------------
  // 1. Webhook Verification (GET)
  // -----------------------------
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const challenge = req.query["hub.challenge"];
    const token = req.query["hub.verify_token"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verified successfully!");
      res.status(200).send(challenge);
      return;
    } else {
      res.status(403).send("Verification failed");
      return;
    }
  }

  // -----------------------------
  // 2. Incoming Messages (POST)
  // -----------------------------
  if (req.method === "POST") {
    try {
      console.log("POST RECEIVED:", JSON.stringify(req.body, null, 2));

      const entry = req.body.entry?.[0];
      const changes = entry?.changes?.[0];
      const message = changes?.value?.messages?.[0];

      if (!message) {
        console.log("No message field found");
        res.status(200).send("NO_MESSAGE");
        return;
      }

      const from = message.from;
      const text = message.text?.body || "";

      // -----------------------------
      // SEND REPLY
      // -----------------------------
      const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;

      const payload = {
        messaging_product: "whatsapp",
        to: from,
        type: "text",
        text: { body: `You said: ${text}` }
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      console.log("WHATSAPP API RESPONSE:", result);

      res.status(200).send("EVENT_RECEIVED");
      return;
    } catch (error) {
      console.error("ERROR:", error);
      res.status(500).send("SERVER ERROR");
      return;
    }
  }

  // -----------------------------
  // 3. Other Methods
  // -----------------------------
  res.status(404).send("Not Found");
}
