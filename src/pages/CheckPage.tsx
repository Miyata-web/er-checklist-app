import { useState } from 'react';
import type { Category, CheckRecord, Shift } from '../types';

interface ItemState {
  id: string;
  name: string;
  standardStock: number;
  deficit: number;
}

interface Props {
  shift: Shift;
  selectedDate: string;
  category: Category;
  initialDeficits: Record<string, number>;
  onComplete: (records: CheckRecord[]) => void;
  onInterrupt: (items: { itemId: string; deficit: number }[]) => void;
  onBack: () => void;
}

export default function CheckPage({ shift, selectedDate, category, initialDeficits, onComplete, onInterrupt, onBack }: Props) {
  const [items, setItems] = useState<ItemState[]>(
    category.items.map(item => ({
      id           : item.id,
      name         : item.name,
      standardStock: item.standardStock,
      deficit      : initialDeficits[item.id] ?? 0,
    }))
  );
  const [submitted, setSubmitted] = useState(false);

  const shiftLabel = shift === 'day' ? '☀️ 日勤' : '🌙 夜勤';

  const addDeficit = (index: number) => {
    setItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, deficit: item.deficit + 1 } : item
      )
    );
  };

  const reduceDeficit = (index: number) => {
    setItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, deficit: Math.max(0, item.deficit - 1) } : item
      )
    );
  };

  const handleComplete = () => {
    const newRecords: CheckRecord[] = items.map(item => ({
      recordId     : `${selectedDate}-${shift}-${category.id}-${item.id}-${Date.now()}`,
      date         : selectedDate,
      shift,
      categoryId   : category.id,
      categoryName : category.name,
      itemId       : item.id,
      itemName     : item.name,
      inputValue   : item.standardStock - item.deficit,
      standardStock: item.standardStock,
      diff         : -item.deficit,
      timestamp    : new Date().toISOString(),
    }));
    setSubmitted(true);
    onComplete(newRecords);
  };

  const handleInterrupt = () => {
    onInterrupt(items.map(item => ({ itemId: item.id, deficit: item.deficit })));
  };

  const hasDeficit = items.some(item => item.deficit > 0);
  const totalDeficit = items.reduce((sum, item) => sum + item.deficit, 0);

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">チェック完了</h2>
          <p className="text-gray-500 mb-1">{category.name}</p>
          {hasDeficit ? (
            <p className="text-red-500 font-bold mb-4">不足あり：合計 −{totalDeficit}</p>
          ) : (
            <p className="text-green-600 font-bold mb-4">全項目 定数通り</p>
          )}
          <button
            onClick={onBack}
            className="bg-blue-500 text-white px-8 py-3 rounded-xl font-bold"
          >
            カテゴリ選択に戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <div className={`${shift === 'day' ? 'bg-blue-500' : 'bg-indigo-700'} text-white px-4 py-4`}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-white text-xl px-1">←</button>
          <div>
            <h1 className="text-lg font-bold">{category.name}</h1>
            <p className="text-xs opacity-80">{shiftLabel}　カードまたは[−]で不足を記録</p>
          </div>
        </div>
      </div>

      {hasDeficit && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-600 font-medium">
          ⚠️ 不足あり：合計 −{totalDeficit}
        </div>
      )}

      {/* 項目リスト */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex flex-col gap-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              onClick={() => addDeficit(index)}
              className={`bg-white rounded-2xl shadow-sm p-4 cursor-pointer select-none active:scale-98 transition-transform ${
                item.deficit > 0 ? 'border-2 border-red-300' : 'border-2 border-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="font-bold text-gray-800 text-base leading-snug">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">定数: {item.standardStock}</p>
                </div>

                <div
                  className="flex items-center gap-3"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => reduceDeficit(index)}
                    disabled={item.deficit === 0}
                    className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 text-xl font-bold flex items-center justify-center active:bg-gray-200 disabled:opacity-30 transition-colors"
                  >
                    ＋
                  </button>

                  <span className={`w-12 text-center text-2xl font-bold tabular-nums ${
                    item.deficit > 0 ? 'text-red-500' : 'text-gray-300'
                  }`}>
                    {item.deficit > 0 ? `−${item.deficit}` : '−'}
                  </span>

                  <button
                    onClick={() => addDeficit(index)}
                    className="w-10 h-10 rounded-full bg-red-50 text-red-500 text-xl font-bold flex items-center justify-center active:bg-red-100 transition-colors"
                  >
                    −
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          カードをタップまたは[−]で不足を記録、[＋]で取り消し
        </p>
      </div>

      {/* ボタンエリア */}
      <div className="p-4 bg-white border-t border-gray-200 flex flex-col gap-2">
        <button
          onClick={handleComplete}
          className={`w-full py-4 rounded-2xl text-white text-lg font-bold shadow-md active:scale-98 transition-transform ${
            shift === 'day' ? 'bg-blue-500' : 'bg-indigo-700'
          }`}
        >
          チェック完了
        </button>
        <button
          onClick={handleInterrupt}
          className="w-full py-3 rounded-2xl text-gray-600 text-base font-bold bg-gray-100 active:bg-gray-200 transition-colors"
        >
          ⏸️ 中断（一時保存）
        </button>
      </div>
    </div>
  );
}
