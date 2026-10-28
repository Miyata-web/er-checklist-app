import { useState } from 'react';
import type { Shift } from '../types';

interface Props {
  shift: Shift;
  onSelectDate: (date: string) => void;
  onBack: () => void;
}

function offsetDate(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function formatDateJP(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return `${y}年${m}月${d}日（${'日月火水木金土'[dow]}）`;
}

function offsetLabel(offset: number): string {
  if (offset === 0)  return '今日';
  if (offset === -1) return '昨日';
  return `${Math.abs(offset)}日前`;
}

export default function DatePage({ shift, onSelectDate, onBack }: Props) {
  const [offset, setOffset] = useState(0);
  const selectedDate = offsetDate(offset);
  const shiftColor   = shift === 'day' ? 'bg-blue-500' : 'bg-indigo-700';
  const shiftLabel   = shift === 'day' ? '☀️ 日勤' : '🌙 夜勤';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className={`${shiftColor} text-white px-4 py-4 flex items-center gap-3`}>
        <button onClick={onBack} className="text-white text-xl px-1">←</button>
        <div>
          <h1 className="text-lg font-bold">日付の選択</h1>
          <p className="text-xs opacity-80">{shiftLabel} チェック</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <p className="text-sm text-gray-500 mb-8 text-center">
          チェックを行う日付を選択してください
        </p>

        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => setOffset(prev => Math.max(prev - 1, -3))}
            className="w-12 h-12 rounded-full bg-white shadow text-gray-600 text-xl font-bold flex items-center justify-center active:bg-gray-100 transition-colors"
          >
            ←
          </button>

          <div className="text-center min-w-[200px]">
            <p className="text-xl font-bold text-gray-800">{formatDateJP(selectedDate)}</p>
            <p className={`text-sm font-bold mt-1 ${
              offset === 0 ? 'text-blue-500' : 'text-orange-500'
            }`}>
              {offsetLabel(offset)}
            </p>
          </div>

          <button
            onClick={() => setOffset(prev => Math.min(prev + 1, 0))}
            disabled={offset >= 0}
            className="w-12 h-12 rounded-full bg-white shadow text-gray-600 text-xl font-bold flex items-center justify-center active:bg-gray-100 transition-colors disabled:opacity-30"
          >
            →
          </button>
        </div>

        <p className="text-xs text-gray-400 mb-10 text-center">
          ※ 夜勤が日付を跨ぐ場合は「昨日」を選択してください
        </p>

        <button
          onClick={() => onSelectDate(selectedDate)}
          className={`w-full max-w-xs py-5 rounded-2xl text-white text-lg font-bold shadow-md active:scale-95 transition-transform ${shiftColor}`}
        >
          この日付でチェック開始
        </button>
      </div>
    </div>
  );
}
