import { useState } from 'react';
import type { Category, CheckRecord, GroupConfirmation, Shift } from '../types';
import { HISTORY_GROUPS, GROUPED_IDS } from '../store/historyGroups';

interface Props {
  records: CheckRecord[];
  categories: Category[];
  groupId?: string;
  shift: Shift;
  selectedDate: string;
  confirmations: GroupConfirmation[];
  onConfirm: (groupId: string, date: string, shift: Shift) => void;
  onBack: () => void;
}

interface GroupEntry {
  groupId: string;
  label: string;
  records: CheckRecord[];
  hasDeficit: boolean;
}

interface OtherEntry {
  categoryId: string;
  categoryName: string;
  records: CheckRecord[];
  hasDeficit: boolean;
}

interface ShiftData {
  groups: GroupEntry[];
  others: OtherEntry[];
  hasAny: boolean;
}

interface DayEntry {
  date: string;
  day: ShiftData;
  night: ShiftData;
}

function buildShiftData(records: CheckRecord[], filterGroupId?: string): ShiftData {
  const targetGroups = filterGroupId
    ? HISTORY_GROUPS.filter(g => g.id === filterGroupId)
    : HISTORY_GROUPS;

  const groups: GroupEntry[] = targetGroups.map(g => {
    const recs = records.filter(r => g.ids.has(r.categoryId));
    return { groupId: g.id, label: g.label, records: recs, hasDeficit: recs.some(r => r.diff < 0) };
  });

  const otherRecs = filterGroupId ? [] : records.filter(r => !GROUPED_IDS.has(r.categoryId));
  const otherMap = new Map<string, OtherEntry>();
  otherRecs.forEach(r => {
    if (!otherMap.has(r.categoryId))
      otherMap.set(r.categoryId, { categoryId: r.categoryId, categoryName: r.categoryName, records: [], hasDeficit: false });
    const e = otherMap.get(r.categoryId)!;
    e.records.push(r);
    if (r.diff < 0) e.hasDeficit = true;
  });

  return { groups, others: Array.from(otherMap.values()), hasAny: records.length > 0 };
}

function groupRecords(records: CheckRecord[], filterGroupId?: string): DayEntry[] {
  const filterIds = filterGroupId
    ? HISTORY_GROUPS.find(g => g.id === filterGroupId)?.ids
    : undefined;

  const filtered = filterIds ? records.filter(r => filterIds.has(r.categoryId)) : records;

  const byDate = new Map<string, { day: CheckRecord[]; night: CheckRecord[] }>();
  filtered.forEach(r => {
    if (!byDate.has(r.date)) byDate.set(r.date, { day: [], night: [] });
    const e = byDate.get(r.date)!;
    (r.shift === 'day' ? e.day : e.night).push(r);
  });

  return Array.from(byDate.entries())
    .map(([date, { day, night }]) => ({
      date,
      day:   buildShiftData(day,   filterGroupId),
      night: buildShiftData(night, filterGroupId),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function formatDate(dateStr: string): string {
  const d   = new Date(dateStr + 'T00:00:00');
  const dow = '日月火水木金土'[d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}（${dow}）`;
}

// 同品目は最新シフト（夜勤優先）を採用して合算
function mergeShiftRecords(dayRecs: CheckRecord[], nightRecs: CheckRecord[]): CheckRecord[] {
  const merged = new Map<string, CheckRecord>();
  dayRecs.forEach(r => merged.set(`${r.categoryId}:${r.itemId}`, r));
  nightRecs.forEach(r => merged.set(`${r.categoryId}:${r.itemId}`, r)); // 夜勤で上書き
  return Array.from(merged.values());
}

function ShiftDetailSection({ label, records }: { label: string; records: CheckRecord[] }) {
  const catMap = new Map<string, { name: string; records: CheckRecord[] }>();
  records.forEach(r => {
    if (!catMap.has(r.categoryId)) catMap.set(r.categoryId, { name: r.categoryName, records: [] });
    catMap.get(r.categoryId)!.records.push(r);
  });

  return (
    <div className="bg-gray-50 rounded-xl p-2">
      <p className="text-xs font-bold text-gray-500 mb-1">{label}</p>
      {Array.from(catMap.values()).map(cat => (
        <div key={cat.name} className="mb-1">
          <p className="text-xs text-gray-400 mb-0.5">{cat.name}</p>
          {cat.records.map(r => (
            <div key={r.recordId} className="flex justify-between text-xs py-0.5">
              <span className="text-gray-600 mr-2 truncate">{r.itemName}</span>
              <span className={`shrink-0 ${r.diff < 0 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                {r.inputValue}/{r.standardStock}
                {r.diff < 0
                  ? <span className="ml-1">({r.diff})</span>
                  : <span className="ml-1 text-green-500">✓</span>
                }
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function CombinedGroupRow({ label, dayRecords, nightRecords }: {
  label: string;
  dayRecords: CheckRecord[];
  nightRecords: CheckRecord[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  const allRecords = [...dayRecords, ...nightRecords];
  const hasAny = allRecords.length > 0;

  // 合算: 同品目は夜勤優先
  const mergedRecords = mergeShiftRecords(dayRecords, nightRecords);
  const hasDeficit = mergedRecords.some(r => r.diff < 0);
  const noDeficit  = hasAny && !hasDeficit;

  const icon  = !hasAny ? '⬜' : hasDeficit ? '⚠️' : '✅';
  const color = !hasAny ? 'text-gray-300'
    : hasDeficit ? 'text-orange-500'
    : 'text-green-600';

  const dayCheckers   = [...new Set(dayRecords.map(r => r.checkerName).filter((n): n is string => !!n && n.trim() !== ''))];
  const nightCheckers = [...new Set(nightRecords.map(r => r.checkerName).filter((n): n is string => !!n && n.trim() !== ''))];

  // 不足品目インライン（合算後）
  const deficitItems: { name: string; diff: number }[] = mergedRecords
    .filter(r => r.diff < 0)
    .map(r => ({ name: r.itemName, diff: r.diff }));

  return (
    <div className="mb-2 border-b border-gray-50 pb-2 last:border-0">
      <div className="flex items-center justify-between">
        <div>
          <span className={`text-xs font-bold ${color}`}>{icon} {label}</span>
          {noDeficit && <span className="ml-2 text-xs text-green-500 font-medium">差分なし</span>}
        </div>
        {hasAny && (
          <button onClick={() => setIsOpen(v => !v)} className="text-xs text-gray-400 underline ml-2 shrink-0">
            {isOpen ? '▲ 閉じる' : '▼ 詳細'}
          </button>
        )}
      </div>

      {/* チェック者（日勤 / 夜勤） */}
      {hasAny && (dayCheckers.length > 0 || nightCheckers.length > 0) && (
        <p className="text-xs text-gray-400 mt-0.5 pl-4">
          {dayCheckers.length > 0 && `日: ${dayCheckers.join(', ')}`}
          {dayCheckers.length > 0 && nightCheckers.length > 0 && ' / '}
          {nightCheckers.length > 0 && `夜: ${nightCheckers.join(', ')}`}
        </p>
      )}

      {/* 合算不足インライン */}
      {hasAny && !isOpen && hasDeficit && (
        <div className="mt-0.5 pl-2">
          {deficitItems.map(({ name, diff }) => (
            <p key={name} className="text-xs text-red-500">
              {name} <span className="font-bold">{diff}</span>
            </p>
          ))}
        </div>
      )}

      {/* 詳細展開: 日勤・夜勤を個別表示 */}
      {isOpen && (
        <div className="mt-1 space-y-2">
          {dayRecords.length > 0 && (
            <ShiftDetailSection label="☀️ 日勤" records={dayRecords} />
          )}
          {nightRecords.length > 0 && (
            <ShiftDetailSection label="🌙 夜勤" records={nightRecords} />
          )}
        </div>
      )}
    </div>
  );
}

function CombinedOtherRow({ categoryName, dayRecords, nightRecords }: {
  categoryId: string;
  categoryName: string;
  dayRecords: CheckRecord[];
  nightRecords: CheckRecord[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  const mergedRecords = mergeShiftRecords(dayRecords, nightRecords);
  const hasAny = (dayRecords.length + nightRecords.length) > 0;
  const hasDeficit = mergedRecords.some(r => r.diff < 0);
  const noDeficit = hasAny && !hasDeficit;

  const dayCheckers   = [...new Set(dayRecords.map(r => r.checkerName).filter((n): n is string => !!n && n.trim() !== ''))];
  const nightCheckers = [...new Set(nightRecords.map(r => r.checkerName).filter((n): n is string => !!n && n.trim() !== ''))];

  return (
    <div className="mb-2 border-b border-gray-50 pb-2 last:border-0">
      <div className="flex items-center justify-between">
        <div>
          <span className={`text-xs font-bold ${hasDeficit ? 'text-orange-500' : 'text-green-600'}`}>
            {hasDeficit ? '⚠️' : '✅'} {categoryName}
          </span>
          {noDeficit && <span className="ml-2 text-xs text-green-500 font-medium">差分なし</span>}
        </div>
        {hasAny && (
          <button onClick={() => setIsOpen(v => !v)} className="text-xs text-gray-400 underline ml-2 shrink-0">
            {isOpen ? '▲ 閉じる' : '▼ 詳細'}
          </button>
        )}
      </div>

      {hasAny && (dayCheckers.length > 0 || nightCheckers.length > 0) && (
        <p className="text-xs text-gray-400 mt-0.5 pl-4">
          {dayCheckers.length > 0 && `日: ${dayCheckers.join(', ')}`}
          {dayCheckers.length > 0 && nightCheckers.length > 0 && ' / '}
          {nightCheckers.length > 0 && `夜: ${nightCheckers.join(', ')}`}
        </p>
      )}

      {isOpen && (
        <div className="mt-1 space-y-2">
          {dayRecords.length > 0 && (
            <ShiftDetailSection label="☀️ 日勤" records={dayRecords} />
          )}
          {nightRecords.length > 0 && (
            <ShiftDetailSection label="🌙 夜勤" records={nightRecords} />
          )}
        </div>
      )}
    </div>
  );
}

export default function HistoryPage({ records, categories, groupId, shift, selectedDate, confirmations, onConfirm, onBack }: Props) {
  // itemId -> 現在の品目名 マップ（管理画面でのリネームに対応）
  const itemNameMap = new Map<string, string>();
  categories.forEach(cat => cat.items.forEach(item => itemNameMap.set(item.id, item.name)));

  // レコードの品目名を現在の名前で補正
  const resolvedRecords = records.map(r => {
    const currentName = itemNameMap.get(r.itemId);
    return currentName && currentName !== r.itemName ? { ...r, itemName: currentName } : r;
  });
  const group   = groupId ? HISTORY_GROUPS.find(g => g.id === groupId) : undefined;
  const title   = group ? `${group.label} 履歴` : 'チェック履歴';
  const grouped = groupRecords(resolvedRecords, groupId);

  const isConfirmed = groupId
    ? confirmations.some(c => c.groupId === groupId && c.date === selectedDate && c.shift === shift)
    : false;

  const hasCurrentDate = groupId
    ? resolvedRecords.some(r => (group?.ids.has(r.categoryId)) && r.date === selectedDate)
    : false;

  const targetGroups = groupId
    ? HISTORY_GROUPS.filter(g => g.id === groupId)
    : HISTORY_GROUPS;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-600 text-xl px-1">←</button>
        <h1 className="text-lg font-bold text-gray-800 flex-1">{title}</h1>
      </div>

      {groupId && hasCurrentDate && (
        <div className="bg-white border-b border-gray-100 px-4 py-3">
          {isConfirmed ? (
            <div className="flex items-center gap-2 text-blue-600">
              <span className="text-lg">✅</span>
              <span className="text-sm font-bold">確認済み（{formatDate(selectedDate)}）</span>
            </div>
          ) : (
            <button
              onClick={() => onConfirm(groupId, selectedDate, shift)}
              className="w-full py-3 rounded-xl bg-blue-500 text-white text-sm font-bold active:bg-blue-600 transition-colors"
            >
              ✅ 確認済みにする（{formatDate(selectedDate)}）
            </button>
          )}
        </div>
      )}

      <div className="flex-1 p-4 overflow-y-auto">
        {grouped.length === 0 ? (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-4xl mb-3">📋</p>
            <p>履歴がありません</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {grouped.map(day => {
              // カテゴリグループ合算
              const groupRows = targetGroups.map(g => {
                const dayRecs   = day.day.groups.find(dg => dg.groupId === g.id)?.records ?? [];
                const nightRecs = day.night.groups.find(ng => ng.groupId === g.id)?.records ?? [];
                if (dayRecs.length === 0 && nightRecs.length === 0) return null;
                return (
                  <CombinedGroupRow
                    key={g.id}
                    label={g.label}
                    dayRecords={dayRecs}
                    nightRecords={nightRecs}
                  />
                );
              });

              // その他カテゴリ合算
              const othersMap = new Map<string, { name: string; dayR: CheckRecord[]; nightR: CheckRecord[] }>();
              day.day.others.forEach(o => {
                othersMap.set(o.categoryId, { name: o.categoryName, dayR: o.records, nightR: [] });
              });
              day.night.others.forEach(o => {
                if (othersMap.has(o.categoryId)) {
                  othersMap.get(o.categoryId)!.nightR = o.records;
                } else {
                  othersMap.set(o.categoryId, { name: o.categoryName, dayR: [], nightR: o.records });
                }
              });

              const otherRows = !groupId
                ? Array.from(othersMap.entries()).map(([catId, { name, dayR, nightR }]) => (
                    <CombinedOtherRow
                      key={catId}
                      categoryId={catId}
                      categoryName={name}
                      dayRecords={dayR}
                      nightRecords={nightR}
                    />
                  ))
                : [];

              return (
                <div key={day.date} className="bg-white rounded-2xl shadow-sm p-4">
                  <p className="font-bold text-gray-700 mb-3 border-b border-gray-100 pb-2">
                    {formatDate(day.date)}
                  </p>
                  {groupRows}
                  {otherRows}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
