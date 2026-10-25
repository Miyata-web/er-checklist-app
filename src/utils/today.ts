// 業務日（8:20境界）ユーティリティ。
// 夜勤（16:00〜翌9:00）が0時をまたいでも勤務中ずっと同じ「業務日」として扱えるよう、
// 朝8:20を1日の境界とする。8:20より前は前日の業務日に属する。
// ER スケジュールアプリ側のヘッダー日付と一致させるための共通ロジック。
// 端末ローカル時刻（= 日本国内では JST）を基準にする。

const DAY_BOUNDARY_MIN = 8 * 60 + 20; // 8:20

/** 現在時刻から境界分を引いた「業務日の基準時刻」を返す。 */
export function businessNow(): Date {
  return new Date(Date.now() - DAY_BOUNDARY_MIN * 60000);
}

/** 業務日を "YYYY-MM-DD" で返す（ローカルタイム基準）。 */
export function businessDateString(base: Date = businessNow()): string {
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, "0");
  const d = String(base.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "YYYY-MM-DD" を「YYYY年M月D日（曜）」に整形。 */
export function formatBusinessDateJP(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return `${y}年${m}月${d}日（${"日月火水木金土"[dow]}）`;
}
