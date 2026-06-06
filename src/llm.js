import Groq from "groq-sdk";
import "dotenv/config";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

export async function ask(prompt, systemPrompt = "You are a helpful assistant.") {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
  });
  return response.choices[0].message.content;
}

export async function askStream(prompt, systemPrompt = "You are a helpful assistant.", onChunk) {
  const stream = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    stream: true,
  });
  let inputTokens = 0, outputTokens = 0;
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || "";
    if (text) onChunk(text);
    if (chunk.x_groq?.usage) {
      inputTokens = chunk.x_groq.usage.prompt_tokens;
      outputTokens = chunk.x_groq.usage.completion_tokens;
    }
  }
  return { input_tokens: inputTokens, output_tokens: outputTokens };
}

export async function chat(messages, systemPrompt = "You are a helpful assistant.") {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
  });
  return response.choices[0].message.content;
}