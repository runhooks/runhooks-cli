import type { User } from '../api-contract.js';
import { readConfig, writeConfig, getConfigPath } from '../config.js';
import { publicRequest, ApiError } from '../client.js';
import { prompt } from '../utils/parse.js';
import { success, error, info, color } from '../utils/output.js';

const DEFAULT_API_URL = 'https://api.runhooks.app';

export interface InitOptions {
  apiUrl?: string;
  name?: string;
}

export async function initCommand(options: InitOptions): Promise<void> {
  const existing = await readConfig();
  if (existing) {
    const answer = await prompt('Config already exists. Overwrite? [y/N] ');
    if (answer.trim().toLowerCase() !== 'y') {
      info('Aborted.');
      return;
    }
  }

  const apiUrl = options.apiUrl ?? DEFAULT_API_URL;

  let name = options.name;
  if (name === undefined) {
    name = (await prompt('Display name (optional): ')).trim() || undefined;
  }

  let result: { user: User; apiKey: string };
  try {
    result = await publicRequest<{ user: User; apiKey: string }>(
      apiUrl,
      '/auth/register-anonymous',
      {
        method: 'POST',
        body: JSON.stringify({ name }),
      }
    );
  } catch (err: unknown) {
    if (err instanceof ApiError && err.status === 0) {
      error(`Cannot reach ${apiUrl}. Is the API running?`);
    } else {
      error(`Init failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    process.exit(1);
  }

  await writeConfig({ apiUrl, apiKey: result.apiKey });

  const masked =
    result.apiKey.length > 10
      ? `${result.apiKey.slice(0, 6)}…${result.apiKey.slice(-4)}`
      : '***';

  success('Account created and credentials saved!');
  info(`  ${color.bold('API URL:')} ${apiUrl}`);
  info(`  ${color.bold('API Key:')} ${masked}`);
  info(`  ${color.bold('Config:')}  ${getConfigPath()}`);
  info('');
  info(`Run ${color.cyan('runhooks upgrade')} to add email/password.`);
}
