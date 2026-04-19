import { useState, useEffect, useCallback } from 'react';
import type { Category, CheckDraft, CheckRecord, GroupConfirmation, Shift } from '../types';
import { DEFAULT_CATEGORIES } from './defaultData';

const STORAGE_CATEGORIES = 'er-checklist-categories';
const STORAGE_RECORDS    = 'er-checklist-records';
const STORAGE_DRAFTS         = 'er-checklist-drafts';
const STORAGE_CONFIRMATIONS  = 'er-checklist-confirmations';
const STORAGE_VERSION    = 'er-checklist-data-version';
const RETENTION_DAYS     = 7;

// defaultData.ts のカテゴリ名・構成を変更した際にここを更新する
const DATA_VERSION = '4';

function loadCategories(): Category[] {
  try {
    // バージョンが変わった場合はデフォルトデータにリセット
    if (localStorage.getItem(STORAGE_VERSION) !== DATA_VERSION) {
      localStorage.setItem(STORAGE_VERSION, DATA_VERSION);
      localStorage.removeItem(STORAGE_CATEGORIES);
      return DEFAULT_CATEGORIES;
    }
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

function loadDrafts(): CheckDraft[] {
  try {
    const raw = localStorage.getItem(STORAGE_DRAFTS);
    if (raw) return JSON.parse(raw) as CheckDraft[];
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

export function useDrafts() {
  const [drafts, setDrafts] = useState<CheckDraft[]>(loadDrafts);

  useEffect(() => {
    localStorage.setItem(STORAGE_DRAFTS, JSON.stringify(drafts));
  }, [drafts]);

  const saveDraft = useCallback((draft: CheckDraft) => {
    setDrafts(prev => {
      const filtered = prev.filter(
        d => !(d.date === draft.date && d.shift === draft.shift && d.categoryId === draft.categoryId)
      );
      return [...filtered, draft];
    });
  }, []);

  const clearDraft = useCallback((date: string, shift: Shift, categoryId: string) => {
    setDrafts(prev =>
      prev.filter(d => !(d.date === date && d.shift === shift && d.categoryId === categoryId))
    );
  }, []);

  return { drafts, saveDraft, clearDraft };
}

function loadConfirmations(): GroupConfirmation[] {
  try {
    const raw = localStorage.getItem(STORAGE_CONFIRMATIONS);
    if (raw) return JSON.parse(raw) as GroupConfirmation[];
  } catch { /* ignore */ }
  return [];
}

export function useConfirmations() {
  const [confirmations, setConfirmations] = useState<GroupConfirmation[]>(loadConfirmations);

  useEffect(() => {
    localStorage.setItem(STORAGE_CONFIRMATIONS, JSON.stringify(confirmations));
  }, [confirmations]);

  const addConfirmation = useCallback((groupId: string, date: string, shift: Shift) => {
    setConfirmations(prev => {
      const filtered = prev.filter(
        c => !(c.groupId === groupId && c.date === date && c.shift === shift)
      );
      return [...filtered, { groupId, date, shift, timestamp: new Date().toISOString() }];
    });
  }, []);

  return { confirmations, addConfirmation };
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

export function isCategoryDraft(
  drafts: CheckDraft[],
  categoryId: string,
  shift: Shift,
  date: string
): boolean {
  return drafts.some(
    d => d.categoryId === categoryId && d.shift === shift && d.date === date
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
