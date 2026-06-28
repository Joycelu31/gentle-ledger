import { CURRENT_DATA_VERSION } from "./backup";

const BACKUP_KEY = "gentle-ledger-backups";
const WATCHED_KEYS = ["records", "accounts", "budgets", "travels", "moods"];
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
      records: readJson("records", []),
      accounts: readJson("accounts", []),
      budgets: readJson("budgets", null),
      travels: readJson("travels", []),
      moods: readJson("moods", {}),
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
      records: readJson("records", []),
      accounts: readJson("accounts", []),
      budgets: readJson("budgets", null),
      travels: readJson("travels", []),
      moods: readJson("moods", {}),
      defaultAccount: localStorage.getItem("defaultAccount") || "cash",
    },
  };
  const history = readJson(BACKUP_KEY, []);
  const nextHistory = [...(Array.isArray(history) ? history : []), beforeRestoreSnapshot].slice(-MAX_BACKUPS);
  localStorage.setItem(BACKUP_KEY, JSON.stringify(nextHistory));

  const data = backup?.data || {};
  localStorage.setItem("records", JSON.stringify(data.records));
  localStorage.setItem("accounts", JSON.stringify(data.accounts));
  localStorage.setItem("budgets", JSON.stringify(data.budgets));
  localStorage.setItem("travels", JSON.stringify(data.travels));
  localStorage.setItem("moods", JSON.stringify(data.moods));
  localStorage.setItem("defaultAccount", data.defaultAccount);
  return { success: true };
}
