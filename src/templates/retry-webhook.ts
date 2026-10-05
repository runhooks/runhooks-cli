import type { Template } from './types.js';

export const retryWebhookTemplate: Template = {
  name: 'retry-webhook',
  description:
    'Generic POST webhook with aggressive retries (5 attempts, exponential backoff).',
  placeholders: [
    { key: 'JOB_NAME', prompt: 'Job name', default: 'retry-webhook' },
    { key: 'TARGET_URL', prompt: 'Target webhook URL' },
    { key: 'CRON_EXPRESSION', prompt: 'Cron expression', default: '*/5 * * * *' },
    { key: 'BODY_JSON', prompt: 'Request body (JSON)', default: '{}' },
  ],
  job: {
    name: '{{JOB_NAME}}',
    description: 'Generic POST webhook with aggressive retry policy',
    schedule: { type: 'cron', expression: '{{CRON_EXPRESSION}}' },
    httpConfig: {
      url: '{{TARGET_URL}}',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{{BODY_JSON}}',
      timeoutMs: 30_000,
    },
    retryPolicy: {
      maxRetries: 5,
      initialDelay: 2_000,
      backoffMultiplier: 2,
      maxDelay: 300_000,
    },
    tags: ['template:retry-webhook'],
  },
};
