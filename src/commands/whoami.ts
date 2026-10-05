import { readConfig } from '../config.js';
import { RunhooksClient, ApiError } from '../client.js';
import { info, error, color } from '../utils/output.js';

export async function whoamiCommand(): Promise<void> {
  const config = await readConfig();
  if (!config) {
    error('Not configured. Run `runhooks init` for quick setup, or `runhooks login` with an existing API key.');
    process.exit(1);
  }

  const masked = config.apiKey.length > 10
    ? `${config.apiKey.slice(0, 6)}…${config.apiKey.slice(-4)}`
    : '***';

  const client = new RunhooksClient(config);
  try {
    const user = await client.getMe();

    info(`${color.bold('API URL:')}  ${config.apiUrl}`);
    info(`${color.bold('API Key:')}  ${masked}`);
    info(`${color.bold('Name:')}     ${user.name}`);
    info(`${color.bold('Email:')}    ${user.email ?? color.gray('(anonymous)')}`);
    info(`${color.bold('Plan:')}     ${user.plan}`);
    info(`${color.bold('Account:')}  ${user.isAnonymous ? 'anonymous' : 'full'}`);

    if (user.isAnonymous) {
      info('');
      info(`Tip: Run ${color.cyan('runhooks upgrade')} to add email/password.`);
    }
  } catch (err: unknown) {
    info(`${color.bold('API URL:')} ${config.apiUrl}`);
    info(`${color.bold('API Key:')} ${masked}`);
    if (err instanceof ApiError && err.status === 401) {
      info(color.red('Status:  unauthorized (key may be invalid)'));
    } else {
      info(color.red(`Status:  unreachable (${err instanceof Error ? err.message : String(err)})`));
    }
    process.exit(1);
  }
}
