import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const cli = createRequire(import.meta.url).resolve('next/dist/bin/next');
const result = spawnSync(process.execPath, [cli, 'build', '--webpack'], {
  stdio: 'inherit',
  env: { ...process.env, ANALYZE: 'true' },
});
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
