import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock collaborators BEFORE importing the SUT.
const createJobMock = vi.fn();
const requireConfigMock = vi.fn();
const promptMock = vi.fn();

vi.mock('../client.js', () => ({
  RunhooksClient: class RunhooksClient {
    createJob = createJobMock;
  },
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly body?: unknown
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

vi.mock('../config.js', () => ({
  requireConfig: () => requireConfigMock(),
}));

vi.mock('../utils/parse.js', () => ({
  prompt: (q: string) => promptMock(q),
  parseHeaders: vi.fn(),
  parseDuration: vi.fn(),
}));

import { templateListCommand, templateUseCommand } from './template.js';

describe('templateListCommand', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('prints a table by default', async () => {
    await templateListCommand({});
    const output = logSpy.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(output).toMatch(/retry-webhook/);
    expect(output).toMatch(/shopify-webhook-retry/);
    // Table mode renders a header row containing "Name" and "Description".
    expect(output).toMatch(/Name/);
    expect(output).toMatch(/Description/);
  });

  it('prints JSON when --json is set', async () => {
    await templateListCommand({ json: true });
    const output = logSpy.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    // JSON output is the only call and is parseable.
    expect(logSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
    const names = parsed.map((p: { name: string }) => p.name);
    expect(names).toContain('retry-webhook');
    expect(names).toContain('shopify-webhook-retry');
  });
});

describe('templateUseCommand', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createJobMock.mockReset();
    requireConfigMock.mockReset();
    promptMock.mockReset();
    requireConfigMock.mockResolvedValue({ apiUrl: 'http://x', apiKey: 'k' });
    createJobMock.mockResolvedValue({
      id: 'job_123',
      name: 'tpl-job',
      schedule: { type: 'cron', expression: '* * * * *' },
      httpConfig: { method: 'POST', url: 'https://example.com/hook' },
      status: 'active',
    });

    exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    exitSpy.mockRestore();
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('creates a job when all placeholders are provided via --set in non-interactive mode', async () => {
    await templateUseCommand('retry-webhook', {
      set: [
        'TARGET_URL=https://example.com/hook',
        'JOB_NAME=tpl-job',
        'CRON_EXPRESSION=* * * * *',
        'BODY_JSON={}',
      ],
      prompt: false,
    });

    expect(promptMock).not.toHaveBeenCalled();
    expect(createJobMock).toHaveBeenCalledTimes(1);
    const arg = createJobMock.mock.calls[0]![0];
    expect(arg).toMatchObject({
      name: 'tpl-job',
      schedule: { type: 'cron', expression: '* * * * *' },
      httpConfig: {
        url: 'https://example.com/hook',
        method: 'POST',
        body: '{}',
      },
      tags: ['template:retry-webhook'],
    });
    expect(arg.retryPolicy).toMatchObject({ maxRetries: 5 });
  });

  it('uses placeholder defaults in non-interactive mode when --set is missing optional values', async () => {
    await templateUseCommand('retry-webhook', {
      set: ['TARGET_URL=https://example.com/hook'],
      prompt: false,
    });

    expect(createJobMock).toHaveBeenCalledTimes(1);
    const arg = createJobMock.mock.calls[0]![0];
    // JOB_NAME default = 'retry-webhook', CRON default = '*/5 * * * *', BODY_JSON default = '{}'
    expect(arg.name).toBe('retry-webhook');
    expect(arg.schedule.expression).toBe('*/5 * * * *');
    expect(arg.httpConfig.body).toBe('{}');
  });

  it('errors and exits 1 when the template name is unknown', async () => {
    await expect(
      templateUseCommand('does-not-exist', { set: [], prompt: false })
    ).rejects.toThrow(/process\.exit\(1\)/);
    expect(createJobMock).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('errors and exits 1 in non-interactive mode if a required placeholder has no value and no default', async () => {
    // retry-webhook's TARGET_URL is required and has no default.
    await expect(
      templateUseCommand('retry-webhook', { set: [], prompt: false })
    ).rejects.toThrow(/process\.exit\(1\)/);
    expect(createJobMock).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('prompts for missing placeholders in interactive mode', async () => {
    // 4 placeholders: JOB_NAME, TARGET_URL, CRON_EXPRESSION, BODY_JSON
    // Empty answers fall back to defaults; TARGET_URL has no default so we provide one.
    promptMock
      .mockResolvedValueOnce('') // JOB_NAME -> default 'retry-webhook'
      .mockResolvedValueOnce('https://prompted.example.com/hook') // TARGET_URL
      .mockResolvedValueOnce('') // CRON_EXPRESSION -> default
      .mockResolvedValueOnce(''); // BODY_JSON -> default

    await templateUseCommand('retry-webhook', { set: [], prompt: true });

    expect(promptMock).toHaveBeenCalledTimes(4);
    expect(createJobMock).toHaveBeenCalledTimes(1);
    const arg = createJobMock.mock.calls[0]![0];
    expect(arg.name).toBe('retry-webhook');
    expect(arg.httpConfig.url).toBe('https://prompted.example.com/hook');
    expect(arg.schedule.expression).toBe('*/5 * * * *');
    expect(arg.httpConfig.body).toBe('{}');
  });

  it('re-prompts when a required placeholder is left blank', async () => {
    // TARGET_URL required, no default. First answer empty -> re-prompt; second answer wins.
    promptMock
      .mockResolvedValueOnce('') // JOB_NAME -> default
      .mockResolvedValueOnce('') // TARGET_URL -> empty, must re-prompt
      .mockResolvedValueOnce('https://second.example.com') // TARGET_URL retry
      .mockResolvedValueOnce('') // CRON
      .mockResolvedValueOnce(''); // BODY

    await templateUseCommand('retry-webhook', { set: [], prompt: true });

    expect(createJobMock).toHaveBeenCalledTimes(1);
    expect(createJobMock.mock.calls[0]![0].httpConfig.url).toBe('https://second.example.com');
  });

  it('prefers --set values over prompting', async () => {
    // JOB_NAME and TARGET_URL pre-set; only CRON and BODY left.
    promptMock
      .mockResolvedValueOnce('') // CRON -> default
      .mockResolvedValueOnce(''); // BODY -> default

    await templateUseCommand('retry-webhook', {
      set: ['JOB_NAME=preset', 'TARGET_URL=https://preset.example.com'],
      prompt: true,
    });

    expect(promptMock).toHaveBeenCalledTimes(2);
    const arg = createJobMock.mock.calls[0]![0];
    expect(arg.name).toBe('preset');
    expect(arg.httpConfig.url).toBe('https://preset.example.com');
  });

  it('errors and exits 1 on a malformed --set value', async () => {
    await expect(
      templateUseCommand('retry-webhook', { set: ['NOEQUALS'], prompt: false })
    ).rejects.toThrow(/process\.exit\(1\)/);
    expect(createJobMock).not.toHaveBeenCalled();
  });

  it('prints created job as JSON when --json is set', async () => {
    await templateUseCommand('retry-webhook', {
      set: [
        'TARGET_URL=https://example.com/hook',
        'JOB_NAME=jname',
        'CRON_EXPRESSION=* * * * *',
        'BODY_JSON={}',
      ],
      prompt: false,
      json: true,
    });

    expect(createJobMock).toHaveBeenCalledTimes(1);
    // JSON mode prints the job as a single JSON.stringify call.
    const jsonCall = logSpy.mock.calls.find((c: unknown[]) => {
      try {
        JSON.parse(String(c[0]));
        return true;
      } catch {
        return false;
      }
    });
    expect(jsonCall).toBeDefined();
  });
});
