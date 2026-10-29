import { useState, useEffect, useCallback, useRef } from 'react';
import type { Category, CheckDraft, CheckRecord, GroupConfirmation, Shift } from '../types';
import { DEFAULT_CATEGORIES } from './defaultData';
import { cutoffDate, mergeConfirmations, mergeRecords } from './merge';

const STORAGE_CATEGORIES    = 'er-checklist-categories';
const STORAGE_RECORDS       = 'er-checklist-records';
const STORAGE_DRAFTS        = 'er-checklist-drafts';
const STORAGE_CONFIRMATIONS = 'er-checklist-confirmations';
const STORAGE_VERSION       = 'er-checklist-data-version';
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
// 手元の分を送ってサーバー側でマージさせ、全端末分のマージ結果を受け取る
async function apiSync<T>(path: string, data: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${API}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch { return null; }
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

  const apply = useCallback((remote: Category[] | null): boolean => {
    if (remote === null) return false;
    if (remote.length > 0) {
      setCategories(remote);
      lsSet(STORAGE_CATEGORIES, remote);
    }
    return true;
  }, []);

  const refresh = useCallback(
    () => apiFetch<Category[]>('categories').then(apply), [apply]);

  useEffect(() => {
    apiFetch<Category[]>('categories').then(apply);
  }, [apply]);

  const saveCategories = useCallback((cats: Category[]) => {
    setCategories(cats);
    lsSet(STORAGE_CATEGORIES, cats);
    apiPost('categories', cats);
  }, []);

  return { categories, saveCategories, refresh };
}

// ---- レコード ----
function pruneRecords(all: CheckRecord[]): CheckRecord[] {
  const cutoffStr = cutoffDate();
  return all.filter(r => r.date >= cutoffStr);
}

export function useRecords() {
  const [records, setRecords] = useState<CheckRecord[]>(() =>
    pruneRecords(lsGet<CheckRecord[]>(STORAGE_RECORDS, []))
  );
  const recordsRef = useRef(records);

  useEffect(() => {
    recordsRef.current = records;
    lsSet(STORAGE_RECORDS, records);
  }, [records]);

  // サーバーの内容で手元を置き換えず、マージする（送信前に手元で追加した分を消さないため）
  const apply = useCallback((remote: CheckRecord[] | null): boolean => {
    if (remote === null) return false;
    setRecords(prev => mergeRecords(prev, remote));
    return true;
  }, []);

  // 手元の全記録を送る。未送信の分（通信失敗時など）もここで送られる
  const refresh = useCallback(
    () => apiSync<CheckRecord[]>('records', recordsRef.current).then(apply), [apply]);

  useEffect(() => { refresh(); }, [refresh]);

  const addRecords = useCallback((newRecords: CheckRecord[]) => {
    setRecords(prev => mergeRecords(prev, newRecords));
    apiSync<CheckRecord[]>('records', newRecords).then(apply);
  }, [apply]);

  return { records, addRecords, refresh };
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
  const confirmationsRef = useRef(confirmations);

  useEffect(() => {
    confirmationsRef.current = confirmations;
    lsSet(STORAGE_CONFIRMATIONS, confirmations);
  }, [confirmations]);

  const apply = useCallback((remote: GroupConfirmation[] | null): boolean => {
    if (remote === null) return false;
    setConfirmations(prev => mergeConfirmations(prev, remote));
    return true;
  }, []);

  const refresh = useCallback(
    () => apiSync<GroupConfirmation[]>('confirmations', confirmationsRef.current).then(apply), [apply]);

  useEffect(() => { refresh(); }, [refresh]);

  const addConfirmation = useCallback((groupId: string, date: string, shift: Shift) => {
    const confirmation = { groupId, date, shift, timestamp: new Date().toISOString() };
    setConfirmations(prev => mergeConfirmations(prev, [confirmation]));
    apiSync<GroupConfirmation[]>('confirmations', [confirmation]).then(apply);
  }, [apply]);

  return { confirmations, addConfirmation, refresh };
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
