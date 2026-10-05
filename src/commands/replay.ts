import { requireConfig } from '../config.js';
import { RunhooksClient, ApiError } from '../client.js';
import { success, error, info, color } from '../utils/output.js';

export async function replayCommand(executionId: string): Promise<void> {
  const config = await requireConfig();
  const client = new RunhooksClient(config);

  try {
    await client.replayExecution(executionId);
    success(`Queued replay of execution ${color.bold(executionId)}`);
    info('The new execution will appear in the logs shortly.');
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      error(`Failed to replay execution: ${err.message}`);
    } else {
      error(err instanceof Error ? err.message : String(err));
    }
    process.exit(1);
  }
}
