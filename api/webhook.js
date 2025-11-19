const axios = require("axios");

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

module.exports = async (req, res) => {
  // ✅ STEP 1: Webhook verification (GET request)
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook verified by Meta");
      return res.status(200).send(challenge);
    } else {
      console.log("❌ Webhook verification failed");
      return res.sendStatus(403);
    }
  }

  // ✅ STEP 2: Incoming message handler (POST request)
  if (req.method === "POST") {
    try {
      const body = req.body;

      if (
        body.object === "whatsapp_business_account" &&
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const message = body.entry[0].changes[0].value.messages[0];
        const from = message.from; // user number
        const text = message.text?.body || "";

        console.log("📩 New message from:", from, "text:", text);

        await sendWhatsAppMessage(
          from,
          "Bot is live! 👋\nYour message: " + text
        );
      }

      return res.sendStatus(200);
    } catch (err) {
      console.error("Error handling webhook:", err);
      return res.sendStatus(500);
    }
  }

  // Any other method
  return res.sendStatus(404);
};

async function sendWhatsAppMessage(to, message) {
  const url = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;

  try {
    await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("✅ Message sent to", to);
  } catch (err) {
    console.error(
      "Error sending message:",
      err.response?.data || err.message
    );
  }
}
