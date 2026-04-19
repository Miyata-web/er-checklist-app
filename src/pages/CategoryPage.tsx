import type { Category, CheckRecord, Shift } from '../types';
import {
  getTodayString,
  getMonthString,
  isCategoryDone,
  getMonthlyCheckCount,
} from '../store/useStore';

interface Props {
  shift: Shift;
  categories: Category[];
  records: CheckRecord[];
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
  shift,
}: {
  category: Category;
  records: CheckRecord[];
  shift: Shift;
}) {
  const today     = getTodayString();
  const monthStr  = getMonthString();

  if (category.frequency === 'daily2') {
    const dayDone   = isCategoryDone(records, category.id, 'day', today);
    const nightDone = isCategoryDone(records, category.id, 'night', today);
    return (
      <div className="flex gap-2 text-sm">
        <span className={dayDone ? 'text-green-600 font-bold' : 'text-gray-400'}>
          {dayDone ? '✅ 日勤済' : '⬜ 日勤未'}
        </span>
        <span className={nightDone ? 'text-indigo-600 font-bold' : 'text-gray-400'}>
          {nightDone ? '✅ 夜勤済' : '⬜ 夜勤未'}
        </span>
      </div>
    );
  }

  if (category.frequency === 'daily1') {
    const done = isCategoryDone(records, category.id, shift, today);
    return (
      <span className={done ? 'text-green-600 text-sm font-bold' : 'text-gray-400 text-sm'}>
        {done ? '✅ 完了' : '⬜ 未完了'}
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

function isCurrentShiftDone(
  category: Category,
  records: CheckRecord[],
  shift: Shift
): boolean {
  const today = getTodayString();
  if (category.frequency === 'daily2') {
    return isCategoryDone(records, category.id, shift, today);
  }
  if (category.frequency === 'daily1') {
    return isCategoryDone(records, category.id, shift, today);
  }
  return false;
}

export default function CategoryPage({
  shift,
  categories,
  records,
  onSelectCategory,
  onBack,
  onGoHistory,
  onGoAdmin,
}: Props) {
  const shiftLabel = shift === 'day' ? '☀️ 日勤' : '🌙 夜勤';

  const dailyCategories   = categories.filter(c => c.frequency === 'daily1' || c.frequency === 'daily2');
  const monthlyCategories = categories.filter(c => c.frequency === 'monthly1' || c.frequency === 'monthly2');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <div className={`${shift === 'day' ? 'bg-blue-500' : 'bg-indigo-700'} text-white px-4 py-4 flex items-center gap-3`}>
        <button onClick={onBack} className="text-white text-xl px-1">←</button>
        <div>
          <h1 className="text-lg font-bold">{shiftLabel} カテゴリ選択</h1>
          <p className="text-xs opacity-80">チェックするカテゴリを選んでください</p>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {/* 毎日チェック */}
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">毎日チェック</h2>
        <div className="flex flex-col gap-3 mb-6">
          {dailyCategories.map(cat => {
            const done = isCurrentShiftDone(cat, records, shift);
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat)}
                className={`w-full text-left bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between border-2 transition-all active:scale-98 ${
                  done ? 'border-green-200' : 'border-transparent'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-800">{cat.name}</span>
                    <FrequencyBadge frequency={cat.frequency} />
                  </div>
                  <StatusBadge category={cat} records={records} shift={shift} />
                </div>
                <span className="text-gray-300 text-xl">›</span>
              </button>
            );
          })}
        </div>

        {/* 月次チェック */}
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
                    <StatusBadge category={cat} records={records} shift={shift} />
                  </div>
                  <span className="text-gray-300 text-xl">›</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 下部ナビ */}
      <div className="border-t border-gray-200 bg-white flex">
        <button
          onClick={onGoHistory}
          className="flex-1 py-4 text-sm text-gray-600 font-medium flex flex-col items-center gap-1 active:bg-gray-50"
        >
          <span className="text-xl">📋</span>
          履歴
        </button>
        <button
          onClick={onGoAdmin}
          className="flex-1 py-4 text-sm text-gray-600 font-medium flex flex-col items-center gap-1 active:bg-gray-50"
        >
          <span className="text-xl">⚙️</span>
          管理
        </button>
      </div>
    </div>
  );
}
