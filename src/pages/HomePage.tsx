import type { Shift } from '../types';

interface Props {
  onSelectShift: (shift: Shift) => void;
}

export default function HomePage({ onSelectShift }: Props) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日（${'日月火水木金土'[now.getDay()]}）`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">院内チェックリスト</h1>
          <p className="text-sm text-gray-500">{dateStr}</p>
        </div>

        <p className="text-center text-gray-600 mb-6 font-medium">時間帯を選択してください</p>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => onSelectShift('day')}
            className="w-full py-6 rounded-2xl bg-blue-500 text-white text-xl font-bold shadow-md active:scale-95 transition-transform"
          >
            ☀️ 日勤
            <span className="block text-sm font-normal mt-1 opacity-80">日中のチェック</span>
          </button>

          <button
            onClick={() => onSelectShift('night')}
            className="w-full py-6 rounded-2xl bg-indigo-700 text-white text-xl font-bold shadow-md active:scale-95 transition-transform"
          >
            🌙 夜勤
            <span className="block text-sm font-normal mt-1 opacity-80">夜間のチェック</span>
          </button>
        </div>
      </div>
    </div>
  );
}
