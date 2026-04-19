import { useState } from 'react';
import type { CheckRecord } from '../types';

interface Props {
  records: CheckRecord[];
  onBack: () => void;
}

interface DayEntry {
  date: string;
  day: CategoryEntry[];
  night: CategoryEntry[];
}

interface CategoryEntry {
  categoryId: string;
  categoryName: string;
  items: CheckRecord[];
  hasDeficit: boolean;
}

function groupRecords(records: CheckRecord[]): DayEntry[] {
  const byDate = new Map<string, DayEntry>();

  records.forEach(r => {
    if (!byDate.has(r.date)) {
      byDate.set(r.date, { date: r.date, day: [], night: [] });
    }
    const entry = byDate.get(r.date)!;
    const list  = r.shift === 'day' ? entry.day : entry.night;

    let catEntry = list.find(c => c.categoryId === r.categoryId);
    if (!catEntry) {
      catEntry = { categoryId: r.categoryId, categoryName: r.categoryName, items: [], hasDeficit: false };
      list.push(catEntry);
    }
    catEntry.items.push(r);
    if (r.diff < 0) catEntry.hasDeficit = true;
  });

  return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
}

function formatDate(dateStr: string): string {
  const d   = new Date(dateStr + 'T00:00:00');
  const day = '日月火水木金土'[d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}（${day}）`;
}

function ShiftBlock({ label, categories, color }: {
  label: string;
  categories: CategoryEntry[];
  color: 'blue' | 'indigo';
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const hasAnyDeficit = categories.some(c => c.hasDeficit);
  const allDone = categories.length > 0;

  return (
    <div className="flex-1 min-w-0">
      <div className={`text-xs font-bold mb-1 ${color === 'blue' ? 'text-blue-600' : 'text-indigo-600'}`}>
        {label}
        {allDone && (
          <span className="ml-1">{hasAnyDeficit ? '⚠️' : '✅'}</span>
        )}
        {!allDone && <span className="ml-1 text-gray-400">⬜ 未実施</span>}
      </div>

      {categories.map(cat => (
        <div key={cat.categoryId} className="mb-2">
          {/* 差異のある項目のみ表示 */}
          {cat.items
            .filter(item => item.diff < 0)
            .map(item => (
              <p key={item.itemId} className="text-xs text-red-500 font-medium">
                {item.itemName} {item.diff}
              </p>
            ))}

          {/* 詳細ボタン */}
          <button
            onClick={() => setOpenId(openId === cat.categoryId ? null : cat.categoryId)}
            className="text-xs text-gray-400 underline mt-1"
          >
            {openId === cat.categoryId ? '▲ 閉じる' : '▼ 詳細'}
          </button>

          {openId === cat.categoryId && (
            <div className="mt-2 bg-gray-50 rounded-xl p-2">
              <p className="text-xs font-bold text-gray-600 mb-1">{cat.categoryName}</p>
              {cat.items.map(item => (
                <div key={item.itemId} className="flex justify-between text-xs py-0.5">
                  <span className="text-gray-600">{item.itemName}</span>
                  <span className={item.diff < 0 ? 'text-red-500 font-bold' : 'text-gray-500'}>
                    {item.inputValue} / {item.standardStock}
                    {item.diff < 0 && <span className="ml-1">({item.diff})</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {!allDone && (
        <p className="text-xs text-gray-300">記録なし</p>
      )}
    </div>
  );
}

export default function HistoryPage({ records, onBack }: Props) {
  const grouped = groupRecords(records);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-600 text-xl px-1">←</button>
        <h1 className="text-lg font-bold text-gray-800">チェック履歴</h1>
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
                  <ShiftBlock
                    label="☀️ 日勤"
                    categories={day.day}
                    color="blue"
                  />
                  <div className="w-px bg-gray-100" />
                  <ShiftBlock
                    label="🌙 夜勤"
                    categories={day.night}
                    color="indigo"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
