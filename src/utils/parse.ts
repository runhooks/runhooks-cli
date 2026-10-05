/** Parse "Key: Value" header strings into a record. */
export function parseHeaders(headers: string[] | undefined): Record<string, string> | undefined {
  if (!headers || headers.length === 0) return undefined;
  const out: Record<string, string> = {};
  for (const h of headers) {
    const idx = h.indexOf(':');
    if (idx === -1) {
      throw new Error(`Invalid header (expected "Key: Value"): ${h}`);
    }
    const key = h.slice(0, idx).trim();
    const value = h.slice(idx + 1).trim();
    if (!key) throw new Error(`Invalid header (empty key): ${h}`);
    out[key] = value;
  }
  return out;
}

/**
 * Parse a human-friendly duration string into milliseconds.
 * Accepts: "30s", "5m", "1h", "2d", "500ms", or a raw integer of ms.
 */
export function parseDuration(input: string): number {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  const match = trimmed.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) {
    throw new Error(
      `Invalid duration: "${input}". Use ms / s / m / h / d, e.g. "30s", "5m", "1h".`
    );
  }
  const n = parseInt(match[1] as string, 10);
  const unit = match[2] as 'ms' | 's' | 'm' | 'h' | 'd';
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return n * (multipliers[unit] ?? 1);
}

/** Prompt for a single line of input on stdin (hidden=true masks output). */
export async function prompt(question: string, hidden = false): Promise<string> {
  process.stdout.write(question);
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const chunks: string[] = [];

    if (hidden && stdin.isTTY) {
      stdin.setRawMode(true);
    }
    stdin.resume();
    stdin.setEncoding('utf8');

    const onData = (data: string): void => {
      for (const ch of data) {
        if (ch === '\n' || ch === '\r' || ch === '\u0004') {
          if (hidden && stdin.isTTY) {
            stdin.setRawMode(false);
          }
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(chunks.join(''));
          return;
        }
        if (ch === '\u0003') {
          // Ctrl-C
          process.exit(130);
        }
        if (ch === '\u007f' || ch === '\b') {
          // Backspace
          if (chunks.length > 0) chunks.pop();
          continue;
        }
        chunks.push(ch);
        if (!hidden) process.stdout.write(ch);
      }
    };

    stdin.on('data', onData);
  });
}
