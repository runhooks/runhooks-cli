import { requireConfig } from '../config.js';
import { RunhooksClient, ApiError } from '../client.js';
import { printTable, printJson, error, truncate, color } from '../utils/output.js';

export interface LogsOptions {
  limit?: string;
  page?: string;
  status?: string;
  json?: boolean;
}

export async function logsCommand(jobId: string, options: LogsOptions): Promise<void> {
  const config = await requireConfig();
  const client = new RunhooksClient(config);

  try {
    const result = await client.getJobExecutions(jobId, {
      limit: options.limit ? parseInt(options.limit, 10) : 20,
      page: options.page ? parseInt(options.page, 10) : undefined,
      status: options.status,
    });

    if (options.json) {
      printJson(result);
      return;
    }

    const rows = result.data.map((exec) => [
      exec.id,
      new Date(exec.startedAt).toISOString().replace('T', ' ').slice(0, 19),
      colorStatus(exec.status),
      exec.httpStatusCode ? String(exec.httpStatusCode) : '-',
      exec.durationMs !== undefined ? `${exec.durationMs}ms` : '-',
      String(exec.attempt),
      truncate(exec.errorMessage ?? '', 40),
    ]);

    printTable(
      ['Execution ID', 'Started', 'Status', 'HTTP', 'Duration', 'Att', 'Error'],
      rows
    );
    console.log(
      color.gray(
        `\n${result.total} execution${result.total === 1 ? '' : 's'} total — page ${result.page}/${result.totalPages}`
      )
    );
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      error(`Failed to fetch logs: ${err.message}`);
    } else {
      error(err instanceof Error ? err.message : String(err));
    }
    process.exit(1);
  }
}

function colorStatus(status: string): string {
  switch (status) {
    case 'success':
      return color.green(status);
    case 'dead_letter':
      return color.bold(color.red(status));
    case 'failed':
    case 'timeout':
      return color.red(status);
    case 'quota_exceeded':
      return color.yellow(status);
    case 'running':
    case 'pending':
      return color.yellow(status);
    default:
      return color.gray(status);
  }
}
