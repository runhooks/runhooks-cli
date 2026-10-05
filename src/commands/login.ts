import { writeConfig, getConfigPath } from '../config.js';
import { RunhooksClient, ApiError } from '../client.js';
import { prompt } from '../utils/parse.js';
import { success, error, info } from '../utils/output.js';

export interface LoginOptions {
  apiUrl?: string;
  apiKey?: string;
}

export async function loginCommand(options: LoginOptions): Promise<void> {
  const apiUrl = options.apiUrl ?? 'https://api.runhooks.app';
  const apiKey = options.apiKey ?? (await prompt('API key: ', true));

  if (!apiKey) {
    error('API key is required.');
    process.exit(1);
  }

  const client = new RunhooksClient({ apiUrl, apiKey });
  try {
    await client.ping();
  } catch (err: unknown) {
    if (err instanceof ApiError && err.status === 401) {
      error('Authentication failed. Check your API key.');
    } else if (err instanceof ApiError && err.status === 0) {
      error(`Cannot reach ${apiUrl}. Is the API running?`);
    } else {
      error(`Login failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    process.exit(1);
  }

  await writeConfig({ apiUrl, apiKey });
  success(`Logged in to ${apiUrl}`);
  info(`Credentials saved to ${getConfigPath()}`);
}
