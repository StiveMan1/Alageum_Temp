import { apiFetch, apiPage } from "./client";
export const getOrders = () => apiPage("/orders");
export const getOrder = (id) => apiFetch(`/orders/${id}`);
