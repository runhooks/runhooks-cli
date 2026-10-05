import { clearConfig, getConfigPath } from '../config.js';
import { success } from '../utils/output.js';

export async function logoutCommand(): Promise<void> {
  await clearConfig();
  success(`Removed credentials at ${getConfigPath()}`);
}
