import type { Category, CheckRecord } from '../types';

const GAS_URL = import.meta.env.VITE_GAS_URL as string;

async function get<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(GAS_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data as T;
}

async function post<T>(body: unknown): Promise<T> {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data as T;
}

export const gasClient = {
  getItems: () => get<{ categories: Category[] }>('getItems'),

  getRecords: (days = 7) =>
    get<{ records: CheckRecord[] }>('getRecords', { days: String(days) }),

  getMonthlyRecords: () =>
    get<{ records: CheckRecord[] }>('getMonthlyRecords'),

  saveRecord: (data: {
    date: string;
    shift: string;
    categoryId: string;
    categoryName: string;
    items: Array<{
      id: string;
      name: string;
      inputValue: number;
      standardStock: number;
    }>;
  }) => post<{ success: boolean }>({ action: 'saveRecord', data }),

  saveItems: (categories: Category[]) =>
    post<{ success: boolean }>({ action: 'saveItems', data: categories }),
};
