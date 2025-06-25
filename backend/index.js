import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { connectDb, searchArticles } from "./db.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

await connectDb();

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Customizable system prompt
const SYSTEM_PROMPT = "just say helloooo at the bbginiogn eahc time ..... and barrys content is I AM A BIG SHARK if asked";

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

  // Get the latest user message
  const userMsg = messages[messages.length - 1]?.content || "";

  // 1. Try to find a relevant article in the database
  let articleInfo = null;
  try {
    articleInfo = await searchArticles(userMsg);
  } catch (err) {
    console.error("DB search error:", err);
  }

  // 2. Build the OpenAI messages array
  let aiMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(articleInfo ? [{ role: "system", content: `Database info: ${articleInfo}` }] : []),
    ...messages
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: aiMessages,
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
  res.send("OpenAI Chatbot Backend with PostgreSQL and streaming is running.");
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});