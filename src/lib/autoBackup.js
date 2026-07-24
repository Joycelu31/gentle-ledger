import { CURRENT_DATA_VERSION } from "./backup";
import {
  ACCOUNT_STORAGE_KEY,
  BUDGET_STORAGE_KEY,
  DEFAULT_ACCOUNT_STORAGE_KEY,
  MOOD_STORAGE_KEY,
  STORAGE_KEY,
  TRAVEL_STORAGE_KEY,
} from "../constants/categories";

const BACKUP_KEY = "gentle-ledger-backups";
const WATCHED_KEYS = [
  STORAGE_KEY,
  ACCOUNT_STORAGE_KEY,
  BUDGET_STORAGE_KEY,
  TRAVEL_STORAGE_KEY,
  MOOD_STORAGE_KEY,
];
const MAX_BACKUPS = 20;

let autoBackupStarted = false;

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function writeSnapshot() {
  const snapshot = {
    version: CURRENT_DATA_VERSION,
    timestamp: Date.now(),
    data: {
      records: readJson(STORAGE_KEY, []),
      accounts: readJson(ACCOUNT_STORAGE_KEY, []),
      budgets: readJson(BUDGET_STORAGE_KEY, null),
      travels: readJson(TRAVEL_STORAGE_KEY, []),
      moods: readJson(MOOD_STORAGE_KEY, {}),
      defaultAccount: localStorage.getItem(DEFAULT_ACCOUNT_STORAGE_KEY) || "cash",
    },
  };
  const history = readJson(BACKUP_KEY, []);
  const nextHistory = [...(Array.isArray(history) ? history : []), snapshot].slice(-MAX_BACKUPS);
  localStorage.setItem(BACKUP_KEY, JSON.stringify(nextHistory));
}

export function createAutoBackup() {
  if (autoBackupStarted) return;
  autoBackupStarted = true;

  const originalSetItem = localStorage.setItem.bind(localStorage);
  const originalRemoveItem = localStorage.removeItem.bind(localStorage);

  localStorage.setItem = (key, value) => {
    originalSetItem(key, value);
    if (WATCHED_KEYS.includes(key)) {
      writeSnapshot();
    }
  };

  localStorage.removeItem = (key) => {
    originalRemoveItem(key);
    if (WATCHED_KEYS.includes(key)) {
      writeSnapshot();
    }
  };
}

export function getBackups() {
  const backups = readJson(BACKUP_KEY, []);
  return Array.isArray(backups) ? backups : [];
}

export function restoreBackup(backup) {
  const beforeRestoreSnapshot = {
    version: "auto_backup_before_restore",
    timestamp: Date.now(),
    data: {
      records: readJson(STORAGE_KEY, []),
      accounts: readJson(ACCOUNT_STORAGE_KEY, []),
      budgets: readJson(BUDGET_STORAGE_KEY, null),
      travels: readJson(TRAVEL_STORAGE_KEY, []),
      moods: readJson(MOOD_STORAGE_KEY, {}),
      defaultAccount: localStorage.getItem(DEFAULT_ACCOUNT_STORAGE_KEY) || "cash",
    },
  };
  const history = readJson(BACKUP_KEY, []);
  const nextHistory = [...(Array.isArray(history) ? history : []), beforeRestoreSnapshot].slice(-MAX_BACKUPS);
  localStorage.setItem(BACKUP_KEY, JSON.stringify(nextHistory));

  const data = backup?.data || {};
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data.records));
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(data.accounts));
  localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(data.budgets));
  localStorage.setItem(TRAVEL_STORAGE_KEY, JSON.stringify(data.travels));
  localStorage.setItem(MOOD_STORAGE_KEY, JSON.stringify(data.moods));
  localStorage.setItem(DEFAULT_ACCOUNT_STORAGE_KEY, data.defaultAccount || "cash");
  return { success: true };
}
