import {
  ACCOUNT_STORAGE_KEY,
  BUDGET_STORAGE_KEY,
  DEFAULT_ACCOUNT_STORAGE_KEY,
  DEFAULT_BANK_ACCOUNT_ID,
  IS_DEMO_MODE,
  MOOD_STORAGE_KEY,
  STORAGE_KEY,
  TRAVEL_STORAGE_KEY,
  defaultAccounts,
} from "../constants/categories";
import { getMonthKey, toDateInputValue } from "./dateUtils";
import { createRecordId, normalizeRecord } from "./parser";

export function get(key) {
  return localStorage.getItem(key);
}

export function set(key, value) {
  localStorage.setItem(key, value);
}

export function remove(key) {
  localStorage.removeItem(key);
}

export function createDemoData() {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(today.getDate() - 2);
  const todayText = toDateInputValue(today);
  const yesterdayText = toDateInputValue(yesterday);
  const twoDaysAgoText = toDateInputValue(twoDaysAgo);

  return {
    accounts: defaultAccounts.map((account) => {
      const balances = {
        wechat: 632,
        alipay: 1250,
        "bank-china": 3200,
        "bank-abc": 860,
        cash: 52,
      };
      return {
        ...account,
        balance: balances[account.id] || 0,
      };
    }),
    records: [
      {
        id: "demo-1",
        date: todayText,
        amount: 18,
        type: "expense",
        category: "餐饮",
        account: "微信",
        accountId: "wechat",
        title: "奶茶",
        raw: "微信支出18奶茶",
        affectsBalance: true,
        balanceApplied: true,
        createdAt: `${todayText}T10:20:00.000Z`,
      },
      {
        id: "demo-2",
        date: todayText,
        amount: 32,
        type: "expense",
        category: "餐饮",
        account: "支付宝",
        accountId: "alipay",
        title: "拉面",
        raw: "支付宝支出32拉面",
        affectsBalance: true,
        balanceApplied: true,
        createdAt: `${todayText}T05:40:00.000Z`,
      },
      {
        id: "demo-3",
        date: todayText,
        amount: 4,
        type: "expense",
        category: "交通",
        account: "微信",
        accountId: "wechat",
        title: "地铁",
        raw: "刚刚地铁4块",
        affectsBalance: true,
        balanceApplied: true,
        createdAt: `${todayText}T01:15:00.000Z`,
      },
      {
        id: "demo-4",
        date: yesterdayText,
        amount: 500,
        type: "income",
        category: "收入",
        account: "支付宝",
        accountId: "alipay",
        title: "补课收入",
        raw: "支付宝收入500补课费",
        affectsBalance: true,
        balanceApplied: true,
        createdAt: `${yesterdayText}T12:10:00.000Z`,
      },
      {
        id: "demo-5",
        date: yesterdayText,
        amount: 39,
        type: "expense",
        category: "娱乐",
        account: "中国银行",
        accountId: "bank-china",
        title: "电影",
        raw: "中国银行支出39电影",
        affectsBalance: true,
        balanceApplied: true,
        createdAt: `${yesterdayText}T11:30:00.000Z`,
      },
      {
        id: "demo-6",
        date: twoDaysAgoText,
        amount: 26,
        type: "expense",
        category: "餐饮",
        account: "现金",
        accountId: "cash",
        title: "公园咖啡",
        raw: "现金支出26公园咖啡",
        affectsBalance: true,
        balanceApplied: true,
        createdAt: `${twoDaysAgoText}T07:50:00.000Z`,
      },
    ],
    moods: {
      [todayText]: {
        id: "good",
        label: "还不错",
        date: todayText,
        createdAt: `${todayText}T08:00:00.000Z`,
      },
      [yesterdayText]: {
        id: "tired",
        label: "有点累",
        date: yesterdayText,
        createdAt: `${yesterdayText}T08:00:00.000Z`,
      },
      [twoDaysAgoText]: {
        id: "happy",
        label: "今天很开心",
        date: twoDaysAgoText,
        createdAt: `${twoDaysAgoText}T08:00:00.000Z`,
      },
    },
  };
}

export const DEMO_DATA = IS_DEMO_MODE ? createDemoData() : null;

export function loadRecords() {
  if (IS_DEMO_MODE) return DEMO_DATA.records.map(normalizeRecord);
  try {
    const saved = JSON.parse(get(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.map(normalizeRecord) : [];
  } catch {
    return [];
  }
}

export function saveRecords(records) {
  if (IS_DEMO_MODE) return;
  set(STORAGE_KEY, JSON.stringify(records));
}

export function loadMoods() {
  if (IS_DEMO_MODE) return DEMO_DATA.moods;
  try {
    const saved = JSON.parse(get(MOOD_STORAGE_KEY) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

export function saveMoods(moodByDate) {
  if (IS_DEMO_MODE) return;
  set(MOOD_STORAGE_KEY, JSON.stringify(moodByDate));
}

export function loadAccounts() {
  if (IS_DEMO_MODE) return DEMO_DATA.accounts;
  try {
    const saved = JSON.parse(get(ACCOUNT_STORAGE_KEY) || "[]");
    if (!Array.isArray(saved)) return defaultAccounts;
    const legacyBank = saved.find((item) => item.id === "bank");
    return defaultAccounts.map((account) => {
      const savedAccount = saved.find((item) => item.id === account.id);
      const legacyBalance = account.id === DEFAULT_BANK_ACCOUNT_ID ? legacyBank?.balance : undefined;
      return {
        ...account,
        balance: Number(savedAccount?.balance ?? legacyBalance ?? 0),
        customName: savedAccount?.customName || "",
        note: savedAccount?.note || "",
      };
    });
  } catch {
    return defaultAccounts;
  }
}

export function saveAccounts(accounts) {
  if (IS_DEMO_MODE) return;
  set(
    ACCOUNT_STORAGE_KEY,
    JSON.stringify(accounts.map(({ id, balance, customName = "", note = "" }) => ({ id, balance: Number(balance || 0), customName, note }))),
  );
}

export function loadDefaultAccountId() {
  if (IS_DEMO_MODE) return "wechat";
  try {
    return get(DEFAULT_ACCOUNT_STORAGE_KEY) || "cash";
  } catch {
    return "cash";
  }
}

export function saveDefaultAccountId(accountId) {
  if (IS_DEMO_MODE) return;
  set(DEFAULT_ACCOUNT_STORAGE_KEY, accountId || "cash");
}

export function loadTravels() {
  if (IS_DEMO_MODE) {
    return [
      {
        id: "demo-travel-japan",
        name: "🌸 日本旅行 2026",
        location: "东京",
        weather: "晴",
        notes: {
          [toDateInputValue(new Date())]: "第一次一个人在东京坐电车，其实有点紧张，但也很自由。",
        },
        createdAt: new Date().toISOString(),
      },
    ];
  }
  try {
    const saved = JSON.parse(get(TRAVEL_STORAGE_KEY) || "[]");
    return Array.isArray(saved)
      ? saved.map((travel) => ({
          id: travel.id || createRecordId(),
          name: travel.name || "一段旅行",
          location: travel.location || "",
          weather: travel.weather || "",
          notes: travel.notes || {},
          createdAt: travel.createdAt || new Date().toISOString(),
        }))
      : [];
  } catch {
    return [];
  }
}

export function saveTravels(travels) {
  if (IS_DEMO_MODE) return;
  set(TRAVEL_STORAGE_KEY, JSON.stringify(travels));
}

export function loadBudget() {
  if (IS_DEMO_MODE) {
    return {
      monthKey: getMonthKey(),
      amount: 1800,
      updatedAt: new Date().toISOString(),
    };
  }
  try {
    const saved = JSON.parse(get(BUDGET_STORAGE_KEY) || "null");
    return saved && typeof saved === "object" ? saved : null;
  } catch {
    return null;
  }
}

export function saveBudget(budget) {
  if (IS_DEMO_MODE) return;
  if (!budget) {
    remove(BUDGET_STORAGE_KEY);
    return;
  }
  set(BUDGET_STORAGE_KEY, JSON.stringify(budget));
}

export function readStoredJson(key, fallback) {
  try {
    return JSON.parse(get(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

export function exportBackupData() {
  const exportedAt = new Date().toISOString();
  const backup = {
    app: "森系记账",
    version: 1,
    exportedAt,
    data: {
      records: loadRecords(),
      accounts: loadAccounts(),
      moods: readStoredJson(MOOD_STORAGE_KEY, {}),
      monthlyBudget: loadBudget(),
    },
  };
  const date = toDateInputValue(new Date());
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `森系记账-备份-${date}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
