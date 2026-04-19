import { useState } from 'react';
import type { CheckRecord } from '../types';
import { HISTORY_GROUPS, GROUPED_IDS } from '../store/historyGroups';

interface Props {
  records: CheckRecord[];
  groupId?: string;
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

  const otherRecs = filterGroupId
    ? []
    : records.filter(r => !GROUPED_IDS.has(r.categoryId));

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
  // フィルター対象のカテゴリIDセット
  const filterIds = filterGroupId
    ? HISTORY_GROUPS.find(g => g.id === filterGroupId)?.ids
    : undefined;

  const filtered = filterIds
    ? records.filter(r => filterIds.has(r.categoryId))
    : records;

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

function GroupRow({ group, isOpen, onToggle }: {
  group: GroupEntry;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const hasDone = group.records.length > 0;
  const icon  = !hasDone ? '⬜' : group.hasDeficit ? '⚠️' : '✅';
  const color = !hasDone ? 'text-gray-300' : group.hasDeficit ? 'text-orange-500' : 'text-green-600';

  const catMap = new Map<string, { name: string; records: CheckRecord[] }>();
  group.records.forEach(r => {
    if (!catMap.has(r.categoryId)) catMap.set(r.categoryId, { name: r.categoryName, records: [] });
    catMap.get(r.categoryId)!.records.push(r);
  });

  return (
    <div className="mb-2 border-b border-gray-50 pb-2 last:border-0">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold ${color}`}>{icon} {group.label}</span>
        {hasDone && (
          <button onClick={onToggle} className="text-xs text-gray-400 underline ml-2">
            {isOpen ? '▲ 閉じる' : '▼ 詳細'}
          </button>
        )}
      </div>

      {hasDone && !isOpen && group.hasDeficit && (
        <div className="mt-0.5 pl-2">
          {group.records.filter(r => r.diff < 0).map(r => (
            <p key={r.recordId} className="text-xs text-red-500">
              {r.itemName} <span className="font-bold">{r.diff}</span>
            </p>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="mt-1 bg-gray-50 rounded-xl p-2 space-y-2">
          {Array.from(catMap.values()).map(cat => (
            <div key={cat.name}>
              <p className="text-xs font-bold text-gray-500 mb-0.5">{cat.name}</p>
              {cat.records.map(r => (
                <div key={r.recordId} className="flex justify-between text-xs py-0.5">
                  <span className="text-gray-600 mr-2 truncate">{r.itemName}</span>
                  <span className={`shrink-0 ${r.diff < 0 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                    {r.inputValue}/{r.standardStock}
                    {r.diff < 0 && <span className="ml-1">({r.diff})</span>}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ShiftSection({ label, data, color }: {
  label: string;
  data: ShiftData;
  color: 'blue' | 'indigo';
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = (id: string) => setOpenId(prev => prev === id ? null : id);
  const labelColor = color === 'blue' ? 'text-blue-600' : 'text-indigo-600';

  return (
    <div className="flex-1 min-w-0">
      <p className={`text-xs font-bold mb-2 ${labelColor}`}>{label}</p>
      {!data.hasAny ? (
        <p className="text-xs text-gray-300">記録なし</p>
      ) : (
        <>
          {data.groups.map(g => (
            <GroupRow key={g.groupId} group={g} isOpen={openId === g.groupId} onToggle={() => toggle(g.groupId)} />
          ))}
          {data.others.map(o => (
            <div key={o.categoryId} className="mb-2">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${o.hasDeficit ? 'text-orange-500' : 'text-green-600'}`}>
                  {o.hasDeficit ? '⚠️' : '✅'} {o.categoryName}
                </span>
                <button onClick={() => toggle(o.categoryId)} className="text-xs text-gray-400 underline ml-2">
                  {openId === o.categoryId ? '▲' : '▼'}
                </button>
              </div>
              {openId === o.categoryId && (
                <div className="mt-1 bg-gray-50 rounded-xl p-2">
                  {o.records.map(r => (
                    <div key={r.recordId} className="flex justify-between text-xs py-0.5">
                      <span className="text-gray-600 mr-2 truncate">{r.itemName}</span>
                      <span className={`shrink-0 ${r.diff < 0 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                        {r.inputValue}/{r.standardStock}
                        {r.diff < 0 && <span className="ml-1">({r.diff})</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default function HistoryPage({ records, groupId, onBack }: Props) {
  const group   = groupId ? HISTORY_GROUPS.find(g => g.id === groupId) : undefined;
  const title   = group ? `${group.label} 履歴` : 'チェック履歴';
  const grouped = groupRecords(records, groupId);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-600 text-xl px-1">←</button>
        <h1 className="text-lg font-bold text-gray-800">{title}</h1>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {grouped.length === 0 ? (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-4xl mb-3">📋</p>
            <p>履歴がありません</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {grouped.map(day => (
              <div key={day.date} className="bg-white rounded-2xl shadow-sm p-4">
                <p className="font-bold text-gray-700 mb-3 border-b border-gray-100 pb-2">
                  {formatDate(day.date)}
                </p>
                <div className="flex gap-4">
                  <ShiftSection label="☀️ 日勤" data={day.day}   color="blue"   />
                  <div className="w-px bg-gray-100 shrink-0" />
                  <ShiftSection label="🌙 夜勤" data={day.night} color="indigo" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
