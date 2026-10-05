import { requireConfig } from '../config.js';
import { RunhooksClient, ApiError } from '../client.js';
import { printTable, printJson, error, color } from '../utils/output.js';
import type { UsageMetric, UsageSnapshot } from '../api-contract.js';

export interface UsageOptions {
  json?: boolean;
}

export async function usageCommand(options: UsageOptions): Promise<void> {
  const config = await requireConfig();
  const client = new RunhooksClient(config);

  try {
    const snapshot = await client.getMyUsage();

    if (options.json) {
      printJson(snapshot);
      return;
    }

    renderUsage(snapshot);
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      error(`Failed to fetch usage: ${err.message}`);
    } else {
      error(err instanceof Error ? err.message : String(err));
    }
    process.exit(1);
  }
}

function renderUsage(snapshot: UsageSnapshot): void {
  console.log(`Plan: ${color.bold(snapshot.plan)}\n`);

  const rows: string[][] = [
    [
      'Jobs',
      formatMetric(snapshot.usage.jobs),
      formatLimit(snapshot.usage.jobs.limit),
      '—',
    ],
    [
      'Daily runs',
      formatMetric(snapshot.usage.dailyRuns),
      formatLimit(snapshot.usage.dailyRuns.limit),
      formatReset(snapshot.usage.dailyRuns.resetsAt),
    ],
    [
      'Monthly runs',
      formatMetric(snapshot.usage.monthlyRuns),
      formatLimit(snapshot.usage.monthlyRuns.limit),
      formatReset(snapshot.usage.monthlyRuns.resetsAt),
    ],
    [
      'Alert configs',
      formatMetric(snapshot.usage.alertConfigs),
      formatLimit(snapshot.usage.alertConfigs.limit),
      '—',
    ],
    ['Retention', '—', `${snapshot.limits.retentionDays} days`, '—'],
  ];

  printTable(['Metric', 'Used', 'Limit', 'Resets'], rows);
}

function formatMetric(m: UsageMetric): string {
  return m.used.toLocaleString('en-US');
}

function formatLimit(limit: number): string {
  if (limit === -1) return 'unlimited';
  return limit.toLocaleString('en-US');
}

function formatReset(resetsAt?: string): string {
  if (!resetsAt) return '—';
  const d = new Date(resetsAt);
  // Render as "YYYY-MM-DD HH:MM UTC" for readability.
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  return `${y}-${mo}-${day} ${h}:${mi} UTC`;
}
