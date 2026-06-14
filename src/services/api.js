export const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:8080';

export async function callApi(path, method = 'GET', token = null, body = null, isFormData = false) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';
  
  const config = { method, headers };
  if (body) config.body = isFormData ? body : JSON.stringify(body);
  
  const res = await fetch(`${API_BASE}${path}`, config);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Error ${res.status}`);
  }
  
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}
