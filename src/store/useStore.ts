import { useState, useEffect, useCallback } from 'react';
import type { Category, CheckRecord, Shift } from '../types';
import { DEFAULT_CATEGORIES } from './defaultData';

const STORAGE_CATEGORIES = 'er-checklist-categories';
const STORAGE_RECORDS    = 'er-checklist-records';
const RETENTION_DAYS     = 7;

function loadCategories(): Category[] {
  try {
    const raw = localStorage.getItem(STORAGE_CATEGORIES);
    if (raw) return JSON.parse(raw) as Category[];
  } catch { /* ignore */ }
  return DEFAULT_CATEGORIES;
}

function loadRecords(): CheckRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_RECORDS);
    if (raw) {
      const all: CheckRecord[] = JSON.parse(raw);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      return all.filter(r => r.date >= cutoffStr);
    }
  } catch { /* ignore */ }
  return [];
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(loadCategories);

  const saveCategories = useCallback((cats: Category[]) => {
    setCategories(cats);
    localStorage.setItem(STORAGE_CATEGORIES, JSON.stringify(cats));
  }, []);

  return { categories, saveCategories };
}

export function useRecords() {
  const [records, setRecords] = useState<CheckRecord[]>(loadRecords);

  useEffect(() => {
    localStorage.setItem(STORAGE_RECORDS, JSON.stringify(records));
  }, [records]);

  const addRecords = useCallback((newRecords: CheckRecord[]) => {
    setRecords(prev => {
      const filtered = prev.filter(r =>
        !newRecords.some(
          nr => nr.date === r.date && nr.shift === r.shift && nr.categoryId === r.categoryId
        )
      );
      return [...filtered, ...newRecords];
    });
  }, []);

  return { records, addRecords };
}

export function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getMonthString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function isCategoryDone(
  records: CheckRecord[],
  categoryId: string,
  shift: Shift,
  date: string
): boolean {
  return records.some(
    r => r.categoryId === categoryId && r.shift === shift && r.date === date
  );
}

export function getMonthlyCheckCount(
  records: CheckRecord[],
  categoryId: string,
  monthStr: string
): number {
  const dates = new Set(
    records
      .filter(r => r.categoryId === categoryId && r.date.startsWith(monthStr))
      .map(r => r.date + r.shift)
  );
  return dates.size;
}
