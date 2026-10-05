import { requireConfig } from '../config.js';
import { RunhooksClient, ApiError } from '../client.js';
import { printJson, error, info, color } from '../utils/output.js';

export interface GetOptions {
  json?: boolean;
}

export async function getCommand(id: string, options: GetOptions): Promise<void> {
  const config = await requireConfig();
  const client = new RunhooksClient(config);

  try {
    const job = await client.getJob(id);
    if (options.json) {
      printJson(job);
      return;
    }
    info(`${color.bold('ID:')}          ${job.id}`);
    info(`${color.bold('Name:')}        ${job.name}`);
    if (job.description) info(`${color.bold('Description:')} ${job.description}`);
    info(`${color.bold('Status:')}      ${job.status}`);
    info(`${color.bold('URL:')}         ${job.httpConfig.method} ${job.httpConfig.url}`);
    info(`${color.bold('Schedule:')}    ${job.schedule.type} ${job.schedule.expression}${job.schedule.timezone ? ` (${job.schedule.timezone})` : ''}`);
    info(`${color.bold('Timeout:')}     ${job.httpConfig.timeoutMs}ms`);
    info(`${color.bold('Retries:')}     max=${job.retryPolicy.maxRetries}, initialDelay=${job.retryPolicy.initialDelay}ms, backoff=${job.retryPolicy.backoffMultiplier}x`);
    if (job.tags && job.tags.length > 0) info(`${color.bold('Tags:')}        ${job.tags.join(', ')}`);
    if (job.lastExecutionAt) info(`${color.bold('Last run:')}    ${new Date(job.lastExecutionAt).toISOString()}`);
    if (job.nextExecutionAt) info(`${color.bold('Next run:')}    ${new Date(job.nextExecutionAt).toISOString()}`);
    info(`${color.bold('Created:')}     ${new Date(job.createdAt).toISOString()}`);
    if (job.httpConfig.headers && Object.keys(job.httpConfig.headers).length > 0) {
      info(color.bold('Headers:'));
      for (const [k, v] of Object.entries(job.httpConfig.headers)) {
        info(`  ${k}: ${v}`);
      }
    }
    if (job.httpConfig.body) {
      info(color.bold('Body:'));
      info(`  ${job.httpConfig.body}`);
    }
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      error(`Failed to get job: ${err.message}`);
    } else {
      error(err instanceof Error ? err.message : String(err));
    }
    process.exit(1);
  }
}
