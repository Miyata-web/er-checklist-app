import { useState, useEffect, useCallback, useRef } from 'react';
import type { Category, CheckDraft, CheckRecord, GroupConfirmation, Shift } from '../types';
import { DEFAULT_CATEGORIES } from './defaultData';

const STORAGE_CATEGORIES    = 'er-checklist-categories';
const STORAGE_RECORDS       = 'er-checklist-records';
const STORAGE_DRAFTS        = 'er-checklist-drafts';
const STORAGE_CONFIRMATIONS = 'er-checklist-confirmations';
const STORAGE_VERSION       = 'er-checklist-data-version';
const RETENTION_DAYS        = 60;
const DATA_VERSION          = '5';

// ---- ローカルストレージ helpers ----
function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function lsSet(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// ---- API helpers ----
const API = '/api';
async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}/${path}`);
    if (!res.ok) return null;
    return await res.json() as T;
  } catch { return null; }
}
async function apiPost(path: string, data: unknown): Promise<void> {
  try {
    await fetch(`${API}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch { /* ignore — local is already saved */ }
}

// ---- カテゴリ ----
function loadLocalCategories(): Category[] {
  try {
    if (localStorage.getItem(STORAGE_VERSION) !== DATA_VERSION) {
      localStorage.setItem(STORAGE_VERSION, DATA_VERSION);
      localStorage.removeItem(STORAGE_CATEGORIES);
      return DEFAULT_CATEGORIES;
    }
    const raw = localStorage.getItem(STORAGE_CATEGORIES);
    return raw ? JSON.parse(raw) as Category[] : DEFAULT_CATEGORIES;
  } catch { return DEFAULT_CATEGORIES; }
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(loadLocalCategories);

  // 起動時にサーバーから取得
  useEffect(() => {
    apiFetch<Category[]>('categories').then(remote => {
      if (remote && remote.length > 0) {
        setCategories(remote);
        lsSet(STORAGE_CATEGORIES, remote);
      }
    });
  }, []);

  const saveCategories = useCallback((cats: Category[]) => {
    setCategories(cats);
    lsSet(STORAGE_CATEGORIES, cats);
    apiPost('categories', cats);
  }, []);

  return { categories, saveCategories };
}

// ---- レコード ----
function pruneRecords(all: CheckRecord[]): CheckRecord[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return all.filter(r => r.date >= cutoffStr);
}

export function useRecords() {
  const [records, setRecords] = useState<CheckRecord[]>(() =>
    pruneRecords(lsGet<CheckRecord[]>(STORAGE_RECORDS, []))
  );
  const pendingSync = useRef(false);

  // 起動時にサーバーから取得
  useEffect(() => {
    apiFetch<CheckRecord[]>('records').then(remote => {
      if (remote) {
        const pruned = pruneRecords(remote);
        setRecords(pruned);
        lsSet(STORAGE_RECORDS, pruned);
      }
    });
  }, []);

  // ローカル変更をサーバーに書き戻し（デバウンス）
  useEffect(() => {
    if (pendingSync.current) return;
    pendingSync.current = true;
    const t = setTimeout(() => {
      lsSet(STORAGE_RECORDS, records);
      apiPost('records', records);
      pendingSync.current = false;
    }, 1000);
    return () => { clearTimeout(t); pendingSync.current = false; };
  }, [records]);

  const addRecords = useCallback((newRecords: CheckRecord[]) => {
    setRecords(prev => {
      const filtered = prev.filter(r =>
        !newRecords.some(nr =>
          nr.date === r.date && nr.shift === r.shift && nr.categoryId === r.categoryId
        )
      );
      return [...filtered, ...newRecords];
    });
  }, []);

  return { records, addRecords };
}

// ---- ドラフト（端末ローカルのみ） ----
export function useDrafts() {
  const [drafts, setDrafts] = useState<CheckDraft[]>(() =>
    lsGet<CheckDraft[]>(STORAGE_DRAFTS, [])
  );

  useEffect(() => { lsSet(STORAGE_DRAFTS, drafts); }, [drafts]);

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

// ---- 確認済み ----
export function useConfirmations() {
  const [confirmations, setConfirmations] = useState<GroupConfirmation[]>(() =>
    lsGet<GroupConfirmation[]>(STORAGE_CONFIRMATIONS, [])
  );

  useEffect(() => {
    apiFetch<GroupConfirmation[]>('confirmations').then(remote => {
      if (remote && remote.length > 0) {
        setConfirmations(remote);
        lsSet(STORAGE_CONFIRMATIONS, remote);
      }
    });
  }, []);

  useEffect(() => {
    lsSet(STORAGE_CONFIRMATIONS, confirmations);
    apiPost('confirmations', confirmations);
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

// ---- ユーティリティ ----
export function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getMonthString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function isCategoryDone(
  records: CheckRecord[], categoryId: string, shift: Shift, date: string
): boolean {
  return records.some(r => r.categoryId === categoryId && r.shift === shift && r.date === date);
}

export function isCategoryDraft(
  drafts: CheckDraft[], categoryId: string, shift: Shift, date: string
): boolean {
  return drafts.some(d => d.categoryId === categoryId && d.shift === shift && d.date === date);
}

export function getMonthlyCheckCount(
  records: CheckRecord[], categoryId: string, monthStr: string
): number {
  const dates = new Set(
    records
      .filter(r => r.categoryId === categoryId && r.date.startsWith(monthStr))
      .map(r => r.date + r.shift)
  );
  return dates.size;
}
