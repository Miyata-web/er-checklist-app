export type Shift = 'day' | 'night';

export interface GroupConfirmation {
  groupId: string;
  date: string;
  shift: Shift;
  timestamp: string;
}

export interface CheckDraft {
  date: string;
  shift: Shift;
  categoryId: string;
  items: { itemId: string; deficit: number }[];
  timestamp: string;
}

export type Frequency = 'daily2' | 'daily1' | 'monthly1' | 'monthly2';

export interface CheckItem {
  id: string;
  name: string;
  standardStock: number;
}

export interface Category {
  id: string;
  name: string;
  frequency: Frequency;
  items: CheckItem[];
  shiftFilter?: Shift[];
}

export interface RecordItem {
  id: string;
  name: string;
  inputValue: number;
  standardStock: number;
  diff: number;
}

export interface CheckRecord {
  recordId: string;
  date: string;
  shift: Shift;
  categoryId: string;
  categoryName: string;
  itemId: string;
  itemName: string;
  inputValue: number;
  standardStock: number;
  diff: number;
  timestamp: string;
}

export interface DailyRecord {
  date: string;
  day?: CategoryRecord[];
  night?: CategoryRecord[];
}

export interface CategoryRecord {
  categoryId: string;
  categoryName: string;
  items: RecordItem[];
  hasDeficit: boolean;
}

export interface CompletionStatus {
  [categoryId: string]: {
    dayDone: boolean;
    nightDone: boolean;
    monthlyCount: number;
  };
}
