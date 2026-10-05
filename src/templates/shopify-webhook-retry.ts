import type { Template } from './types.js';

export const shopifyWebhookRetryTemplate: Template = {
  name: 'shopify-webhook-retry',
  description:
    'Replay a Shopify webhook with Topic/HMAC/Shop-Domain headers and Shopify-tuned retries.',
  placeholders: [
    { key: 'JOB_NAME', prompt: 'Job name', default: 'shopify-webhook-retry' },
    { key: 'TARGET_URL', prompt: 'Target webhook URL' },
    { key: 'SHOPIFY_TOPIC', prompt: 'X-Shopify-Topic (e.g. orders/create)' },
    {
      key: 'SHOPIFY_DOMAIN',
      prompt: 'X-Shopify-Shop-Domain (e.g. my-shop.myshopify.com)',
    },
    { key: 'SHOPIFY_HMAC', prompt: 'X-Shopify-Hmac-Sha256 (base64)' },
    { key: 'WEBHOOK_PAYLOAD', prompt: 'Webhook payload (JSON)', default: '{}' },
    { key: 'CRON_EXPRESSION', prompt: 'Cron expression', default: '*/15 * * * *' },
  ],
  job: {
    name: '{{JOB_NAME}}',
    description: 'Replay a Shopify webhook with signature and topic headers',
    schedule: { type: 'cron', expression: '{{CRON_EXPRESSION}}' },
    httpConfig: {
      url: '{{TARGET_URL}}',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Topic': '{{SHOPIFY_TOPIC}}',
        'X-Shopify-Shop-Domain': '{{SHOPIFY_DOMAIN}}',
        'X-Shopify-Hmac-Sha256': '{{SHOPIFY_HMAC}}',
      },
      body: '{{WEBHOOK_PAYLOAD}}',
      timeoutMs: 30_000,
    },
    retryPolicy: {
      maxRetries: 7,
      initialDelay: 3_000,
      backoffMultiplier: 2,
      maxDelay: 600_000,
    },
    tags: ['template:shopify-webhook-retry', 'shopify'],
  },
};
