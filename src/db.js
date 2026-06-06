import mongoose from "mongoose";
import "dotenv/config";

// Schema for persistent memory
const memorySchema = new mongoose.Schema({
  key: { type: String, unique: true },
  value: String,
  updatedAt: { type: Date, default: Date.now },
});

const conversationSchema = new mongoose.Schema({
  role: String,
  content: String,
  timestamp: { type: Date, default: Date.now },
});

export const Memory = mongoose.model("Memory", memorySchema);
export const Conversation = mongoose.model("Conversation", conversationSchema);

export async function connectDB() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("\x1b[32m✓ MongoDB connected\x1b[0m");
}

// Save a key-value memory (like AI name, persona)
export async function saveMemory(key, value) {
  await Memory.findOneAndUpdate(
    { key },
    { value, updatedAt: new Date() },
    { upsert: true, returnDocument: "after" },
  );
}

// Get a memory by key
export async function getMemory(key) {
  const mem = await Memory.findOne({ key });
  return mem ? mem.value : null;
}

// Save a message to conversation history
export async function saveMessage(role, content) {
  await Conversation.create({ role, content });
}

// Load last N messages
export async function loadHistory(limit = 20) {
  const msgs = await Conversation.find().sort({ timestamp: -1 }).limit(limit);
  return msgs.reverse().map((m) => ({ role: m.role, content: m.content }));
}

// Clear all conversation history
export async function clearHistory() {
  await Conversation.deleteMany({});
}
