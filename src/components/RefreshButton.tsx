import { useState } from 'react';

type Status = 'idle' | 'loading' | 'done' | 'error';

const LABEL: Record<Status, string> = {
  idle: '更新',
  loading: '更新中',
  done: '更新済',
  error: '失敗',
};

export default function RefreshButton({ onRefresh, tone = 'dark' }: {
  onRefresh: () => Promise<boolean>;
  tone?: 'dark' | 'light';
}) {
  const [status, setStatus] = useState<Status>('idle');

  const handleClick = async () => {
    if (status === 'loading') return;
    setStatus('loading');
    const ok = await onRefresh();
    setStatus(ok ? 'done' : 'error');
    setTimeout(() => setStatus('idle'), 2000);
  };

  const color = tone === 'light'
    ? 'text-white'
    : status === 'error' ? 'text-red-500' : 'text-gray-500';

  return (
    <button
      onClick={handleClick}
      disabled={status === 'loading'}
      className={`flex flex-col items-center gap-0.5 opacity-90 active:opacity-70 shrink-0 ${color}`}
    >
      <span className={`text-xl leading-none ${status === 'loading' ? 'animate-spin' : ''}`}>↻</span>
      <span className="text-[10px] leading-none">{LABEL[status]}</span>
    </button>
  );
}
