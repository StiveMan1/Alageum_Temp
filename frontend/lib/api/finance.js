import { apiPage } from "./client";
export const getInvoices = () => apiPage("/finance/invoices");
export const getPayments = () => apiPage("/finance/payments");
