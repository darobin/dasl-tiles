
export const NOT_FOUND = { ok: false, status: 404, statusText: 'Not found' };

export const maslHeaders = [
  'content-disposition',
  'content-encoding',
  'content-language',
  'content-security-policy',
  'content-type',
  'link',
  'permissions-policy',
  'referrer-policy',
  'service-worker-allowed',
  'sourcemap',
  'speculation-rules',
  'supports-loading-mode',
  'x-content-type-options',
];

export function maslResponse (masl, body) {
  if (!body) return NOT_FOUND;
  const headers = {};
  maslHeaders.forEach(k => {
    if (typeof masl[k] !== 'undefined') headers[k] = masl[k];
  });
  if (typeof body === 'string') body = (new TextEncoder()).encode(body);
  return { ok: true, status: 200, statusText: 'Ok', headers, body };
}
