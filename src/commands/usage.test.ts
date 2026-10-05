import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UsageSnapshot } from '../api-contract.js';

vi.mock('../config.js', () => ({
  requireConfig: vi.fn().mockResolvedValue({
    apiUrl: 'http://localhost:9000',
    apiKey: 'rh_test_key',
  }),
}));

const mockGetMyUsage = vi.fn();
vi.mock('../client.js', () => ({
  RunhooksClient: vi.fn(function (this: { getMyUsage: typeof mockGetMyUsage }) {
    this.getMyUsage = mockGetMyUsage;
  }),
  ApiError: class extends Error {
    constructor(message: string, public readonly status: number) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

import { usageCommand } from './usage.js';
import { ApiError } from '../client.js';

const sampleSnapshot: UsageSnapshot = {
  plan: 'free',
  limits: {
    maxJobs: 5,
    maxDailyRuns: 100,
    maxMonthlyRuns: 1000,

    maxRetries: 3,
    maxRequestTimeoutMs: 30_000,
    maxAlertConfigs: 1,
    retentionDays: 3,
    concurrency: 1,
  },
  usage: {
    jobs: { used: 3, limit: 5, unlimited: false },
    dailyRuns: {
      used: 42,
      limit: 100,
      unlimited: false,
      resetsAt: '2026-04-10T00:00:00.000Z',
    },
    monthlyRuns: {
      used: 800,
      limit: 1000,
      unlimited: false,
      resetsAt: '2026-05-01T00:00:00.000Z',
    },
    alertConfigs: { used: 0, limit: 1, unlimited: false },
  },
};

describe('usageCommand', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as never);
  });

  it('renders a table with plan header and all rows', async () => {
    mockGetMyUsage.mockResolvedValue(sampleSnapshot);

    await usageCommand({});

    const output = logSpy.mock.calls.map((c: unknown[]) => c.join(' ')).join('\n');
    expect(output).toContain('Plan:');
    expect(output).toContain('free');
    expect(output).toContain('Jobs');
    expect(output).toContain('Daily runs');
    expect(output).toContain('Monthly runs');
    expect(output).toContain('Alert configs');
    expect(output).toContain('Retention');
  });

  it('formats numbers with thousands separators', async () => {
    mockGetMyUsage.mockResolvedValue({
      ...sampleSnapshot,
      usage: {
        ...sampleSnapshot.usage,
        monthlyRuns: {
          ...sampleSnapshot.usage.monthlyRuns,
          used: 12_345,
          limit: 200_000,
        },
      },
    });

    await usageCommand({});

    const output = logSpy.mock.calls.map((c: unknown[]) => c.join(' ')).join('\n');
    expect(output).toContain('12,345');
    expect(output).toContain('200,000');
  });

  it('shows "unlimited" for -1 limits', async () => {
    mockGetMyUsage.mockResolvedValue({
      ...sampleSnapshot,
      plan: 'growth',
      limits: { ...sampleSnapshot.limits, maxJobs: -1 },
      usage: {
        ...sampleSnapshot.usage,
        jobs: { used: 42, limit: -1, unlimited: true },
      },
    });

    await usageCommand({});

    const output = logSpy.mock.calls.map((c: unknown[]) => c.join(' ')).join('\n');
    expect(output).toContain('unlimited');
  });

  it('formats resetsAt as UTC human-readable string', async () => {
    mockGetMyUsage.mockResolvedValue(sampleSnapshot);

    await usageCommand({});

    const output = logSpy.mock.calls.map((c: unknown[]) => c.join(' ')).join('\n');
    expect(output).toContain('2026-04-10 00:00 UTC');
    expect(output).toContain('2026-05-01 00:00 UTC');
  });

  it('--json emits the raw snapshot as JSON', async () => {
    mockGetMyUsage.mockResolvedValue(sampleSnapshot);

    await usageCommand({ json: true });

    const output = logSpy.mock.calls.map((c: unknown[]) => c.join(' ')).join('\n');
    expect(output).toContain('"plan": "free"');
    expect(output).toContain('"maxJobs": 5');
  });

  it('exits with code 1 and prints error on ApiError', async () => {
    mockGetMyUsage.mockRejectedValue(new ApiError('Unauthorized', 401));

    await usageCommand({});

    expect(errSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits with code 1 on generic errors', async () => {
    mockGetMyUsage.mockRejectedValue(new Error('network down'));

    await usageCommand({});

    expect(errSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
