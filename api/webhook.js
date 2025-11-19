export default function handler(req, res) {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  // For webhook verification
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    } else {
      return res.status(403).send("Failed");
    }
  }

  // For receiving webhook POST
  if (req.method === "POST") {
    console.log("POST RECEIVED:", req.body);
    return res.status(200).send("OK");
  }

  return res.status(404).send("Not Found");
}
