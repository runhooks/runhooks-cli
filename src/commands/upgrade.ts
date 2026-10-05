import { requireConfig } from '../config.js';
import { RunhooksClient, ApiError } from '../client.js';
import { prompt } from '../utils/parse.js';
import { success, error, info, color } from '../utils/output.js';

export async function upgradeCommand(): Promise<void> {
  const config = await requireConfig();
  const client = new RunhooksClient(config);

  let user;
  try {
    user = await client.getMe();
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      error(`Failed to fetch account: ${err.message}`);
    } else {
      error(err instanceof Error ? err.message : String(err));
    }
    process.exit(1);
  }

  if (!user.isAnonymous) {
    info(`Already a full account (${user.email}).`);
    return;
  }

  info('Your account is anonymous. Upgrade to add email & password.\n');
  info('  [1] Enter email & password here (default)');
  info('  [2] Get a link to complete in the browser\n');

  const choice = (await prompt('Choice [1]: ')).trim() || '1';

  if (choice === '2') {
    await upgradeViaLink(client);
  } else {
    await upgradeInline(client);
  }
}

async function upgradeInline(client: RunhooksClient): Promise<void> {
  const email = (await prompt('Email: ')).trim();
  if (!email) {
    error('Email is required.');
    process.exit(1);
  }

  const password = await prompt('Password: ', true);
  const confirm = await prompt('Confirm password: ', true);

  if (password !== confirm) {
    error('Passwords do not match.');
    process.exit(1);
  }
  if (password.length < 8) {
    error('Password must be at least 8 characters.');
    process.exit(1);
  }

  try {
    await client.upgradeAccount({ email, password });
    success(`Account upgraded! You are now ${color.bold(email)}.`);
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      error(`Upgrade failed: ${err.message}`);
    } else {
      error(err instanceof Error ? err.message : String(err));
    }
    process.exit(1);
  }
}

async function upgradeViaLink(client: RunhooksClient): Promise<void> {
  try {
    const result = await client.claimUpgradeToken();
    info('');
    info(`Open this link to complete your upgrade:`);
    info(`  ${color.cyan(result.claimUrl)}`);
    info('');
    info(`Expires: ${result.expiresAt}`);
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      error(`Failed to generate upgrade link: ${err.message}`);
    } else {
      error(err instanceof Error ? err.message : String(err));
    }
    process.exit(1);
  }
}
