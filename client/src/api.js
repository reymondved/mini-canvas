// Small helper for talking to our server: sends JSON, returns the parsed answer,
// and throws an Error with the server's message when something goes wrong.
export async function api(path, { method = 'GET', json } = {}) {
  const response = await fetch(path, {
    method,
    headers: json !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });
  if (response.status === 204) return null; // "done, nothing to send back"
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Something went wrong. Is the server running?');
  return body;
}
