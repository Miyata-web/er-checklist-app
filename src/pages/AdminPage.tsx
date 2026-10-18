import { useState } from 'react';
import type { Category, CheckItem, CheckRecord, Frequency } from '../types';

interface Props {
  categories: Category[];
  records: CheckRecord[];
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

export default function AdminPage({ categories, records, onSave, onBack, gasEnabled }: Props) {
  const [cats, setCats] = useState<Category[]>(categories);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saved, setSaved]     = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  // エクスポート設定
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);
  const [exportFrom, setExportFrom] = useState(firstOfMonth);
  const [exportTo,   setExportTo]   = useState(todayStr);
  const [managerName, setManagerName] = useState('');
  const [selectedCatIds, setSelectedCatIds] = useState<Set<string>>(() => new Set());
  const toggleCat = (id: string) =>
    setSelectedCatIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelectedCatIds(prev =>
      prev.size === categories.length ? new Set() : new Set(categories.map(c => c.id))
    );

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

  const buildPivotData = (from: string, to: string, filterIds?: Set<string>) => {
    const DOW = '日月火水木金土';
    const filtered = records.filter(r => r.date >= from && r.date <= to);

    const cols = [...new Set(
      filtered.map(r => `${r.date}|${r.shift}`)
    )].sort((a, b) => {
      const [ad, as_] = a.split('|');
      const [bd, bs]  = b.split('|');
      if (ad !== bd) return ad.localeCompare(bd);
      return (as_ === 'day' ? 0 : 1) - (bs === 'day' ? 0 : 1);
    });

    const colHeaders = cols.map(c => {
      const d = new Date(c.split('|')[0] + 'T00:00:00');
      return {
        date : `${d.getMonth()+1}/${d.getDate()}(${DOW[d.getDay()]})`,
        shift: c.split('|')[1] === 'day' ? '日勤' : '夜勤',
        key  : c,
      };
    });

    const recByCat = new Map<string, typeof filtered>();
    filtered.forEach(r => {
      if (!recByCat.has(r.categoryId)) recByCat.set(r.categoryId, []);
      recByCat.get(r.categoryId)!.push(r);
    });

    return categories
      .filter(cat => !filterIds || filterIds.has(cat.id))
      .map(cat => {
        const catRecords = recByCat.get(cat.id);
        if (!catRecords || catRecords.length === 0) return null;

        const itemRows = cat.items.map(item => ({
          name        : item.name,
          isControlled: !!item.isControlled,
          cells       : cols.map(col => {
            const [date, shift] = col.split('|') as [string, string];
            const rec = catRecords.find(r => r.itemId === item.id && r.date === date && r.shift === shift);
            if (!rec) return '';
            return rec.diff === 0 ? '✓' : String(rec.diff);
          }),
        }));

        const checkerRow = cols.map(col => {
          const [date, shift] = col.split('|') as [string, string];
          const rec = catRecords.find(r => r.date === date && r.shift === shift);
          return rec?.checkerName ?? '';
        });

        const checkedCols = cols.map(col => {
          const [date, shift] = col.split('|') as [string, string];
          return catRecords.some(r => r.date === date && r.shift === shift);
        });

        return { catName: cat.name, requiresApproval: !!cat.requiresApproval, colHeaders, itemRows, checkerRow, checkedCols };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);
  };

  const exportPivotCsv = () => {
    const sections = buildPivotData(exportFrom, exportTo, selectedCatIds);
    if (sections.length === 0) return;

    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const csvSections = sections.map(({ catName, colHeaders, itemRows, checkerRow }) => {
      const lines: string[] = [];
      lines.push([esc(catName), '', ...Array(colHeaders.length).fill('')].join(','));
      lines.push(['品目名', '劇薬', ...colHeaders.map(h => esc(h.date))].join(','));
      lines.push(['', '', ...colHeaders.map(h => esc(h.shift))].join(','));
      itemRows.forEach(row => {
        lines.push([esc(row.name), row.isControlled ? '劇' : '', ...row.cells].join(','));
      });
      lines.push(['チェック者', '', ...checkerRow.map(n => esc(n))].join(','));
      if (managerName.trim()) {
        lines.push([esc(`師長: ${managerName.trim()}`), '', ...Array(colHeaders.length).fill('')].join(','));
      }
      return lines.join('\n');
    });

    const csv = '\uFEFF' + csvSections.join('\n\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `checklist_${exportFrom}_${exportTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPreview = () => {
    const sections = buildPivotData(exportFrom, exportTo, selectedCatIds);
    if (sections.length === 0) return;

    const DOW = '日月火水木金土';
    const fromD = new Date(exportFrom + 'T00:00:00');
    const toD   = new Date(exportTo   + 'T00:00:00');
    const fmtDate = (d: Date) => `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日(${DOW[d.getDay()]})`;

    const stampHtmlCell = (name: string) => name
      ? `<div class="stamp-cell"><div class="stamp-mini"><div class="stamp-mini-label">承認</div><div class="stamp-mini-name">${name}</div></div></div>`
      : `<div class="stamp-cell"></div>`;

    const tableHtml = sections.map(({ catName, requiresApproval, colHeaders, itemRows, checkerRow, checkedCols }) => {
      const thDate  = colHeaders.map(h => `<th class="date-cell">${h.date}</th>`).join('');
      const thShift = colHeaders.map(h => `<th class="shift-cell">${h.shift}</th>`).join('');
      const itemTrs = itemRows.map(row => {
        const cells = row.cells.map(c => {
          const cls = c === '✓' ? 'ok' : c.startsWith('-') ? 'ng' : 'empty';
          return `<td class="${cls}">${c}</td>`;
        }).join('');
        return `<tr><td class="item-name">${row.name}</td><td class="controlled">${row.isControlled ? '劇' : ''}</td>${cells}</tr>`;
      }).join('');
      const checkerTds = checkerRow.map(n => `<td class="checker-cell">${n}</td>`).join('');
      const stampTds = requiresApproval && managerName.trim()
        ? checkedCols.map(checked => checked ? `<td class="stamp-td">${stampHtmlCell(managerName.trim())}</td>` : '<td></td>').join('')
        : '';
      const stampRow = requiresApproval && managerName.trim()
        ? `<tr class="stamp-row"><td class="item-name">確認印</td><td></td>${stampTds}</tr>`
        : '';
      return `
        <div class="category-block">
          <h3>${catName}</h3>
          <table>
            <thead>
              <tr><th class="item-name-h">品目名</th><th class="controlled-h">劇薬</th>${thDate}</tr>
              <tr><th></th><th></th>${thShift}</tr>
            </thead>
            <tbody>
              ${itemTrs}
              <tr class="checker-row"><td class="item-name">チェック者</td><td></td>${checkerTds}</tr>
              ${stampRow}
            </tbody>
          </table>
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>救急カート薬剤チェック記録</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; font-size: 10px; padding: 12mm; color: #111; }
  h1 { font-size: 14px; text-align: center; margin-bottom: 4px; }
  .period { font-size: 10px; text-align: center; color: #555; margin-bottom: 12px; }
  .print-btn { display: block; margin: 0 auto 16px; padding: 8px 24px; background: #1e40af; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; }
  .category-block { margin-bottom: 16px; page-break-inside: avoid; }
  h3 { font-size: 11px; background: #1e40af; color: white; padding: 3px 6px; margin-bottom: 0; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 2px 4px; text-align: center; white-space: nowrap; }
  .item-name, .item-name-h { text-align: left; min-width: 100px; max-width: 150px; white-space: normal; word-break: break-all; }
  .controlled, .controlled-h { width: 24px; color: #dc2626; font-weight: bold; }
  .date-cell { background: #eff6ff; font-weight: bold; }
  .shift-cell { background: #f0f9ff; }
  .ok { color: #16a34a; font-weight: bold; }
  .ng { color: #dc2626; font-weight: bold; }
  .empty { color: #ddd; }
  .checker-row td { background: #f9fafb; font-size: 9px; color: #555; }
  .checker-cell { font-size: 9px; }
  .stamp-row td { background: #fff8f8; }
  .stamp-td { padding: 4px 2px; text-align: center; }
  .stamp-cell { display: flex; justify-content: center; align-items: center; }
  .stamp-mini { width: 40px; height: 40px; border: 2px solid #dc2626; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .stamp-mini-label { font-size: 6px; color: #dc2626; border-bottom: 1px solid #dc2626; padding-bottom: 1px; margin-bottom: 1px; line-height: 1; }
  .stamp-mini-name { font-size: 9px; font-weight: bold; color: #dc2626; line-height: 1; }
  .footer { display: flex; justify-content: flex-end; align-items: center; margin-top: 16px; gap: 16px; }
  .footer-label { font-size: 10px; color: #555; }
  @media print { .print-btn { display: none; } }
</style>
</head>
<body>
<h1>救急カート薬剤チェック記録</h1>
<p class="period">${fmtDate(fromD)} 〜 ${fmtDate(toD)}</p>
<button class="print-btn" onclick="window.print()">🖨️ 印刷する</button>
${tableHtml}

</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
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

        {/* データ出力 */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <h2 className="text-sm font-bold text-gray-600 mb-3">データ出力</h2>

          {/* 期間選択 */}
          <div className="flex items-center gap-2 mb-3">
            <input
              type="date"
              value={exportFrom}
              onChange={e => setExportFrom(e.target.value)}
              className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-300"
            />
            <span className="text-xs text-gray-400">〜</span>
            <input
              type="date"
              value={exportTo}
              onChange={e => setExportTo(e.target.value)}
              className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-300"
            />
          </div>

          {/* 師長名 */}
          <div className="mb-3">
            <input
              type="text"
              value={managerName}
              onChange={e => setManagerName(e.target.value)}
              placeholder="師長名（省略可）"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-300"
            />
          </div>

          {/* カテゴリ選択 */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-gray-500">出力するカテゴリ</span>
              <button onClick={toggleAll} className="text-xs text-blue-500 underline">
                {selectedCatIds.size === categories.length ? '全解除' : '全選択'}
              </button>
            </div>
            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
              {categories.map(cat => (
                <label key={cat.id} className="flex items-center gap-2 cursor-pointer py-1 px-2 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedCatIds.has(cat.id)}
                    onChange={() => toggleCat(cat.id)}
                    className="w-4 h-4 accent-blue-500"
                  />
                  <span className="text-xs text-gray-700">{cat.name}</span>
                </label>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-3">
            品目×日付のピボット形式。定数通りはレ点、不足はマイナス表記。
          </p>

          {selectedCatIds.size === 0 && (
            <p className="text-xs text-orange-500 mb-2">出力するカテゴリを選択してください</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={exportPivotCsv}
              disabled={records.length === 0 || selectedCatIds.size === 0}
              className="flex-1 py-3 rounded-xl bg-green-500 text-white text-sm font-bold active:bg-green-600 transition-colors disabled:opacity-40"
            >
              📥 CSV
            </button>
            <button
              onClick={printPreview}
              disabled={records.length === 0 || selectedCatIds.size === 0}
              className="flex-1 py-3 rounded-xl bg-blue-500 text-white text-sm font-bold active:bg-blue-600 transition-colors disabled:opacity-40"
            >
              🖨️ 印刷プレビュー
            </button>
          </div>
        </div>

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
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
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
                    <label
                      className="flex items-center gap-1 cursor-pointer"
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={!!cat.requiresApproval}
                        onChange={e => updateCategory(cat.id, { requiresApproval: e.target.checked })}
                        className="w-3.5 h-3.5 accent-red-500"
                      />
                      <span className="text-xs text-red-600 font-medium">要確認印</span>
                    </label>
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
                      <div key={item.id} className="flex flex-col gap-1 bg-gray-50 rounded-xl p-3">
                        <div className="flex items-center gap-2">
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
                        <label className="flex items-center gap-1.5 cursor-pointer w-fit">
                          <input
                            type="checkbox"
                            checked={!!item.isControlled}
                            onChange={e => updateItem(cat.id, item.id, { isControlled: e.target.checked })}
                            className="w-4 h-4 accent-red-500"
                          />
                          <span className="text-xs text-red-600 font-medium">劇薬</span>
                        </label>
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
