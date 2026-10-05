import { requireConfig } from '../config.js';
import { RunhooksClient, ApiError } from '../client.js';
import { printTable, printJson, error, truncate, color } from '../utils/output.js';

export interface ListOptions {
  status?: string;
  tag?: string;
  name?: string;
  page?: string;
  limit?: string;
  json?: boolean;
}

export async function listCommand(options: ListOptions): Promise<void> {
  const config = await requireConfig();
  const client = new RunhooksClient(config);

  try {
    const result = await client.listJobs({
      status: options.status,
      tag: options.tag,
      name: options.name,
      page: options.page ? parseInt(options.page, 10) : undefined,
      limit: options.limit ? parseInt(options.limit, 10) : undefined,
    });

    if (options.json) {
      printJson(result);
      return;
    }

    const rows = result.data.map((job) => [
      job.id,
      truncate(job.name, 30),
      `${job.httpConfig.method} ${truncate(job.httpConfig.url, 40)}`,
      `${job.schedule.type} ${truncate(job.schedule.expression, 20)}`,
      colorStatus(job.status),
    ]);

    printTable(['ID', 'Name', 'Endpoint', 'Schedule', 'Status'], rows);
    console.log(
      color.gray(
        `\n${result.total} job${result.total === 1 ? '' : 's'} total — page ${result.page}/${result.totalPages}`
      )
    );
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      error(`Failed to list jobs: ${err.message}`);
    } else {
      error(err instanceof Error ? err.message : String(err));
    }
    process.exit(1);
  }
}

function colorStatus(status: string): string {
  switch (status) {
    case 'active':
      return color.green(status);
    case 'paused':
      return color.yellow(status);
    case 'failed':
      return color.red(status);
    default:
      return color.gray(status);
  }
}
