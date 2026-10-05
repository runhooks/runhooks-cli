import type { CreateJobInput, HttpMethod } from '../api-contract.js';
import { requireConfig } from '../config.js';
import { RunhooksClient, ApiError } from '../client.js';
import { parseHeaders, parseDuration } from '../utils/parse.js';
import { success, error, printJson, info, color, suggestUpgrade } from '../utils/output.js';

export interface CreateOptions {
  name: string;
  description?: string;
  url: string;
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
  json?: boolean;
}

const VALID_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export async function createCommand(options: CreateOptions): Promise<void> {
  if (!options.cron && !options.interval) {
    error('You must provide either --cron or --interval.');
    process.exit(1);
  }
  if (options.cron && options.interval) {
    error('Provide only one of --cron or --interval, not both.');
    process.exit(1);
  }

  const method = (options.method ?? 'GET').toUpperCase() as HttpMethod;
  if (!VALID_METHODS.includes(method)) {
    error(`Invalid --method: ${options.method}. Must be one of ${VALID_METHODS.join(', ')}.`);
    process.exit(1);
  }

  let headers: Record<string, string> | undefined;
  try {
    headers = parseHeaders(options.header);
  } catch (err: unknown) {
    error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const input: CreateJobInput = {
    name: options.name,
    description: options.description,
    schedule: options.cron
      ? { type: 'cron', expression: options.cron, timezone: options.timezone }
      : { type: 'interval', expression: String(parseDuration(options.interval as string)) },
    httpConfig: {
      url: options.url,
      method,
      headers,
      body: options.body,
      timeoutMs: options.timeout ? parseDuration(options.timeout) : 30_000,
    },
    tags: options.tag,
    retryPolicy: {
      maxRetries: options.maxRetries ? parseInt(options.maxRetries, 10) : 3,
      initialDelay: options.initialDelay ? parseDuration(options.initialDelay) : 1_000,
      backoffMultiplier: 2,
      maxDelay: 300_000,
    },
  };

  const config = await requireConfig();
  const client = new RunhooksClient(config);

  try {
    const job = await client.createJob(input);
    if (options.json) {
      printJson(job);
      return;
    }
    success(`Created job ${color.bold(job.id)}`);
    info(`  Name:     ${job.name}`);
    info(`  URL:      ${job.httpConfig.method} ${job.httpConfig.url}`);
    info(`  Schedule: ${job.schedule.type} ${job.schedule.expression}${job.schedule.timezone ? ` (${job.schedule.timezone})` : ''}`);
    info(`  Status:   ${job.status}`);
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      if (err.status === 402) {
        suggestUpgrade('Job limit reached.');
      } else {
        error(`Failed to create job: ${err.message}`);
      }
      if (err.body) printJson(err.body);
    } else {
      error(err instanceof Error ? err.message : String(err));
    }
    process.exit(1);
  }
}
