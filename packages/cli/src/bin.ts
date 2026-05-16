import { runCommand } from './commands/run.js';
import { initCommand } from './commands/init.js';

const HELP = `agentkit-eval — type-safe evals for AI agents

Usage:
  agentkit-eval run [glob]      Run eval files (default: **/*.eval.ts)
  agentkit-eval init            Scaffold a starter eval in the current directory
  agentkit-eval --help          Show this message
  agentkit-eval --version       Show version

Options for run:
  --out <dir>                   Output directory for run files (default: .agentkit-eval)
  --report <path>               Also write REPORT.md to this path
  --bail                        Stop on first failing case
`;

async function main(): Promise<void> {
  const [, , cmd, ...rest] = process.argv;

  if (!cmd || cmd === '--help' || cmd === '-h') {
    process.stdout.write(HELP);
    return;
  }

  if (cmd === '--version' || cmd === '-v') {
    process.stdout.write('0.0.1\n');
    return;
  }

  if (cmd === 'init') {
    await initCommand();
    return;
  }

  if (cmd === 'run') {
    const code = await runCommand(rest);
    process.exit(code);
  }

  process.stderr.write(`unknown command: ${cmd}\n${HELP}`);
  process.exit(2);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
