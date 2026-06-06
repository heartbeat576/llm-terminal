import chalk from "chalk";
import process from "process";

export function printStream(text) {
  process.stdout.write(chalk.magenta(text));
}

export function printHeader(model) {
  console.log(chalk.gray("─".repeat(50)));
  console.log(chalk.blue("◆ ") + chalk.cyan(model));
  console.log(chalk.gray("─".repeat(50)));
}

export function printUsage(usage) {
  console.log(
    chalk.gray(`\n↳ tokens: ${usage.input_tokens} in • ${usage.output_tokens} out`)
  );
}