import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir, readFile, writeFile, chmod, unlink } from 'node:fs/promises';

export interface CliConfig {
  apiUrl: string;
  apiKey: string;
}

const CONFIG_DIR = join(homedir(), '.runhooks');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export async function readConfig(): Promise<CliConfig | null> {
  // Env vars take precedence over file config
  const envUrl = process.env['RUNHOOKS_API_URL'];
  const envKey = process.env['RUNHOOKS_API_KEY'];
  if (envUrl && envKey) {
    return { apiUrl: envUrl, apiKey: envKey };
  }

  try {
    const contents = await readFile(CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(contents) as Partial<CliConfig>;
    if (!parsed.apiUrl || !parsed.apiKey) return null;
    return {
      apiUrl: envUrl ?? parsed.apiUrl,
      apiKey: envKey ?? parsed.apiKey,
    };
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

export async function writeConfig(config: CliConfig): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  // Best-effort chmod; Windows ignores but will not throw
  try {
    await chmod(CONFIG_FILE, 0o600);
  } catch {
    // ignore on platforms that don't support it
  }
}

export async function clearConfig(): Promise<void> {
  try {
    await unlink(CONFIG_FILE);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export async function requireConfig(): Promise<CliConfig> {
  const config = await readConfig();
  if (!config) {
    throw new Error(
      'Not configured. Run `runhooks init` for quick setup, or `runhooks login` with an existing API key.'
    );
  }
  return config;
}
