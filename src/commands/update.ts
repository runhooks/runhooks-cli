import type { UpdateJobInput, HttpMethod } from '../api-contract.js';
import { requireConfig } from '../config.js';
import { RunhooksClient, ApiError } from '../client.js';
import { parseHeaders, parseDuration } from '../utils/parse.js';
import { success, error, printJson, info, color, suggestUpgrade } from '../utils/output.js';

export interface UpdateOptions {
  name?: string;
  description?: string;
  url?: string;
  method?: string;
  header?: string[];
  body?: string;
  timeout?: string;
  cron?: string;
  interval?: string;
  timezone?: string;
  tag?: string[];
  maxRetries?: string;
  initialDelay?: string;
  status?: string;
  json?: boolean;
}

const VALID_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export async function updateCommand(id: string, options: UpdateOptions): Promise<void> {
  if (options.cron && options.interval) {
    error('Provide only one of --cron or --interval, not both.');
    process.exit(1);
  }

  if (options.method) {
    const method = options.method.toUpperCase();
    if (!VALID_METHODS.includes(method as HttpMethod)) {
      error(`Invalid --method: ${options.method}. Must be one of ${VALID_METHODS.join(', ')}.`);
      process.exit(1);
    }
  }

  let headers: Record<string, string> | undefined;
  if (options.header && options.header.length > 0) {
    try {
      headers = parseHeaders(options.header);
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  }

  const input: UpdateJobInput = {};

  if (options.name !== undefined) input.name = options.name;
  if (options.description !== undefined) input.description = options.description;
  if (options.status !== undefined) input.status = options.status as 'active' | 'paused';
  if (options.tag !== undefined) input.tags = options.tag;

  if (options.cron) {
    input.schedule = { type: 'cron', expression: options.cron, timezone: options.timezone };
  } else if (options.interval) {
    input.schedule = { type: 'interval', expression: String(parseDuration(options.interval)) };
  }

  if (options.url || options.method || headers || options.body !== undefined || options.timeout) {
    input.httpConfig = {} as UpdateJobInput['httpConfig'];
    if (options.url) input.httpConfig!.url = options.url;
    if (options.method) input.httpConfig!.method = options.method.toUpperCase() as HttpMethod;
    if (headers) input.httpConfig!.headers = headers;
    if (options.body !== undefined) input.httpConfig!.body = options.body;
    if (options.timeout) input.httpConfig!.timeoutMs = parseDuration(options.timeout);
  }

  if (options.maxRetries !== undefined || options.initialDelay !== undefined) {
    input.retryPolicy = {
      maxRetries: options.maxRetries !== undefined ? parseInt(options.maxRetries, 10) : 3,
      initialDelay: options.initialDelay !== undefined ? parseDuration(options.initialDelay) : 1_000,
      backoffMultiplier: 2,
      maxDelay: 300_000,
    };
  }

  if (Object.keys(input).length === 0) {
    error('No update options provided. Use --help to see available flags.');
    process.exit(1);
  }

  const config = await requireConfig();
  const client = new RunhooksClient(config);

  try {
    const job = await client.updateJob(id, input);
    if (options.json) {
      printJson(job);
      return;
    }
    success(`Updated job ${color.bold(job.id)}`);
    info(`  Name:     ${job.name}`);
    info(`  Status:   ${job.status}`);
    info(`  URL:      ${job.httpConfig.method} ${job.httpConfig.url}`);
    info(`  Schedule: ${job.schedule.type} ${job.schedule.expression}${job.schedule.timezone ? ` (${job.schedule.timezone})` : ''}`);
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      if (err.status === 402) {
        suggestUpgrade('Plan limit reached.');
      } else {
        error(`Failed to update job: ${err.message}`);
      }
      if (err.body) printJson(err.body);
    } else {
      error(err instanceof Error ? err.message : String(err));
    }
    process.exit(1);
  }
}
