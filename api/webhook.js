import axios from "axios";

export default async function handler(req, res) {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  const TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

  // Handle Webhook Verification (GET)
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    } else {
      return res.status(403).send("Verification failed");
    }
  }

  // Handle Incoming Webhook Messages (POST)
  if (req.method === "POST") {
    console.log("POST RECEIVED:", JSON.stringify(req.body, null, 2));

    try {
      const message =
        req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

      if (message) {
        const from = message.from;
        const text = message.text?.body;

        await axios.post(
          `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: "whatsapp",
            to: from,
            type: "text",
            text: { body: `You said: ${text}` }
          },
          {
            headers: {
              Authorization: `Bearer ${TOKEN}`,
              "Content-Type": "application/json"
            }
          }
        );
      }

      return res.status(200).send("EVENT_RECEIVED");
    } catch (err) {
      console.error("Error sending reply:", err);
      return res.status(500).send("Server Error");
    }
  }

  res.status(404).send("Not Found");
}
