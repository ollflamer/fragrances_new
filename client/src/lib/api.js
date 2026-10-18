export class ApiError extends Error {
  constructor(code, status, fields) { super(code); this.code = code; this.status = status; this.fields = fields; }
}
export async function api(url, { body, csrfToken, ...options } = {}) {
  const headers = { ...options.headers };
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (csrfToken) headers['x-csrf-token'] = csrfToken;
  const response = await fetch(`/api${url}`, { ...options, headers, credentials: 'same-origin', body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) throw new ApiError(data.error || 'SERVER_ERROR', response.status, data.fields);
  return data;
}
