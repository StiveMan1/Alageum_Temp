import { apiFetch, apiPage } from "./client";
export const getQuotes = () => apiPage("/quotes");
export const createQuote = (data) => apiFetch("/quotes", { method: "POST", body: JSON.stringify(data) });
