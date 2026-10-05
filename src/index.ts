#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
import { whoamiCommand } from './commands/whoami.js';
import { upgradeCommand } from './commands/upgrade.js';
import { rotateKeyCommand } from './commands/rotate-key.js';
import { createCommand } from './commands/create.js';
import { listCommand } from './commands/list.js';
import { getCommand } from './commands/get.js';
import { updateCommand } from './commands/update.js';
import { pauseCommand } from './commands/pause.js';
import { resumeCommand } from './commands/resume.js';
import { deleteCommand } from './commands/delete.js';
import { logsCommand } from './commands/logs.js';
import { replayCommand } from './commands/replay.js';
import {
  alertsListCommand,
  alertsCreateCommand,
  alertsGetCommand,
  alertsUpdateCommand,
  alertsDeleteCommand,
} from './commands/alerts.js';
import { templateListCommand, templateUseCommand } from './commands/template.js';
import { usageCommand } from './commands/usage.js';
import { error } from './utils/output.js';

const program = new Command();

program
  .name('runhooks')
  .description('Runhooks CLI — reliable HTTP scheduling infrastructure')
  .version('0.1.2');

// --- Auth ---

program
  .command('init')
  .description('Create an anonymous account and save credentials')
  .option('--api-url <url>', 'API base URL (default: https://api.runhooks.app)')
  .option('--name <name>', 'Display name')
  .action(initCommand);

program
  .command('login')
  .description('Store API credentials locally')
  .option('--api-url <url>', 'API base URL (e.g. http://localhost:9000)')
  .option('--api-key <key>', 'API key (will prompt if omitted)')
  .action(loginCommand);

program
  .command('logout')
  .description('Remove stored credentials')
  .action(logoutCommand);

program
  .command('whoami')
  .description('Show the currently configured account')
  .action(whoamiCommand);

program
  .command('upgrade')
  .description('Add email & password to an anonymous account')
  .action(upgradeCommand);

program
  .command('rotate-key')
  .description('Rotate your API key (old key stops working immediately)')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(rotateKeyCommand);

// --- Jobs ---

program
  .command('create')
  .description('Create a new scheduled job')
  .requiredOption('-n, --name <name>', 'Job name')
  .option('-d, --description <text>', 'Job description')
  .requiredOption('-u, --url <url>', 'Target URL to hit on each run')
  .option('-m, --method <method>', 'HTTP method', 'GET')
  .option(
    '-H, --header <header>',
    'HTTP header in "Key: Value" form (repeatable)',
    (v: string, acc: string[]) => acc.concat(v),
    [] as string[]
  )
  .option('-b, --body <body>', 'Request body (string)')
  .option('-t, --timeout <duration>', 'Request timeout (e.g. 30s, 60s)', '30s')
  .option('--cron <expression>', 'Cron expression (e.g. "*/5 * * * *")')
  .option('--interval <duration>', 'Interval duration (e.g. 30s, 5m, 1h)')
  .option('--timezone <tz>', 'IANA timezone (only for cron schedules)')
  .option(
    '--tag <tag>',
    'Tag (repeatable)',
    (v: string, acc: string[]) => acc.concat(v),
    [] as string[]
  )
  .option('--max-retries <n>', 'Max retry attempts', '3')
  .option('--initial-delay <duration>', 'Initial retry delay', '1s')
  .option('--json', 'Output the created job as JSON')
  .action(createCommand);

program
  .command('list')
  .alias('ls')
  .description('List your jobs')
  .option('-s, --status <status>', 'Filter by status (active, paused, completed, failed)')
  .option('-t, --tag <tag>', 'Filter by tag')
  .option('-n, --name <name>', 'Filter by name (regex)')
  .option('--page <n>', 'Page number')
  .option('--limit <n>', 'Results per page')
  .option('--json', 'Output as JSON')
  .action(listCommand);

program
  .command('get <id>')
  .description('Show details of one job')
  .option('--json', 'Output as JSON')
  .action(getCommand);

program
  .command('update <id>')
  .description('Update an existing job')
  .option('-n, --name <name>', 'Job name')
  .option('-d, --description <text>', 'Job description')
  .option('-u, --url <url>', 'Target URL')
  .option('-m, --method <method>', 'HTTP method')
  .option(
    '-H, --header <header>',
    'HTTP header in "Key: Value" form (repeatable)',
    (v: string, acc: string[]) => acc.concat(v),
    [] as string[]
  )
  .option('-b, --body <body>', 'Request body (string)')
  .option('-t, --timeout <duration>', 'Request timeout')
  .option('--cron <expression>', 'Cron expression')
  .option('--interval <duration>', 'Interval duration')
  .option('--timezone <tz>', 'IANA timezone')
  .option(
    '--tag <tag>',
    'Tag (repeatable)',
    (v: string, acc: string[]) => acc.concat(v),
    [] as string[]
  )
  .option('--max-retries <n>', 'Max retry attempts')
  .option('--initial-delay <duration>', 'Initial retry delay')
  .option('--status <status>', 'Set status (active, paused)')
  .option('--json', 'Output as JSON')
  .action(updateCommand);

program
  .command('pause <id>')
  .description('Pause a job')
  .action(pauseCommand);

program
  .command('resume <id>')
  .description('Resume a paused job')
  .action(resumeCommand);

program
  .command('delete <id>')
  .alias('rm')
  .description('Delete a job')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(deleteCommand);

// --- Executions ---

program
  .command('logs <job-id>')
  .description('Show recent executions for a job')
  .option('-l, --limit <n>', 'Results per page', '20')
  .option('--page <n>', 'Page number')
  .option('-s, --status <status>', 'Filter by execution status (success, failed, timeout, running, pending, dead_letter, quota_exceeded)')
  .option('--json', 'Output as JSON')
  .action(logsCommand);

program
  .command('replay <execution-id>')
  .description('Re-run a past execution immediately')
  .action(replayCommand);

// --- Usage ---

program
  .command('usage')
  .description('Show your current plan usage and limits')
  .option('--json', 'Output as JSON')
  .action(usageCommand);

// --- Alerts ---

const alerts = program
  .command('alerts')
  .description('Manage alert configurations');

alerts
  .command('list')
  .description('List all alerts')
  .option('--json', 'Output as JSON')
  .action(alertsListCommand);

alerts
  .command('create')
  .description('Create a new alert')
  .requiredOption('-n, --name <name>', 'Alert name')
  .requiredOption('-c, --channel <channel>', 'Alert channel (email, webhook, slack)')
  .requiredOption('--target <target>', 'Destination (email address, webhook URL, or Slack URL)')
  .option('--job-id <id>', 'Scope to a specific job')
  .option('--threshold <n>', 'Consecutive failures before firing', '1')
  .option('--cooldown <minutes>', 'Cooldown between alerts in minutes', '60')
  .option('--disabled', 'Create the alert in disabled state')
  .option('--json', 'Output as JSON')
  .action(alertsCreateCommand);

alerts
  .command('get <id>')
  .description('Show alert details')
  .option('--json', 'Output as JSON')
  .action(alertsGetCommand);

alerts
  .command('update <id>')
  .description('Update an alert')
  .option('-n, --name <name>', 'Alert name')
  .option('-c, --channel <channel>', 'Alert channel')
  .option('--target <target>', 'Destination')
  .option('--enable', 'Enable the alert')
  .option('--disable', 'Disable the alert')
  .option('--json', 'Output as JSON')
  .action(alertsUpdateCommand);

alerts
  .command('delete <id>')
  .description('Delete an alert')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(alertsDeleteCommand);

// --- Templates ---

const template = program
  .command('template')
  .description('Use opinionated job templates');

template
  .command('list')
  .description('List available templates')
  .option('--json', 'Output as JSON')
  .action(templateListCommand);

template
  .command('use <name>')
  .description('Instantiate a template as a new job')
  .option(
    '--set <key=value>',
    'Pre-set a placeholder value (repeatable)',
    (val: string, acc: string[]) => acc.concat(val),
    [] as string[]
  )
  .option('--no-prompt', 'Fail if any placeholder is unset instead of prompting')
  .option('--json', 'Output created job as JSON')
  .action(templateUseCommand);

// --- Global error handling ---

async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (err: unknown) {
    error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
