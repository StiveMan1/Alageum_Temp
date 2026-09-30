import { apiFetch, apiPage } from "./client";
export const getTickets = () => apiPage("/support/tickets");
export const getTicketCategories = () => apiPage("/support/categories");
export const createTicket = (data) => apiFetch("/support/tickets", { method: "POST", body: JSON.stringify(data) });
