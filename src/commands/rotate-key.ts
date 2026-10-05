import { requireConfig, writeConfig } from '../config.js';
import { RunhooksClient, ApiError } from '../client.js';
import { prompt } from '../utils/parse.js';
import { success, error, warn, info, color } from '../utils/output.js';

export interface RotateKeyOptions {
  force?: boolean;
}

export async function rotateKeyCommand(options: RotateKeyOptions): Promise<void> {
  const config = await requireConfig();

  if (!options.force) {
    warn('This will invalidate your current API key immediately.');
    const answer = await prompt('Continue? [y/N] ');
    if (answer.trim().toLowerCase() !== 'y') {
      info('Aborted.');
      return;
    }
  }

  const client = new RunhooksClient(config);

  try {
    const result = await client.rotateApiKey();
    await writeConfig({ apiUrl: config.apiUrl, apiKey: result.apiKey });

    const masked =
      result.apiKey.length > 10
        ? `${result.apiKey.slice(0, 6)}…${result.apiKey.slice(-4)}`
        : '***';

    success('API key rotated and config updated.');
    info(`  ${color.bold('New key:')} ${masked}`);
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      error(`Failed to rotate key: ${err.message}`);
    } else {
      error(err instanceof Error ? err.message : String(err));
    }
    process.exit(1);
  }
}
