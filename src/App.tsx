import { useState } from 'react';
import type { Category, CheckRecord, Shift } from './types';
import { useCategories, useRecords } from './store/useStore';
import { gasClient } from './api/gasClient';
import HomePage     from './pages/HomePage';
import CategoryPage from './pages/CategoryPage';
import CheckPage    from './pages/CheckPage';
import HistoryPage  from './pages/HistoryPage';
import AdminPage    from './pages/AdminPage';

type Page =
  | { name: 'home' }
  | { name: 'category'; shift: Shift }
  | { name: 'check'; shift: Shift; category: Category }
  | { name: 'history' }
  | { name: 'admin' };

const GAS_ENABLED = Boolean(import.meta.env.VITE_GAS_URL && !import.meta.env.VITE_GAS_URL.includes('PLACEHOLDER'));

export default function App() {
  const [page, setPage] = useState<Page>({ name: 'home' });
  const { categories, saveCategories } = useCategories();
  const { records, addRecords }        = useRecords();

  const handleShiftSelect = (shift: Shift) => {
    setPage({ name: 'category', shift });
  };

  const handleCategorySelect = (shift: Shift, category: Category) => {
    setPage({ name: 'check', shift, category });
  };

  const handleCheckComplete = async (newRecords: CheckRecord[]) => {
    addRecords(newRecords);

    if (!GAS_ENABLED || newRecords.length === 0) return;

    const first = newRecords[0];
    try {
      await gasClient.saveRecord({
        date        : first.date,
        shift       : first.shift,
        categoryId  : first.categoryId,
        categoryName: first.categoryName,
        items       : newRecords.map(r => ({
          id           : r.itemId,
          name         : r.itemName,
          inputValue   : r.inputValue,
          standardStock: r.standardStock,
        })),
      });
    } catch {
      // GAS保存失敗はサイレントに無視（ローカル保存は成功済み）
    }
  };

  const handleSaveCategories = async (cats: Category[]) => {
    saveCategories(cats);

    if (!GAS_ENABLED) return;
    try {
      await gasClient.saveItems(cats);
    } catch {
      // GAS同期失敗はサイレントに無視
    }
  };

  if (page.name === 'home') {
    return <HomePage onSelectShift={handleShiftSelect} />;
  }

  if (page.name === 'category') {
    return (
      <CategoryPage
        shift={page.shift}
        categories={categories}
        records={records}
        onSelectCategory={cat => handleCategorySelect(page.shift, cat)}
        onBack={() => setPage({ name: 'home' })}
        onGoHistory={() => setPage({ name: 'history' })}
        onGoAdmin={() => setPage({ name: 'admin' })}
      />
    );
  }

  if (page.name === 'check') {
    return (
      <CheckPage
        shift={page.shift}
        category={page.category}
        onComplete={handleCheckComplete}
        onBack={() => setPage({ name: 'category', shift: page.shift })}
      />
    );
  }

  if (page.name === 'history') {
    return (
      <HistoryPage
        records={records}
        onBack={() => setPage({ name: 'home' })}
      />
    );
  }

  if (page.name === 'admin') {
    return (
      <AdminPage
        categories={categories}
        onSave={handleSaveCategories}
        onBack={() => setPage({ name: 'home' })}
        gasEnabled={GAS_ENABLED}
      />
    );
  }

  return null;
}
