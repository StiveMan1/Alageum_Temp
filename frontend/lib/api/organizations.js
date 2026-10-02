import { apiFetch } from './client.js';

export const getOrganizationProfile = (signal) => apiFetch('/organizations/current/profile', { signal });
export const updateOrganizationProfile = (patch, signal) => apiFetch('/organizations/current/profile', {
  method: 'PATCH', body: JSON.stringify(patch), signal,
}, false); // Never refresh and replay a private write under another login.
