import { requireConfig } from '../config.js';
import { RunhooksClient, ApiError } from '../client.js';
import { prompt } from '../utils/parse.js';
import { success, error, warn } from '../utils/output.js';

export interface DeleteOptions {
  force?: boolean;
}

export async function deleteCommand(id: string, options: DeleteOptions): Promise<void> {
  const config = await requireConfig();
  const client = new RunhooksClient(config);

  if (!options.force) {
    warn(`You are about to delete job ${id}.`);
    const answer = await prompt('Type "yes" to confirm: ');
    if (answer.trim().toLowerCase() !== 'yes') {
      error('Aborted.');
      process.exit(1);
    }
  }

  try {
    await client.deleteJob(id);
    success(`Deleted job ${id}`);
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      error(`Failed to delete job: ${err.message}`);
    } else {
      error(err instanceof Error ? err.message : String(err));
    }
    process.exit(1);
  }
}
