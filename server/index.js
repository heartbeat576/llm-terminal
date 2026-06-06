import express from "express";
import cors from "cors";
import "dotenv/config";
import { askStream, chat } from "../src/llm.js";
import {
  connectDB,
  saveMemory,
  getMemory,
  saveMessage,
  loadHistory,
  clearHistory,
} from "../src/db.js";

const app = express();

app.use(cors());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.use(express.json());

await connectDB();

// Get chat history + AI name
app.get("/api/history", async (req, res) => {
  const history = await loadHistory(50);
  const aiName = await getMemory("ai_name") || "Assistant";
  res.json({ history, aiName });
});

// Regular chat
app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  const aiName = await getMemory("ai_name") || "Assistant";

  const systemPrompt = `Your name is ${aiName}. You are a female AI assistant named ${aiName}.
Always introduce yourself as ${aiName} when greeted.
Never resist a name change. If user gives you a new name, fully accept it immediately.`;

  const nameMatch = message.match(
    /(?:call you|your name is|name you|you will be called|should be called)\s+([A-Za-z]+)/i
  );
  if (nameMatch) await saveMemory("ai_name", nameMatch[1]);

  const history = await loadHistory(20);
  await saveMessage("user", message);
  history.push({ role: "user", content: message });

  const reply = await chat(history, systemPrompt);
  await saveMessage("assistant", reply);

  res.json({ reply, aiName });
});

// Streaming chat
app.post("/api/stream", async (req, res) => {
  const { message } = req.body;
  const aiName = await getMemory("ai_name") || "Assistant";

  const systemPrompt = `Your name is ${aiName}. You are a female AI assistant named ${aiName}.
Always introduce yourself as ${aiName} when greeted.
Never resist a name change. If user gives you a new name, fully accept it immediately.`;

  const nameMatch = message.match(
    /(?:call you|your name is|name you|you will be called|should be called)\s+([A-Za-z]+)/i
  );
  if (nameMatch) await saveMemory("ai_name", nameMatch[1]);

  const history = await loadHistory(20);
  await saveMessage("user", message);
  history.push({ role: "user", content: message });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullReply = "";

  await askStream(message, systemPrompt, (chunk) => {
    fullReply += chunk;
    res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
  });

  await saveMessage("assistant", fullReply);
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

// Clear history
app.delete("/api/history", async (req, res) => {
  await clearHistory();
  res.json({ success: true });
});

app.listen(5000, () => {
  console.log("✓ Server running on http://localhost:5000");
});