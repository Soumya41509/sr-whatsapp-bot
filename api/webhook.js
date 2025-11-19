import axios from "axios";

export default async function handler(req, res) {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

  // ------------------------------
  // 1) Webhook Verification (GET)
  // ------------------------------
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verified successfully.");
      return res.status(200).send(challenge);
    } else {
      console.log("Webhook verification failed.");
      return res.sendStatus(403);
    }
  }

  // ------------------------------
  // 2) Receive Incoming Messages (POST)
  // ------------------------------
  if (req.method === "POST") {
    try {
      const body = req.body;
      console.log("POST RECEIVED:", JSON.stringify(body, null, 2));

      // Check if incoming message exists
      if (
        body.object === "whatsapp_business_account" &&
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const msg = body.entry[0].changes[0].value.messages[0];
        const from = msg.from; // sender number
        const text = msg.text?.body || ""; // incoming text

        console.log("User:", from, "Message:", text);

        // ------------------------------
        // 3) SEND AUTO-REPLY
        // ------------------------------
        await axios.post(
          `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: "whatsapp",
            to: from,
            type: "text",
            text: {
              body: `Bot is live! 👋\nYour message: ${text}`,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${WHATSAPP_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );

        console.log("Reply sent successfully!");
      }

      return res.status(200).send("OK");
    } catch (error) {
      console.error("Error in POST handler:", error?.response?.data || error);
      return res.status(500).send("Error");
    }
  }

  // ------------------------------
  // 4) Default (wrong method)
  // ------------------------------
  return res.status(404).send("Not Found");
}
