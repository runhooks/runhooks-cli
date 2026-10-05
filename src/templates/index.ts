import type { Template } from './types.js';
import { retryWebhookTemplate } from './retry-webhook.js';
import { shopifyWebhookRetryTemplate } from './shopify-webhook-retry.js';

export const TEMPLATES: Record<string, Template> = {
  [retryWebhookTemplate.name]: retryWebhookTemplate,
  [shopifyWebhookRetryTemplate.name]: shopifyWebhookRetryTemplate,
};

export function getTemplate(name: string): Template | undefined {
  return TEMPLATES[name];
}

export function listTemplateSummaries(): Array<{ name: string; description: string }> {
  return Object.values(TEMPLATES).map((t) => ({
    name: t.name,
    description: t.description,
  }));
}

export type { Template, TemplatePlaceholder } from './types.js';
export { applyPlaceholders } from './types.js';
