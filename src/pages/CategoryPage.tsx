import type { Category, CheckDraft, CheckRecord, GroupConfirmation, Shift } from '../types';
import {
  getMonthlyCheckCount,
  isCategoryDone,
  isCategoryDraft,
} from '../store/useStore';
import { HISTORY_GROUPS } from '../store/historyGroups';
import type { HistoryGroup } from '../store/historyGroups';

export type CategoryPageMode = 'daily' | 'monthly';

interface Props {
  mode: CategoryPageMode;
  shift: Shift;
  selectedDate: string;
  categories: Category[];
  records: CheckRecord[];
  drafts: CheckDraft[];
  confirmations: GroupConfirmation[];
  onSelectCategory: (category: Category) => void;
  onBack: () => void;
  onGoHistory: (groupId: string) => void;
  onGoAdmin: () => void;
}

type GroupStatus = 'none' | 'deficit' | 'ok' | 'confirmed';

function getGroupStatus(
  group: HistoryGroup,
  records: CheckRecord[],
  confirmations: GroupConfirmation[],
  date: string,
  shift: Shift,
): GroupStatus {
  const recs = records.filter(r => group.ids.has(r.categoryId) && r.date === date);
  if (recs.length === 0) return 'none';
  if (confirmations.some(c => c.groupId === group.id && c.date === date && c.shift === shift)) return 'confirmed';
  if (recs.some(r => r.diff < 0)) return 'deficit';
  return 'ok';
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
  mode,
  shift,
  selectedDate,
  categories,
  records,
  drafts,
  confirmations,
  onSelectCategory,
  onBack,
  onGoHistory,
  onGoAdmin,
}: Props) {
  const isDaily = mode === 'daily';

  const shiftLabel = shift === 'day' ? '☀️ 日勤' : '🌙 夜勤';
  const [y, m, d] = selectedDate.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  const dateLabel = `${m}/${d}（${'日月火水木金土'[dow]}）`;

  // Filter categories by mode and (for daily) by shift applicability
  const visibleCategories = categories.filter(cat => {
    if (isDaily) {
      const isDaily_ = cat.frequency === 'daily1' || cat.frequency === 'daily2';
      if (!isDaily_) return false;
      // If category has a shiftFilter, only show when shift matches
      if (cat.shiftFilter && !cat.shiftFilter.includes(shift)) return false;
      return true;
    } else {
      return cat.frequency === 'monthly1' || cat.frequency === 'monthly2';
    }
  });

  const dailyCategories   = visibleCategories.filter(c => c.frequency === 'daily1' || c.frequency === 'daily2');
  const monthlyCategories = visibleCategories.filter(c => c.frequency === 'monthly1' || c.frequency === 'monthly2');

  const headerBg = isDaily
    ? (shift === 'day' ? 'bg-blue-500' : 'bg-indigo-700')
    : 'bg-teal-600';

  const headerTitle = isDaily ? `${shiftLabel} カテゴリ選択` : '月々のチェック';
  const headerSub   = isDaily
    ? `${dateLabel}　チェックするカテゴリを選んでください`
    : `${dateLabel}　チェックするカテゴリを選んでください`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className={`${headerBg} text-white px-4 py-4 flex items-center gap-3`}>
        <button onClick={onBack} className="text-white text-xl px-1">←</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">{headerTitle}</h1>
          <p className="text-xs opacity-80">{headerSub}</p>
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
        {isDaily && dailyCategories.length > 0 && (
          <>
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
          </>
        )}

        {!isDaily && monthlyCategories.length > 0 && (
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

        {/* グループ別履歴（日々チェックのみ） */}
        {isDaily && (
          <>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">グループ別履歴</h2>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {HISTORY_GROUPS.map(group => {
                const status = getGroupStatus(group, records, confirmations, selectedDate, shift);
                const styles = {
                  none      : 'bg-white border-transparent text-gray-700',
                  ok        : 'bg-green-50 border-green-200 text-green-700',
                  deficit   : 'bg-red-50 border-red-300 text-red-700',
                  confirmed : 'bg-blue-50 border-blue-200 text-blue-700',
                }[status];
                const icon = {
                  none      : '📋',
                  ok        : '✅',
                  deficit   : '⚠️',
                  confirmed : '✅',
                }[status];
                const subLabel = {
                  none      : '',
                  ok        : '不足なし',
                  deficit   : '不足あり',
                  confirmed : '確認済み',
                }[status];

                return (
                  <button
                    key={group.id}
                    onClick={() => onGoHistory(group.id)}
                    className={`rounded-2xl shadow-sm px-3 py-3 flex flex-col gap-0.5 border-2 active:opacity-70 text-left ${styles}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-base shrink-0">{icon}</span>
                      <span className="text-sm font-bold leading-tight">{group.label}</span>
                    </div>
                    {subLabel && (
                      <span className="text-xs font-medium pl-6">{subLabel}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
