import { useState } from 'react';
import type { Category, CheckItem, Frequency } from '../types';

interface Props {
  categories: Category[];
  onSave: (categories: Category[]) => void;
  onBack: () => void;
  gasEnabled?: boolean;
}

const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily2  : '毎日2回',
  daily1  : '毎日1回',
  monthly1: '月1回',
  monthly2: '月2回',
};

function generateId(): string {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function AdminPage({ categories, onSave, onBack, gasEnabled }: Props) {
  const [cats, setCats] = useState<Category[]>(categories);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saved, setSaved]     = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const handleSave = () => {
    onSave(cats);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleGasSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      await onSave(cats);
      setSyncMsg('✅ GASに同期しました');
    } catch {
      setSyncMsg('❌ 同期に失敗しました');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(''), 3000);
    }
  };

  const addCategory = () => {
    const newCat: Category = {
      id       : generateId(),
      name     : '新しいカテゴリ',
      frequency: 'daily2',
      items    : [],
    };
    setCats(prev => [...prev, newCat]);
    setExpandedId(newCat.id);
  };

  const updateCategory = (id: string, changes: Partial<Category>) => {
    setCats(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c));
  };

  const deleteCategory = (id: string) => {
    if (!confirm('このカテゴリを削除しますか？')) return;
    setCats(prev => prev.filter(c => c.id !== id));
  };

  const addItem = (catId: string) => {
    const newItem: CheckItem = {
      id           : generateId(),
      name         : '新しい項目',
      standardStock: 1,
    };
    setCats(prev =>
      prev.map(c => c.id === catId ? { ...c, items: [...c.items, newItem] } : c)
    );
  };

  const updateItem = (catId: string, itemId: string, changes: Partial<CheckItem>) => {
    setCats(prev =>
      prev.map(c =>
        c.id === catId
          ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, ...changes } : i) }
          : c
      )
    );
  };

  const deleteItem = (catId: string, itemId: string) => {
    setCats(prev =>
      prev.map(c =>
        c.id === catId ? { ...c, items: c.items.filter(i => i.id !== itemId) } : c
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-gray-600 text-xl px-1">←</button>
            <h1 className="text-lg font-bold text-gray-800">項目管理</h1>
          </div>
          <button
            onClick={handleSave}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              saved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
            }`}
          >
            {saved ? '✅ 保存済み' : '保存'}
          </button>
        </div>
        {gasEnabled && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleGasSync}
              disabled={syncing}
              className="text-xs bg-green-50 border border-green-300 text-green-700 px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
            >
              {syncing ? '同期中...' : '☁️ GASに同期'}
            </button>
            {syncMsg && <span className="text-xs text-gray-500">{syncMsg}</span>}
          </div>
        )}
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex flex-col gap-3">
          {cats.map(cat => (
            <div key={cat.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* カテゴリヘッダー */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedId(expandedId === cat.id ? null : cat.id)}
              >
                <div className="flex-1 mr-2">
                  <input
                    className="font-bold text-gray-800 bg-transparent w-full focus:outline-none border-b border-transparent focus:border-blue-300"
                    value={cat.name}
                    onChange={e => updateCategory(cat.id, { name: e.target.value })}
                    onClick={e => e.stopPropagation()}
                  />
                  <div className="mt-1">
                    <select
                      className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 border-none focus:outline-none"
                      value={cat.frequency}
                      onChange={e => updateCategory(cat.id, { frequency: e.target.value as Frequency })}
                      onClick={e => e.stopPropagation()}
                    >
                      {Object.entries(FREQUENCY_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); deleteCategory(cat.id); }}
                    className="text-red-400 text-sm px-2 py-1"
                  >
                    削除
                  </button>
                  <span className="text-gray-400">{expandedId === cat.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* 項目一覧 */}
              {expandedId === cat.id && (
                <div className="border-t border-gray-100 p-4">
                  <div className="flex flex-col gap-2 mb-3">
                    {cat.items.map(item => (
                      <div key={item.id} className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                        <input
                          className="flex-1 bg-transparent text-sm text-gray-700 focus:outline-none"
                          value={item.name}
                          onChange={e => updateItem(cat.id, item.id, { name: e.target.value })}
                          placeholder="項目名"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">基準:</span>
                          <input
                            type="number"
                            className="w-14 text-center text-sm font-bold text-gray-700 bg-white rounded-lg border border-gray-200 py-1 focus:outline-none focus:border-blue-300"
                            value={item.standardStock}
                            min={0}
                            onChange={e => updateItem(cat.id, item.id, { standardStock: Number(e.target.value) })}
                          />
                        </div>
                        <button
                          onClick={() => deleteItem(cat.id, item.id)}
                          className="text-red-400 text-lg px-1"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => addItem(cat.id)}
                    className="w-full py-2 text-sm text-blue-500 font-medium border-2 border-dashed border-blue-200 rounded-xl"
                  >
                    ＋ 項目を追加
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addCategory}
          className="w-full mt-4 py-4 text-blue-500 font-bold border-2 border-dashed border-blue-200 rounded-2xl"
        >
          ＋ カテゴリを追加
        </button>
      </div>
    </div>
  );
}
