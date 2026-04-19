export interface HistoryGroup {
  id: string;
  label: string;
  ids: Set<string>;
}

export const HISTORY_GROUPS: HistoryGroup[] = [
  { id: 'er-drugs', label: 'ER不足薬剤一覧',      ids: new Set(['cat-er-cart-drug1','cat-er-cart-drug2','cat-er-stock-a','cat-er-stock-b']) },
  { id: 'er-items', label: 'ER物品',               ids: new Set(['cat-er-steel','cat-er-teisu']) },
  { id: 'er-cart',  label: 'ER救急カート',         ids: new Set(['cat-er-cart1','cat-er-cart2']) },
  { id: 'kate-drug',label: 'カテ室ストック薬',     ids: new Set(['cat-stock1','cat-stock2','cat-karte-drug']) },
  { id: 'kate-eq',  label: 'カテ室救急カート物品', ids: new Set(['cat-karte-equip']) },
];

export const GROUPED_IDS = new Set(HISTORY_GROUPS.flatMap(g => [...g.ids]));
