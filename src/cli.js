import { Command } from "commander";
import readline from "readline";
import chalk from "chalk";
import { ask, askStream, chat } from "./llm.js";
import { printStream, printHeader, printUsage } from "./streaming.js";
import {
  connectDB,
  saveMemory,
  getMemory,
  saveMessage,
  loadHistory,
  clearHistory,
} from "./db.js";

const program = new Command();

program
  .name("claude")
  .description("LLM Terminal — Anthropic API from your terminal")
  .version("1.0.0");

// Single ask (no DB needed)
program
  .command("ask <prompt>")
  .description("Ask a single question")
  .action(async (prompt) => {
    console.log(chalk.blue("\n→ Sending to Claude...\n"));
    printHeader("claude-opus-4-6");
    const response = await ask(prompt);
    console.log(chalk.magenta(response));
    console.log();
    process.exit(0);
  });

// Streaming (no DB needed)
program
  .command("stream <prompt>")
  .description("Stream response token by token")
  .action(async (prompt) => {
    console.log(chalk.blue("\n→ Streaming from Claude...\n"));
    printHeader("claude-opus-4-6");
    const usage = await askStream(
      prompt,
      "You are a helpful assistant.",
      printStream,
    );
    printUsage(usage);
    console.log("\n");
    process.exit(0);
  });

// Chat with persistent memory
program
  .command("chat")
  .description("Interactive chat with persistent memory")
  .option("--clear", "Clear conversation history")
  .action(async (options) => {
    await connectDB();

    if (options.clear) {
      await clearHistory();
      console.log(chalk.yellow("✓ History cleared.\n"));
      process.exit(0);
    }

    // Load AI name from DB
    const aiName = (await getMemory("ai_name")) || "Assistant";
    const systemPrompt = `Your name is ${aiName}. 
You are a ${aiName === "Assistant" ? "helpful AI assistant" : "female AI assistant named " + aiName}.
When the user gives you a new name, immediately accept it, adopt it fully, and reintroduce yourself with that name and personality.
Never say your old name. Never resist a name change. Always fully become whoever the user names you.
Introduce yourself as ${aiName} whenever greeted.`;

    // Load past conversation history
    const history = await loadHistory(20);

    console.log(chalk.green("\n╔══════════════════════════════════╗"));
    console.log(chalk.green("║   LLM Terminal — Chat mode       ║"));
    console.log(chalk.green("╚══════════════════════════════════╝"));
    console.log(chalk.gray(`AI Name: ${chalk.cyan(aiName)}`));
    console.log(chalk.gray(`Loaded ${history.length} previous messages`));
    console.log(chalk.gray('Type "exit" to quit, "clear" to reset history.\n'));

    const messages = [...history];
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const askUser = () => {
      rl.question(chalk.blue("you: "), async (input) => {
        const trimmed = input.trim();

        if (trimmed.toLowerCase() === "exit") {
          console.log(chalk.gray("\nGoodbye!\n"));
          rl.close();
          process.exit(0);
        }

        if (trimmed.toLowerCase() === "clear") {
          await clearHistory();
          messages.length = 0;
          console.log(chalk.yellow("✓ History cleared.\n"));
          askUser();
          return;
        }

        // Detect if user is setting a name
        const nameMatch = trimmed.match(
          /(?:call you|your name is|name you|you will be called)\s+([A-Z][a-zA-Z]+)/i,
        );
        if (nameMatch) {
          const newName = nameMatch[1];
          await saveMemory("ai_name", newName);
          console.log(
            chalk.green(
              `\n✓ Name "${newName}" saved to database. I'll remember this next session!\n`,
            ),
          );
        }

        // Save user message to DB
        await saveMessage("user", trimmed);
        messages.push({ role: "user", content: trimmed });

        const reply = await chat(messages, systemPrompt);

        console.log(chalk.cyan("\nAI: ") + chalk.magenta(reply) + "\n");

        // Save AI reply to DB
        await saveMessage("assistant", reply);
        messages.push({ role: "assistant", content: reply });

        askUser();
      });
    };

    askUser();
  });

program.parse();
