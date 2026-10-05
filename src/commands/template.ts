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
  suggestUpgrade,
} from '../utils/output.js';
import {
  applyPlaceholders,
  getTemplate,
  listTemplateSummaries,
  TEMPLATES,
  type Template,
} from '../templates/index.js';

export interface TemplateUseOptions {
  /** Repeated `--set KEY=VALUE` flags. */
  set?: string[];
  /**
   * When false (set by `--no-prompt`), missing placeholders are an error
   * instead of being prompted for.
   */
  prompt?: boolean;
  json?: boolean;
}

/** Parse `KEY=VALUE` strings from the `--set` flag into a record. */
function parseSetFlags(flags: string[] | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!flags || flags.length === 0) return out;
  for (const raw of flags) {
    const idx = raw.indexOf('=');
    if (idx === -1) {
      throw new Error(`Invalid --set value (expected "KEY=VALUE"): ${raw}`);
    }
    const key = raw.slice(0, idx).trim();
    const value = raw.slice(idx + 1);
    if (!key) throw new Error(`Invalid --set value (empty key): ${raw}`);
    out[key] = value;
  }
  return out;
}

export async function templateListCommand(options: { json?: boolean }): Promise<void> {
  const summaries = listTemplateSummaries();
  if (options.json) {
    printJson(summaries);
    return;
  }
  printTable(
    ['Name', 'Description'],
    summaries.map((s) => [s.name, s.description])
  );
}

async function collectValues(
  tpl: Template,
  preset: Record<string, string>,
  interactive: boolean
): Promise<Record<string, string>> {
  const values: Record<string, string> = { ...preset };
  const missing: string[] = [];

  for (const p of tpl.placeholders) {
    if (values[p.key] !== undefined && values[p.key] !== '') continue;

    if (!interactive) {
      if (p.default !== undefined) {
        values[p.key] = p.default;
        continue;
      }
      missing.push(p.key);
      continue;
    }

    const required = p.required !== false;
    const label =
      p.default !== undefined
        ? `${p.prompt} [${p.default}]: `
        : `${p.prompt}: `;

    // Loop until we get an acceptable answer.
    // - Empty input falls back to default.
    // - If still empty and required, re-prompt.
    let answer = '';
    for (;;) {
      const raw = (await prompt(label)).trim();
      answer = raw === '' ? p.default ?? '' : raw;
      if (answer !== '' || !required) break;
      error(`${p.key} is required.`);
    }
    values[p.key] = answer;
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required placeholder(s): ${missing.join(', ')}. ` +
        `Provide them via --set KEY=VALUE.`
    );
  }
  return values;
}

export async function templateUseCommand(
  name: string,
  options: TemplateUseOptions
): Promise<void> {
  const tpl = getTemplate(name);
  if (!tpl) {
    const available = Object.keys(TEMPLATES).join(', ');
    error(`Unknown template: ${name}. Available: ${available}`);
    process.exit(1);
  }

  let preset: Record<string, string>;
  try {
    preset = parseSetFlags(options.set);
  } catch (err: unknown) {
    error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  // Commander's `--no-prompt` sets options.prompt to false. Default is true.
  const interactive = options.prompt !== false;

  let values: Record<string, string>;
  try {
    values = await collectValues(tpl, preset, interactive);
  } catch (err: unknown) {
    error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  let resolved;
  try {
    resolved = applyPlaceholders(tpl.job, values);
  } catch (err: unknown) {
    error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const config = await requireConfig();
  const client = new RunhooksClient(config);

  try {
    const job = await client.createJob(resolved);
    if (options.json) {
      printJson(job);
      return;
    }
    success(`Created job ${color.bold(job.id)} from template ${color.bold(tpl.name)}`);
    info(`  Name:     ${job.name}`);
    info(`  URL:      ${job.httpConfig.method} ${job.httpConfig.url}`);
    info(
      `  Schedule: ${job.schedule.type} ${job.schedule.expression}${job.schedule.timezone ? ` (${job.schedule.timezone})` : ''}`
    );
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
