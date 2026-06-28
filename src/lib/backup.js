import {
  ACCOUNT_STORAGE_KEY,
  BUDGET_STORAGE_KEY,
  DEFAULT_ACCOUNT_STORAGE_KEY,
  MOOD_STORAGE_KEY,
  STORAGE_KEY,
  TRAVEL_STORAGE_KEY,
} from "../constants/categories";
import { get, set } from "./storage";

export const CURRENT_DATA_VERSION = "v1";

function readJson(key, fallback) {
  try {
    return JSON.parse(get(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

export function exportBackupData() {
  const backup = {
    version: CURRENT_DATA_VERSION,
    createdAt: new Date().toISOString(),
    data: {
      records: readJson(STORAGE_KEY, []),
      accounts: readJson(ACCOUNT_STORAGE_KEY, []),
      budgets: readJson(BUDGET_STORAGE_KEY, null),
      travels: readJson(TRAVEL_STORAGE_KEY, []),
      moods: readJson(MOOD_STORAGE_KEY, {}),
      defaultAccount: get(DEFAULT_ACCOUNT_STORAGE_KEY) || "cash",
    },
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "gentle-ledger-backup.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function importBackupData(file) {
  try {
    if (!file || typeof file.text !== "function") {
      return { success: false, message: "数据格式错误" };
    }

    const backup = JSON.parse(await file.text());
    if (!backup?.version || !backup?.data || typeof backup.data !== "object") {
      return { success: false, message: "数据格式错误" };
    }

    const data = backup.data;
    const records = Array.isArray(data.records) ? data.records : [];
    const accounts = Array.isArray(data.accounts) ? data.accounts : [];
    const budgets = data.budgets ?? null;
    const travels = Array.isArray(data.travels) ? data.travels : [];
    const moods = data.moods && typeof data.moods === "object" ? data.moods : {};
    const defaultAccount = data.defaultAccount || "cash";

    set("records", JSON.stringify(records));
    set("accounts", JSON.stringify(accounts));
    set("budgets", JSON.stringify(budgets));
    set("travels", JSON.stringify(travels));
    set("moods", JSON.stringify(moods));
    set("defaultAccount", defaultAccount);

    return { success: true, message: "导入成功" };
  } catch {
    return { success: false, message: "数据格式错误" };
  }
}

export function migrateDataIfNeeded() {
  const version = get("version") || "v0";

  switch (version) {
    case "v0":
      set("records", get("records") || JSON.stringify([]));
      set("accounts", get("accounts") || JSON.stringify([]));
      set("budgets", get("budgets") || JSON.stringify(null));
      set("travels", get("travels") || JSON.stringify([]));
      set("moods", get("moods") || JSON.stringify({}));
      set("defaultAccount", get("defaultAccount") || "cash");
      set("version", CURRENT_DATA_VERSION);
      break;
    case CURRENT_DATA_VERSION:
      // Reserved for future migration.
      break;
    default:
      break;
  }
}
