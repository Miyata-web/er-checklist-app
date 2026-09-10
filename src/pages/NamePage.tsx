import { useState } from 'react';
import type { Shift } from '../types';

const STORAGE_KEY = 'er-checklist-checker-name';

interface Props {
  shift?: Shift;
  onNext: (name: string) => void;
  onBack: () => void;
}

export default function NamePage({ shift, onNext, onBack }: Props) {
  const [name, setName] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '');

  const handleNext = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem(STORAGE_KEY, trimmed);
    onNext(trimmed);
  };

  const isDay   = shift === 'day';
  const isNight = shift === 'night';
  const headerBg   = isDay ? 'bg-blue-500' : isNight ? 'bg-indigo-700' : 'bg-teal-600';
  const shiftLabel = isDay ? '☀️ 日勤' : isNight ? '🌙 夜勤' : '月々のチェック';
  const btnBg      = isDay ? 'bg-blue-500' : isNight ? 'bg-indigo-700' : 'bg-teal-600';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className={`${headerBg} text-white px-4 py-4 flex items-center gap-3`}>
        <button onClick={onBack} className="text-white text-xl px-1">←</button>
        <div>
          <h1 className="text-lg font-bold">記録者の入力</h1>
          <p className="text-xs opacity-80">{shiftLabel}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <p className="text-sm text-gray-500 mb-6 text-center">
          チェックを行う方の名前を入力してください
        </p>

        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleNext()}
          placeholder="例：山田 太郎"
          autoFocus
          className="w-full max-w-xs text-center text-xl font-bold text-gray-800 border-b-2 border-gray-300 focus:border-blue-400 outline-none bg-transparent py-3 mb-8"
        />

        <button
          onClick={handleNext}
          disabled={!name.trim()}
          className={`w-full max-w-xs py-5 rounded-2xl text-white text-lg font-bold shadow-md active:scale-95 transition-transform disabled:opacity-40 ${btnBg}`}
        >
          次へ
        </button>
      </div>
    </div>
  );
}
