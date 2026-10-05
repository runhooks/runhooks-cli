import { requireConfig } from '../config.js';
import { RunhooksClient, ApiError } from '../client.js';
import { success, error, color } from '../utils/output.js';

export async function pauseCommand(id: string): Promise<void> {
  const config = await requireConfig();
  const client = new RunhooksClient(config);

  try {
    await client.updateJob(id, { status: 'paused' });
    success(`Paused job ${color.bold(id)}`);
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      error(`Failed to pause job: ${err.message}`);
    } else {
      error(err instanceof Error ? err.message : String(err));
    }
    process.exit(1);
  }
}
