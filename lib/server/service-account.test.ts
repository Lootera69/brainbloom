import { expect, it } from 'vitest';
import { readServiceAccount } from './service-account';

it('accepts JSON and base64 without exposing malformed credential input', () => {
  const fixture = { project_id: 'test-project', client_email: 'test@example.invalid', private_key: 'fixture', private_key_id: 'test-key' };
  const raw = JSON.stringify(fixture);
  expect(readServiceAccount(raw)).toEqual(fixture);
  expect(readServiceAccount(Buffer.from(raw).toString('base64'))).toEqual(fixture);
  for (const invalid of [undefined, '{private fixture value', 'invalid base64', '{}']) {
    expect(() => readServiceAccount(invalid)).toThrow('Firebase service-account configuration is missing or invalid.');
  }
});
