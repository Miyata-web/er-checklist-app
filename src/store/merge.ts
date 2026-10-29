// 記録・確認済みのマージ規則。サーバー（worker）と各端末で共通に使う。
// 端末はそれぞれ手元の分しか持っていないため、上書きではなくマージで全端末分をまとめる。
import type { CheckRecord, GroupConfirmation } from '../types';

export const RETENTION_DAYS = 60;

export function cutoffDate(): string {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  return cutoff.toISOString().slice(0, 10);
}

function latest(recs: CheckRecord[]): string {
  return recs.reduce((max, r) => (r.timestamp > max ? r.timestamp : max), '');
}

// 記録は「日付・勤務・カテゴリ」単位で1回のチェック。同じ単位が両方にあれば、新しく記録された方を採用する
export function mergeRecords(current: CheckRecord[], incoming: CheckRecord[]): CheckRecord[] {
  const groups = new Map<string, CheckRecord[]>();
  for (const list of [current, incoming]) {
    const byKey = new Map<string, CheckRecord[]>();
    for (const r of list) {
      const k = `${r.date}|${r.shift}|${r.categoryId}`;
      byKey.set(k, [...(byKey.get(k) ?? []), r]);
    }
    for (const [k, recs] of byKey) {
      const existing = groups.get(k);
      if (!existing || latest(recs) >= latest(existing)) groups.set(k, recs);
    }
  }
  const cutoff = cutoffDate();
  return [...groups.values()].flat().filter(r => r.date >= cutoff);
}

export function mergeConfirmations(current: GroupConfirmation[], incoming: GroupConfirmation[]): GroupConfirmation[] {
  const byKey = new Map<string, GroupConfirmation>();
  for (const c of [...current, ...incoming]) {
    const k = `${c.groupId}|${c.date}|${c.shift}`;
    const existing = byKey.get(k);
    if (!existing || c.timestamp >= existing.timestamp) byKey.set(k, c);
  }
  const cutoff = cutoffDate();
  return [...byKey.values()].filter(c => c.date >= cutoff);
}
