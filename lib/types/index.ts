export interface Invoice {
  id: string;
  number: string;
  date: string;
  due_date: string;
  total: number;
  vat: number;
  status: "draft" | "sent" | "paid" | "overdue";
  created_at: string;
  updated_at: string;
}
