import type { Category, CheckDraft, CheckRecord, Shift } from '../types';
import {
  getMonthlyCheckCount,
  isCategoryDone,
  isCategoryDraft,
} from '../store/useStore';

interface Props {
  shift: Shift;
  selectedDate: string;
  categories: Category[];
  records: CheckRecord[];
  drafts: CheckDraft[];
  onSelectCategory: (category: Category) => void;
  onBack: () => void;
  onGoHistory: () => void;
  onGoAdmin: () => void;
}

function FrequencyBadge({ frequency }: { frequency: Category['frequency'] }) {
  const labels: Record<Category['frequency'], string> = {
    daily2: '毎日2回',
    daily1: '毎日1回',
    monthly1: '月1回',
    monthly2: '月2回',
  };
  return (
    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
      {labels[frequency]}
    </span>
  );
}

function StatusBadge({
  category,
  records,
  drafts,
  shift,
  selectedDate,
}: {
  category: Category;
  records: CheckRecord[];
  drafts: CheckDraft[];
  shift: Shift;
  selectedDate: string;
}) {
  const monthStr = selectedDate.slice(0, 7);

  if (category.frequency === 'daily2') {
    const dayDone   = isCategoryDone(records, category.id, 'day', selectedDate);
    const nightDone = isCategoryDone(records, category.id, 'night', selectedDate);
    const dayDraft  = !dayDone   && isCategoryDraft(drafts, category.id, 'day', selectedDate);
    const nightDraft = !nightDone && isCategoryDraft(drafts, category.id, 'night', selectedDate);
    return (
      <div className="flex gap-2 text-sm flex-wrap">
        <span className={dayDone ? 'text-green-600 font-bold' : dayDraft ? 'text-orange-500 font-bold' : 'text-gray-400'}>
          {dayDone ? '✅ 日勤済' : dayDraft ? '⏸️ 日勤中断' : '⬜ 日勤未'}
        </span>
        <span className={nightDone ? 'text-indigo-600 font-bold' : nightDraft ? 'text-orange-500 font-bold' : 'text-gray-400'}>
          {nightDone ? '✅ 夜勤済' : nightDraft ? '⏸️ 夜勤中断' : '⬜ 夜勤未'}
        </span>
      </div>
    );
  }

  if (category.frequency === 'daily1') {
    const done  = isCategoryDone(records, category.id, shift, selectedDate);
    const draft = !done && isCategoryDraft(drafts, category.id, shift, selectedDate);
    return (
      <span className={done ? 'text-green-600 text-sm font-bold' : draft ? 'text-orange-500 text-sm font-bold' : 'text-gray-400 text-sm'}>
        {done ? '✅ 完了' : draft ? '⏸️ 中断中' : '⬜ 未完了'}
      </span>
    );
  }

  if (category.frequency === 'monthly1') {
    const count = getMonthlyCheckCount(records, category.id, monthStr);
    return (
      <span className={count >= 1 ? 'text-green-600 text-sm font-bold' : 'text-gray-400 text-sm'}>
        {count >= 1 ? '✅ 今月済み' : '⬜ 今月未'}
      </span>
    );
  }

  if (category.frequency === 'monthly2') {
    const count = getMonthlyCheckCount(records, category.id, monthStr);
    return (
      <span className={count >= 2 ? 'text-green-600 text-sm font-bold' : count === 1 ? 'text-yellow-500 text-sm font-bold' : 'text-gray-400 text-sm'}>
        {count >= 2 ? '✅ 2回完了' : count === 1 ? '⚠️ 1回目済み' : '⬜ 今月未'}
      </span>
    );
  }

  return null;
}

type CardStatus = 'done' | 'draft' | 'none';

function getCardStatus(
  category: Category,
  records: CheckRecord[],
  drafts: CheckDraft[],
  shift: Shift,
  selectedDate: string,
): CardStatus {
  if (category.frequency !== 'daily1' && category.frequency !== 'daily2') return 'none';
  if (isCategoryDone(records, category.id, shift, selectedDate)) return 'done';
  if (isCategoryDraft(drafts, category.id, shift, selectedDate)) return 'draft';
  return 'none';
}

export default function CategoryPage({
  shift,
  selectedDate,
  categories,
  records,
  drafts,
  onSelectCategory,
  onBack,
  onGoHistory,
  onGoAdmin,
}: Props) {
  const shiftLabel = shift === 'day' ? '☀️ 日勤' : '🌙 夜勤';

  const [y, m, d] = selectedDate.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  const dateLabel = `${m}/${d}（${'日月火水木金土'[dow]}）`;

  const dailyCategories   = categories.filter(c => c.frequency === 'daily1' || c.frequency === 'daily2');
  const monthlyCategories = categories.filter(c => c.frequency === 'monthly1' || c.frequency === 'monthly2');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className={`${shift === 'day' ? 'bg-blue-500' : 'bg-indigo-700'} text-white px-4 py-4 flex items-center gap-3`}>
        <button onClick={onBack} className="text-white text-xl px-1">←</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">{shiftLabel} カテゴリ選択</h1>
          <p className="text-xs opacity-80">{dateLabel}　チェックするカテゴリを選んでください</p>
        </div>
        <button
          onClick={onGoAdmin}
          className="flex flex-col items-center gap-0.5 opacity-90 active:opacity-70"
        >
          <span className="text-xl">⚙️</span>
          <span className="text-xs">管理</span>
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">毎日チェック</h2>
        <div className="flex flex-col gap-3 mb-6">
          {dailyCategories.map(cat => {
            const status = getCardStatus(cat, records, drafts, shift, selectedDate);
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat)}
                className={`w-full text-left bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between border-2 transition-all active:scale-98 ${
                  status === 'done'  ? 'border-green-200'  :
                  status === 'draft' ? 'border-orange-200' :
                  'border-transparent'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-800">{cat.name}</span>
                    <FrequencyBadge frequency={cat.frequency} />
                  </div>
                  <StatusBadge category={cat} records={records} drafts={drafts} shift={shift} selectedDate={selectedDate} />
                </div>
                <span className="text-gray-300 text-xl">›</span>
              </button>
            );
          })}
        </div>

        {monthlyCategories.length > 0 && (
          <>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">月次チェック</h2>
            <div className="flex flex-col gap-3 mb-6">
              {monthlyCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat)}
                  className="w-full text-left bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between border-2 border-transparent transition-all active:scale-98"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-800">{cat.name}</span>
                      <FrequencyBadge frequency={cat.frequency} />
                    </div>
                    <StatusBadge category={cat} records={records} drafts={drafts} shift={shift} selectedDate={selectedDate} />
                  </div>
                  <span className="text-gray-300 text-xl">›</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="border-t border-gray-200 bg-white flex">
        <button
          onClick={onGoHistory}
          className="flex-1 py-4 text-sm text-gray-600 font-medium flex flex-col items-center gap-1 active:bg-gray-50"
        >
          <span className="text-xl">📋</span>
          履歴
        </button>
      </div>
    </div>
  );
}
