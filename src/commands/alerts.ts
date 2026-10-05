import type { AlertChannel, CreateAlertConfigInput, UpdateAlertConfigInput } from '../api-contract.js';
import { requireConfig } from '../config.js';
import { RunhooksClient, ApiError } from '../client.js';
import { prompt } from '../utils/parse.js';
import {
  success,
  error,
  printJson,
  printTable,
  info,
  color,
  truncate,
  suggestUpgrade,
} from '../utils/output.js';

// --- list ---

export async function alertsListCommand(options: { json?: boolean }): Promise<void> {
  const config = await requireConfig();
  const client = new RunhooksClient(config);

  try {
    const alerts = await client.listAlerts();
    if (options.json) {
      printJson(alerts);
      return;
    }
    printTable(
      ['ID', 'Name', 'Channel', 'Target', 'Job', 'Threshold', 'Enabled'],
      alerts.map((a) => [
        a.id,
        truncate(a.name, 20),
        a.channel,
        truncate(a.target, 30),
        a.jobId ?? '(all)',
        String(a.consecutiveFailuresThreshold),
        a.enabled ? 'yes' : 'no',
      ])
    );
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      error(`Failed to list alerts: ${err.message}`);
    } else {
      error(err instanceof Error ? err.message : String(err));
    }
    process.exit(1);
  }
}

// --- create ---

export interface AlertsCreateOptions {
  name: string;
  channel: string;
  target: string;
  jobId?: string;
  threshold?: string;
  cooldown?: string;
  disabled?: boolean;
  json?: boolean;
}

const VALID_CHANNELS: AlertChannel[] = ['email', 'webhook', 'slack'];

export async function alertsCreateCommand(options: AlertsCreateOptions): Promise<void> {
  if (!VALID_CHANNELS.includes(options.channel as AlertChannel)) {
    error(`Invalid --channel: ${options.channel}. Must be one of ${VALID_CHANNELS.join(', ')}.`);
    process.exit(1);
  }

  const input: CreateAlertConfigInput = {
    name: options.name,
    channel: options.channel as AlertChannel,
    target: options.target,
    jobId: options.jobId ?? null,
    consecutiveFailuresThreshold: options.threshold ? parseInt(options.threshold, 10) : 1,
    cooldownMinutes: options.cooldown ? parseInt(options.cooldown, 10) : 60,
    enabled: !options.disabled,
  };

  const config = await requireConfig();
  const client = new RunhooksClient(config);

  try {
    const alert = await client.createAlert(input);
    if (options.json) {
      printJson(alert);
      return;
    }
    success(`Created alert ${color.bold(alert.id)}`);
    info(`  Name:      ${alert.name}`);
    info(`  Channel:   ${alert.channel}`);
    info(`  Target:    ${alert.target}`);
    info(`  Enabled:   ${alert.enabled ? 'yes' : 'no'}`);
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      if (err.status === 402) {
        suggestUpgrade('Alert limit reached.');
      } else {
        error(`Failed to create alert: ${err.message}`);
      }
      if (err.body) printJson(err.body);
    } else {
      error(err instanceof Error ? err.message : String(err));
    }
    process.exit(1);
  }
}

// --- get ---

export async function alertsGetCommand(id: string, options: { json?: boolean }): Promise<void> {
  const config = await requireConfig();
  const client = new RunhooksClient(config);

  try {
    const alert = await client.getAlert(id);
    if (options.json) {
      printJson(alert);
      return;
    }
    info(`${color.bold('ID:')}        ${alert.id}`);
    info(`${color.bold('Name:')}      ${alert.name}`);
    info(`${color.bold('Channel:')}   ${alert.channel}`);
    info(`${color.bold('Target:')}    ${alert.target}`);
    info(`${color.bold('Job:')}       ${alert.jobId ?? '(all jobs)'}`);
    info(`${color.bold('Threshold:')} ${alert.consecutiveFailuresThreshold} consecutive failure(s)`);
    info(`${color.bold('Cooldown:')}  ${alert.cooldownMinutes} min`);
    info(`${color.bold('Enabled:')}   ${alert.enabled ? 'yes' : 'no'}`);
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      error(`Failed to get alert: ${err.message}`);
    } else {
      error(err instanceof Error ? err.message : String(err));
    }
    process.exit(1);
  }
}

// --- update ---

export interface AlertsUpdateOptions {
  name?: string;
  channel?: string;
  target?: string;
  enable?: boolean;
  disable?: boolean;
  json?: boolean;
}

export async function alertsUpdateCommand(
  id: string,
  options: AlertsUpdateOptions
): Promise<void> {
  if (options.channel && !VALID_CHANNELS.includes(options.channel as AlertChannel)) {
    error(`Invalid --channel: ${options.channel}. Must be one of ${VALID_CHANNELS.join(', ')}.`);
    process.exit(1);
  }

  const input: UpdateAlertConfigInput = {};
  if (options.name !== undefined) input.name = options.name;
  if (options.channel !== undefined) input.channel = options.channel as AlertChannel;
  if (options.target !== undefined) input.target = options.target;
  if (options.enable) input.enabled = true;
  if (options.disable) input.enabled = false;

  if (Object.keys(input).length === 0) {
    error('No update options provided. Use --help to see available flags.');
    process.exit(1);
  }

  const config = await requireConfig();
  const client = new RunhooksClient(config);

  try {
    const alert = await client.updateAlert(id, input);
    if (options.json) {
      printJson(alert);
      return;
    }
    success(`Updated alert ${color.bold(alert.id)}`);
    info(`  Name:    ${alert.name}`);
    info(`  Channel: ${alert.channel}`);
    info(`  Target:  ${alert.target}`);
    info(`  Enabled: ${alert.enabled ? 'yes' : 'no'}`);
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      if (err.status === 402) {
        suggestUpgrade('Alert limit reached.');
      } else {
        error(`Failed to update alert: ${err.message}`);
      }
      if (err.body) printJson(err.body);
    } else {
      error(err instanceof Error ? err.message : String(err));
    }
    process.exit(1);
  }
}

// --- delete ---

export async function alertsDeleteCommand(
  id: string,
  options: { force?: boolean }
): Promise<void> {
  if (!options.force) {
    const answer = await prompt(`Delete alert ${id}? [y/N] `);
    if (answer.trim().toLowerCase() !== 'y') {
      info('Aborted.');
      return;
    }
  }

  const config = await requireConfig();
  const client = new RunhooksClient(config);

  try {
    await client.deleteAlert(id);
    success(`Deleted alert ${color.bold(id)}`);
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      error(`Failed to delete alert: ${err.message}`);
    } else {
      error(err instanceof Error ? err.message : String(err));
    }
    process.exit(1);
  }
}
