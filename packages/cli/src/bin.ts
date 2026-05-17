import { compareCommand } from './commands/compare.js';
import { initCommand } from './commands/init.js';
import { runCommand } from './commands/run.js';

const HELP = `agentkit-eval — type-safe evals for AI agents

Usage:
  agentkit-eval run [glob]      Run eval files (default: **/*.eval.ts)
  agentkit-eval compare [glob]  Run eval files across multiple variants
  agentkit-eval init            Scaffold a starter eval in the current directory
  agentkit-eval --help          Show this message
  agentkit-eval --version       Show version

Options for run:
  --watch, -w                   Re-run on file changes
  --out <dir>                   Output directory for run files (default: .agentkit-eval)
  --report <path>               Also write REPORT.md to this path
  --bail                        Stop on first failing case

Options for compare:
  --variants <name,name,...>    Required. Sets AGENTKIT_VARIANT for each run
  --out <dir>                   Output directory (default: .agentkit-eval)
  --report <path>               Write the markdown matrix to this path
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

  if (cmd === 'compare') {
    const code = await compareCommand(rest);
    process.exit(code);
  }

  process.stderr.write(`unknown command: ${cmd}\n${HELP}`);
  process.exit(2);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
