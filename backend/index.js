import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// POST /chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array required" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });

    const reply = completion.choices?.[0]?.message?.content ?? "";
    res.json({ reply, raw: completion });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "OpenAI API error", details: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("OpenAI Chatbot Backend is running.");
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});