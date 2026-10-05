// Minimal terminal output helpers. No color deps — uses ANSI escapes directly,
// and respects NO_COLOR / non-TTY environments.

const useColor = process.stdout.isTTY && !process.env['NO_COLOR'];

function wrap(code: string, text: string): string {
  if (!useColor) return text;
  return `\x1b[${code}m${text}\x1b[0m`;
}

export const color = {
  green: (s: string) => wrap('32', s),
  red: (s: string) => wrap('31', s),
  yellow: (s: string) => wrap('33', s),
  cyan: (s: string) => wrap('36', s),
  gray: (s: string) => wrap('90', s),
  bold: (s: string) => wrap('1', s),
};

export function success(msg: string): void {
  console.log(`${color.green('✓')} ${msg}`);
}

export function info(msg: string): void {
  console.log(msg);
}

export function warn(msg: string): void {
  console.warn(`${color.yellow('!')} ${msg}`);
}

export function error(msg: string): void {
  console.error(`${color.red('✗')} ${msg}`);
}

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

/** Render an array of rows as a simple aligned table. */
export function printTable(
  headers: string[],
  rows: string[][]
): void {
  if (rows.length === 0) {
    console.log(color.gray('(no results)'));
    return;
  }
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length))
  );
  const fmtRow = (row: string[]): string =>
    row.map((cell, i) => (cell ?? '').padEnd(widths[i] ?? 0)).join('  ');
  console.log(color.bold(fmtRow(headers)));
  console.log(color.gray(widths.map((w) => '-'.repeat(w)).join('  ')));
  for (const row of rows) {
    console.log(fmtRow(row));
  }
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

export function suggestUpgrade(context: string): void {
  warn(`${context} Run \`runhooks upgrade\` to unlock higher limits.`);
}
