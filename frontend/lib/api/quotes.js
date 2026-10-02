import { apiFetch } from './client.js';
export const getQuotes = (page = 1) => apiFetch(`/quotes?mine=true&page=${page}&page_size=20`);
export const getQuote = id => apiFetch(`/quotes/${encodeURIComponent(id)}`);
export const createQuote = (data, idempotencyKey) => apiFetch('/quotes/catalog', {
  method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(data),
}, false); // Re-authenticate explicitly; never replay this private body under a changed session.
