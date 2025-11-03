import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Facebook webhook баталгаажуулалт
app.get("/webhook", (req, res) => {
  if (req.query["hub.verify_token"] === "VERIFY_TOKEN") {
    res.send(req.query["hub.challenge"]);
  } else {
    res.send("Invalid verify token");
  }
});

// Хэрэглэгчийн мессеж ирэх үед
app.post("/webhook", async (req, res) => {
  const message = req.body.entry?.[0]?.messaging?.[0];
  const senderId = message?.sender?.id;
  const text = message?.message?.text;

  if (text) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: text }],
      }),
    });
    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Би ойлгосонгүй.";

    await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: senderId },
        message: { text: reply },
      }),
    });
  }
  res.sendStatus(200);
});

app.listen(3000, () => console.log("Server is running on port 3000"));
