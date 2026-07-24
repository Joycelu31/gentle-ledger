import { getMonthKey, isSameMonth } from "./dateUtils";
import { isNormalRecord } from "./parser";

export function toCurrency(value) {
  return `¥${Number(value || 0).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatRecordTime(record) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(record.createdAt));
}

export function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-");
  return `${year}年${Number(month)}月`;
}

export function buildCategorySummary(records) {
  const summary = new Map();
  records.filter(isNormalRecord).forEach((record) => {
    const key = record.category || "其他";
    const current = summary.get(key) || { category: key, income: 0, expense: 0 };
    if (record.type === "income") {
      current.income += Number(record.amount || 0);
    } else {
      current.expense += Number(record.amount || 0);
    }
    summary.set(key, current);
  });
  return [...summary.values()].sort((a, b) => b.expense + b.income - (a.expense + a.income));
}

export function buildMonthlyLightStats(records, monthKey = getMonthKey()) {
  const counts = new Map();
  records
    .filter((record) => isNormalRecord(record) && isSameMonth(record.date, monthKey))
    .forEach((record) => {
      const key = record.title || record.category || "生活记录";
      const current = counts.get(key) || {
        label: key,
        category: record.category || "其他",
        count: 0,
      };
      current.count += 1;
      counts.set(key, current);
    });
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 3);
}

export function buildLightStatsForRecords(records) {
  const counts = new Map();
  records.filter(isNormalRecord).forEach((record) => {
    const key = record.title || record.category || "旅行记录";
    const current = counts.get(key) || {
      label: key,
      category: record.category || "其他",
      count: 0,
    };
    current.count += 1;
    counts.set(key, current);
  });
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 3);
}
