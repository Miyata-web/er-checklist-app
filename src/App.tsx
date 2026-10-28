import { useLayoutEffect, useState } from 'react';
import type { Category, CheckRecord, Shift } from './types';
import { useCategories, useRecords, useDrafts, useConfirmations, getTodayString } from './store/useStore';
import { gasClient } from './api/gasClient';
import HomePage     from './pages/HomePage';
import ShiftPage    from './pages/ShiftPage';
import NamePage     from './pages/NamePage';
import DatePage     from './pages/DatePage';
import CategoryPage from './pages/CategoryPage';
import CheckPage    from './pages/CheckPage';
import HistoryPage  from './pages/HistoryPage';
import AdminPage    from './pages/AdminPage';

type Page =
  | { name: 'home' }
  | { name: 'shift' }
  | { name: 'name'; shift: Shift }
  | { name: 'name-monthly' }
  | { name: 'date'; shift: Shift; checkerName: string }
  | { name: 'category'; shift: Shift; selectedDate: string; checkerName: string }
  | { name: 'category-monthly'; checkerName: string }
  | { name: 'check'; shift: Shift; selectedDate: string; category: Category; initialDeficits: Record<string, number>; checkerName: string }
  | { name: 'history'; groupId: string; shift: Shift; selectedDate: string }
  | { name: 'admin' };

const GAS_ENABLED = Boolean(import.meta.env.VITE_GAS_URL && !import.meta.env.VITE_GAS_URL.includes('PLACEHOLDER'));

export default function App() {
  const [page, setPage] = useState<Page>({ name: 'home' });

  // 画面切り替え時は前の画面のスクロール位置を引き継がず、先頭から表示する
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);
  const { categories, saveCategories, refresh: refreshCategories }       = useCategories();
  const { records, addRecords, refresh: refreshRecords }                  = useRecords();
  const { drafts, saveDraft, clearDraft }                                 = useDrafts();
  const { confirmations, addConfirmation, refresh: refreshConfirmations } = useConfirmations();

  const refreshAll = async () => {
    const results = await Promise.all([refreshCategories(), refreshRecords(), refreshConfirmations()]);
    return results.every(Boolean);
  };

  const handleCategorySelect = (shift: Shift, selectedDate: string, category: Category, checkerName: string) => {
    const initialDeficits: Record<string, number> = {};

    const draft = drafts.find(
      d => d.date === selectedDate && d.shift === shift && d.categoryId === category.id
    );
    if (draft) {
      draft.items.forEach(item => { initialDeficits[item.itemId] = item.deficit; });
    } else {
      const existing = records.filter(
        r => r.date === selectedDate && r.shift === shift && r.categoryId === category.id
      );
      if (existing.length > 0) {
        existing.forEach(r => { initialDeficits[r.itemId] = -r.diff; });
      } else if (shift === 'night') {
        const dayRecords = records.filter(
          r => r.date === selectedDate && r.shift === 'day' && r.categoryId === category.id
        );
        dayRecords.forEach(r => { initialDeficits[r.itemId] = -r.diff; });
      }
    }

    setPage({ name: 'check', shift, selectedDate, category, initialDeficits, checkerName });
  };

  const handleCheckComplete = async (newRecords: CheckRecord[]) => {
    addRecords(newRecords);

    if (newRecords.length > 0) {
      const first = newRecords[0];
      clearDraft(first.date, first.shift, first.categoryId);
    }

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
      // GAS保存失敗はサイレントに無視
    }
  };

  const handleSaveCategories = async (cats: Category[]) => {
    saveCategories(cats);
    if (!GAS_ENABLED) return;
    try {
      await gasClient.saveItems(cats);
    } catch { /* ignore */ }
  };

  if (page.name === 'home') {
    return (
      <HomePage
        onSelectDaily={() => setPage({ name: 'shift' })}
        onSelectMonthly={() => setPage({ name: 'name-monthly' })}
        onRefresh={refreshAll}
      />
    );
  }

  if (page.name === 'shift') {
    return (
      <ShiftPage
        onSelectShift={shift => setPage({ name: 'name', shift })}
        onBack={() => setPage({ name: 'home' })}
      />
    );
  }

  if (page.name === 'name') {
    return (
      <NamePage
        shift={page.shift}
        onNext={checkerName => setPage({ name: 'date', shift: page.shift, checkerName })}
        onBack={() => setPage({ name: 'shift' })}
      />
    );
  }

  if (page.name === 'name-monthly') {
    return (
      <NamePage
        onNext={checkerName => setPage({ name: 'category-monthly', checkerName })}
        onBack={() => setPage({ name: 'home' })}
      />
    );
  }

  if (page.name === 'date') {
    return (
      <DatePage
        shift={page.shift}
        onSelectDate={date => setPage({ name: 'category', shift: page.shift, selectedDate: date, checkerName: page.checkerName })}
        onBack={() => setPage({ name: 'name', shift: page.shift })}
      />
    );
  }

  if (page.name === 'category') {
    return (
      <CategoryPage
        mode="daily"
        shift={page.shift}
        selectedDate={page.selectedDate}
        categories={categories}
        records={records}
        drafts={drafts}
        confirmations={confirmations}
        onSelectCategory={cat => handleCategorySelect(page.shift, page.selectedDate, cat, page.checkerName)}
        onBack={() => setPage({ name: 'date', shift: page.shift, checkerName: page.checkerName })}
        onGoHistory={groupId => setPage({ name: 'history', groupId, shift: page.shift, selectedDate: page.selectedDate })}
        onGoAdmin={() => setPage({ name: 'admin' })}
        onRefresh={refreshAll}
      />
    );
  }

  if (page.name === 'category-monthly') {
    const today = getTodayString();
    return (
      <CategoryPage
        mode="monthly"
        shift="day"
        selectedDate={today}
        categories={categories}
        records={records}
        drafts={drafts}
        confirmations={confirmations}
        onSelectCategory={cat => handleCategorySelect('day', today, cat, page.checkerName)}
        onBack={() => setPage({ name: 'name-monthly' })}
        onGoHistory={() => {}}
        onGoAdmin={() => setPage({ name: 'admin' })}
        onRefresh={refreshAll}
      />
    );
  }

  if (page.name === 'check') {
    const isDaily = page.category.frequency === 'daily1' || page.category.frequency === 'daily2';
    const backTarget = isDaily
      ? { name: 'category' as const, shift: page.shift, selectedDate: page.selectedDate, checkerName: page.checkerName }
      : { name: 'category-monthly' as const, checkerName: page.checkerName };

    return (
      <CheckPage
        shift={page.shift}
        selectedDate={page.selectedDate}
        category={page.category}
        initialDeficits={page.initialDeficits}
        checkerName={page.checkerName}
        onComplete={handleCheckComplete}
        onInterrupt={items => {
          saveDraft({
            date      : page.selectedDate,
            shift     : page.shift,
            categoryId: page.category.id,
            items,
            timestamp : new Date().toISOString(),
          });
          setPage(backTarget);
        }}
        onBack={() => setPage(backTarget)}
      />
    );
  }

  if (page.name === 'history') {
    return (
      <HistoryPage
        records={records}
        categories={categories}
        groupId={page.groupId}
        shift={page.shift}
        selectedDate={page.selectedDate}
        confirmations={confirmations}
        onConfirm={addConfirmation}
        onRefresh={refreshAll}
        onBack={() => setPage({ name: 'category', shift: page.shift, selectedDate: page.selectedDate, checkerName: '' })}
      />
    );
  }

  if (page.name === 'admin') {
    return (
      <AdminPage
        categories={categories}
        records={records}
        onSave={handleSaveCategories}
        onBack={() => setPage({ name: 'home' })}
        gasEnabled={GAS_ENABLED}
      />
    );
  }

  return null;
}
