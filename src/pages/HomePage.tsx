interface Props {
  onSelectDaily: () => void;
  onSelectMonthly: () => void;
}

export default function HomePage({ onSelectDaily, onSelectMonthly }: Props) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日（${'日月火水木金土'[now.getDay()]}）`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">院内チェックリスト</h1>
          <p className="text-sm text-gray-500">{dateStr}</p>
        </div>

        <p className="text-center text-gray-600 mb-6 font-medium">チェックの種類を選択してください</p>

        <div className="flex flex-col gap-4">
          <button
            onClick={onSelectDaily}
            className="w-full py-6 rounded-2xl bg-blue-500 text-white text-xl font-bold shadow-md active:scale-95 transition-transform"
          >
            📋 日々のチェック
            <span className="block text-sm font-normal mt-1 opacity-80">日勤・夜勤の定数チェック</span>
          </button>

          <button
            onClick={onSelectMonthly}
            className="w-full py-6 rounded-2xl bg-teal-600 text-white text-xl font-bold shadow-md active:scale-95 transition-transform"
          >
            📅 月々のチェック
            <span className="block text-sm font-normal mt-1 opacity-80">月次定期チェック</span>
          </button>
        </div>
      </div>
    </div>
  );
}
