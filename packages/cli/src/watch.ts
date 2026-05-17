import { relative } from 'node:path';
import { c } from '@agentkit-eval/core';
import chokidar from 'chokidar';

export interface WatchOptions {
  files: string[];
  cwd: string;
  run: (file: string) => Promise<void>;
}

export async function startWatch(options: WatchOptions): Promise<void> {
  const { files, cwd, run } = options;
  const watcher = chokidar.watch(files, { ignoreInitial: false });

  let queue: string[] = [];
  let active = false;

  const drain = async () => {
    if (active) return;
    active = true;
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) break;
      process.stdout.write(c.dim(`\n--- ${relative(cwd, file)} ---\n`));
      try {
        await run(file);
      } catch (err) {
        process.stderr.write(c.red(`error: ${err instanceof Error ? err.message : String(err)}\n`));
      }
    }
    active = false;
    process.stdout.write(c.dim('\nwaiting for changes… (ctrl-c to exit)\n'));
  };

  const enqueue = (file: string) => {
    if (!queue.includes(file)) queue.push(file);
    drain();
  };

  watcher.on('add', enqueue);
  watcher.on('change', enqueue);

  await new Promise<void>((resolve) => {
    process.on('SIGINT', () => {
      watcher.close().finally(() => resolve());
    });
  });
}
