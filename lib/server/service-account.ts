export function readServiceAccount(raw: string | undefined): Record<string, string> {
  try {
    if (!raw) throw new Error();
    const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const data = JSON.parse(json);
    if (!data || typeof data.project_id !== 'string' || typeof data.client_email !== 'string'
      || typeof data.private_key !== 'string' || typeof data.private_key_id !== 'string') throw new Error();
    return data;
  } catch {
    throw new Error('Firebase service-account configuration is missing or invalid.');
  }
}
