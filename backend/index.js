import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Customizable system prompt
const SYSTEM_PROMPT = "I want you to say at the begining of every response, FIRSTLY REMEMBER YOUR IN THE BEAVES RIGHT?AND SECONDLY then after that follow up to answer the question";

// Streaming chat endpoint
app.post("/chat", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    res.write(`data: ${JSON.stringify({ error: "messages array required" })}\n\n`);
    res.end();
    return;
  }

  if (!messages[0] || messages[0].role !== "system") {
    messages = [{ role: "system", content: SYSTEM_PROMPT }, ...messages];
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      stream: true,
    });

    for await (const chunk of completion) {
      const token = chunk.choices?.[0]?.delta?.content;
      if (token) {
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

app.get("/", (req, res) => {
  res.send("OpenAI Chatbot Backend is running.");
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});