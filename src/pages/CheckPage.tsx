import { useState } from 'react';
import type { Category, CheckRecord, Shift } from '../types';
import { getTodayString } from '../store/useStore';

interface ItemState {
  id: string;
  name: string;
  standardStock: number;
  inputValue: number;
}

interface Props {
  shift: Shift;
  category: Category;
  onComplete: (records: CheckRecord[]) => void;
  onBack: () => void;
}

export default function CheckPage({ shift, category, onComplete, onBack }: Props) {
  const [items, setItems] = useState<ItemState[]>(
    category.items.map(item => ({
      id           : item.id,
      name         : item.name,
      standardStock: item.standardStock,
      inputValue   : item.standardStock,
    }))
  );
  const [submitted, setSubmitted] = useState(false);

  const shiftLabel = shift === 'day' ? '☀️ 日勤' : '🌙 夜勤';

  const decrement = (index: number) => {
    setItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, inputValue: Math.max(0, item.inputValue - 1) } : item
      )
    );
  };

  const increment = (index: number) => {
    setItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, inputValue: item.inputValue + 1 } : item
      )
    );
  };

  const handleComplete = () => {
    const today = getTodayString();
    const newRecords: CheckRecord[] = items.map(item => ({
      recordId     : `${today}-${shift}-${category.id}-${item.id}-${Date.now()}`,
      date         : today,
      shift,
      categoryId   : category.id,
      categoryName : category.name,
      itemId       : item.id,
      itemName     : item.name,
      inputValue   : item.inputValue,
      standardStock: item.standardStock,
      diff         : item.inputValue - item.standardStock,
      timestamp    : new Date().toISOString(),
    }));
    setSubmitted(true);
    onComplete(newRecords);
  };

  const hasDeficit = items.some(item => item.inputValue < item.standardStock);

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">チェック完了</h2>
          <p className="text-gray-500 mb-6">{category.name}のチェックを記録しました</p>
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
        <div className="flex items-center gap-3 mb-1">
          <button onClick={onBack} className="text-white text-xl px-1">←</button>
          <div>
            <h1 className="text-lg font-bold">{category.name}</h1>
            <p className="text-xs opacity-80">{shiftLabel}</p>
          </div>
        </div>
      </div>

      {hasDeficit && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-600 font-medium">
          ⚠️ 基準より少ない項目があります
        </div>
      )}

      {/* 項目リスト */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex flex-col gap-3">
          {items.map((item, index) => {
            const diff = item.inputValue - item.standardStock;
            const isLow = diff < 0;
            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl shadow-sm p-4 ${isLow ? 'border-2 border-red-300' : ''}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-400">基準: {item.standardStock}</p>
                  </div>
                  {isLow && (
                    <span className="text-red-500 font-bold text-lg">
                      {diff}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-center gap-6">
                  <button
                    onClick={() => decrement(index)}
                    className="w-12 h-12 rounded-full bg-gray-100 text-gray-700 text-2xl font-bold flex items-center justify-center active:bg-gray-200 transition-colors"
                  >
                    −
                  </button>
                  <span className={`text-3xl font-bold w-12 text-center ${isLow ? 'text-red-500' : 'text-gray-800'}`}>
                    {item.inputValue}
                  </span>
                  <button
                    onClick={() => increment(index)}
                    className="w-12 h-12 rounded-full bg-gray-100 text-gray-700 text-2xl font-bold flex items-center justify-center active:bg-gray-200 transition-colors"
                  >
                    ＋
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 完了ボタン */}
      <div className="p-4 bg-white border-t border-gray-200">
        <button
          onClick={handleComplete}
          className={`w-full py-4 rounded-2xl text-white text-lg font-bold shadow-md active:scale-98 transition-transform ${
            shift === 'day' ? 'bg-blue-500' : 'bg-indigo-700'
          }`}
        >
          チェック完了
        </button>
      </div>
    </div>
  );
}
