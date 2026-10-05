import type { CreateJobInput } from '../api-contract.js';

export interface TemplatePlaceholder {
  /** Placeholder token as it appears in the template, without braces: e.g. "TARGET_URL". */
  key: string;
  /** Human-facing prompt: "Target webhook URL" */
  prompt: string;
  /** Optional default value shown in brackets in the prompt. */
  default?: string;
  /** If true, empty input is rejected and the user is re-prompted. Defaults to true. */
  required?: boolean;
}

export interface Template {
  /** Stable CLI identifier, e.g. "retry-webhook". */
  name: string;
  /** One-line description shown in `template list`. */
  description: string;
  /** Ordered list of placeholders the user must provide. */
  placeholders: TemplatePlaceholder[];
  /**
   * Job config skeleton with `{{KEY}}` tokens. Must resolve to a valid
   * CreateJobInput after substitution.
   */
  job: CreateJobInput;
}

/**
 * Substitute `{{KEY}}` tokens inside a CreateJobInput skeleton with user-provided
 * values. Substitution is JSON-aware: values are escaped so they can land safely
 * inside string literals (quotes, backslashes, control chars).
 *
 * Throws if any `{{...}}` token remains after substitution.
 */
export function applyPlaceholders(
  job: CreateJobInput,
  values: Record<string, string>
): CreateJobInput {
  let json = JSON.stringify(job);
  for (const [key, value] of Object.entries(values)) {
    // Escape value for JSON string-literal embedding (strip surrounding quotes).
    const safe = JSON.stringify(value).slice(1, -1);
    json = json.split(`{{${key}}}`).join(safe);
  }

  const remaining = json.match(/\{\{([A-Z0-9_]+)\}\}/g);
  if (remaining) {
    const unique = Array.from(new Set(remaining.map((m) => m.slice(2, -2))));
    throw new Error(
      `Unresolved template placeholder(s): ${unique.join(', ')}`
    );
  }

  return JSON.parse(json) as CreateJobInput;
}
