import { describe, it, expect } from 'vitest';
import { createJobSchema, type CreateJobInput } from '../api-contract.js';
import { applyPlaceholders, TEMPLATES } from './index.js';

function makeSkeleton(): CreateJobInput {
  return {
    name: '{{JOB_NAME}}',
    description: 'desc',
    schedule: { type: 'cron', expression: '{{CRON}}' },
    httpConfig: {
      url: '{{TARGET_URL}}',
      method: 'POST',
      headers: {
        'X-Topic': '{{TOPIC}}',
        'X-Repeat': '{{TOPIC}}',
      },
      body: '{{BODY}}',
      timeoutMs: 30_000,
    },
    tags: ['template:test', '{{TOPIC}}'],
  };
}

describe('applyPlaceholders', () => {
  it('substitutes a token in the top-level name field', () => {
    const result = applyPlaceholders(makeSkeleton(), {
      JOB_NAME: 'my-job',
      CRON: '* * * * *',
      TARGET_URL: 'https://example.com',
      TOPIC: 'orders/create',
      BODY: '{}',
    });
    expect(result.name).toBe('my-job');
  });

  it('substitutes tokens inside nested strings (url, body, headers, tags, schedule)', () => {
    const result = applyPlaceholders(makeSkeleton(), {
      JOB_NAME: 'my-job',
      CRON: '*/10 * * * *',
      TARGET_URL: 'https://example.com/hook',
      TOPIC: 'orders/create',
      BODY: '{"k":"v"}',
    });
    expect(result.schedule.expression).toBe('*/10 * * * *');
    expect(result.httpConfig.url).toBe('https://example.com/hook');
    expect(result.httpConfig.body).toBe('{"k":"v"}');
    expect(result.httpConfig.headers).toEqual({
      'X-Topic': 'orders/create',
      'X-Repeat': 'orders/create',
    });
    expect(result.tags).toEqual(['template:test', 'orders/create']);
  });

  it('replaces tokens that appear multiple times', () => {
    const result = applyPlaceholders(makeSkeleton(), {
      JOB_NAME: 'n',
      CRON: '* * * * *',
      TARGET_URL: 'https://x.test',
      TOPIC: 'multi',
      BODY: '{}',
    });
    expect(result.httpConfig.headers?.['X-Topic']).toBe('multi');
    expect(result.httpConfig.headers?.['X-Repeat']).toBe('multi');
    expect(result.tags).toContain('multi');
  });

  it('escapes values containing double quotes and backslashes', () => {
    const result = applyPlaceholders(makeSkeleton(), {
      JOB_NAME: 'n',
      CRON: '* * * * *',
      TARGET_URL: 'https://x.test',
      TOPIC: 't',
      BODY: 'He said "hi" and used a \\ backslash',
    });
    expect(result.httpConfig.body).toBe('He said "hi" and used a \\ backslash');
  });

  it('escapes control characters (newlines) inside values', () => {
    const result = applyPlaceholders(makeSkeleton(), {
      JOB_NAME: 'n',
      CRON: '* * * * *',
      TARGET_URL: 'https://x.test',
      TOPIC: 't',
      BODY: 'line1\nline2',
    });
    expect(result.httpConfig.body).toBe('line1\nline2');
  });

  it('throws if any placeholder remains unresolved', () => {
    expect(() =>
      applyPlaceholders(makeSkeleton(), {
        JOB_NAME: 'n',
        CRON: '* * * * *',
        // TARGET_URL omitted
        TOPIC: 't',
        BODY: '{}',
      })
    ).toThrow(/Unresolved template placeholder/);
  });

  it('lists every unresolved token in the error message', () => {
    expect(() =>
      applyPlaceholders(makeSkeleton(), {
        JOB_NAME: 'n',
        // CRON, TARGET_URL, TOPIC, BODY all missing
      })
    ).toThrow(/CRON.*TARGET_URL.*TOPIC.*BODY|TARGET_URL.*CRON|CRON.*BODY/);
  });
});

describe('TEMPLATES bundled validity', () => {
  // Dummy values that satisfy createJobSchema after substitution.
  // Important: TARGET_URL must be a valid URL string.
  const dummyValueFor: Record<string, string> = {
    JOB_NAME: 'sample-job',
    TARGET_URL: 'https://example.com/hook',
    CRON_EXPRESSION: '*/5 * * * *',
    BODY_JSON: '{}',
    SHOPIFY_TOPIC: 'orders/create',
    SHOPIFY_DOMAIN: 'my-shop.myshopify.com',
    SHOPIFY_HMAC: 'aGVsbG8=',
    WEBHOOK_PAYLOAD: '{"id":1}',
  };

  for (const [name, tpl] of Object.entries(TEMPLATES)) {
    it(`${name}: substitutes cleanly and parses against createJobSchema`, () => {
      const values: Record<string, string> = {};
      for (const p of tpl.placeholders) {
        const v = dummyValueFor[p.key] ?? p.default;
        if (v === undefined) {
          throw new Error(
            `Test setup: no dummy value defined for placeholder "${p.key}" in template "${name}". ` +
              `Add it to dummyValueFor in apply.test.ts.`
          );
        }
        values[p.key] = v;
      }
      const resolved = applyPlaceholders(tpl.job, values);
      const parsed = createJobSchema.safeParse(resolved);
      if (!parsed.success) {
        throw new Error(
          `Template "${name}" failed createJobSchema validation: ${JSON.stringify(parsed.error.issues, null, 2)}`
        );
      }
      expect(parsed.success).toBe(true);
    });

    it(`${name}: every {{TOKEN}} in the job skeleton is declared in placeholders`, () => {
      const json = JSON.stringify(tpl.job);
      const tokens = new Set<string>();
      const re = /\{\{([A-Z0-9_]+)\}\}/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(json)) !== null) {
        tokens.add(m[1] as string);
      }
      const declared = new Set(tpl.placeholders.map((p) => p.key));
      for (const t of tokens) {
        expect(declared.has(t), `token {{${t}}} used in job but not declared in placeholders`).toBe(true);
      }
    });

    it(`${name}: every declared placeholder is referenced in the job skeleton`, () => {
      const json = JSON.stringify(tpl.job);
      for (const p of tpl.placeholders) {
        expect(
          json.includes(`{{${p.key}}}`),
          `placeholder ${p.key} declared but not referenced in job skeleton`
        ).toBe(true);
      }
    });
  }
});
