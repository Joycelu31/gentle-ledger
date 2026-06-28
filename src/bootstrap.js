import { createRoot } from "react-dom/client";
import { createAutoBackup } from "./lib/autoBackup";
import { migrateDataIfNeeded } from "./lib/backup";
import { get, set } from "./lib/storage";

function validateLocalStorageData() {
  ["records", "accounts", "budgets", "travels", "moods"].forEach((key) => {
    if (get(key) === null) {
      set(key, JSON.stringify([]));
    }
  });
}

function safeBootstrap() {
  try {
    migrateDataIfNeeded();
    validateLocalStorageData();
    return { success: true };
  } catch (error) {
    console.error("bootstrap failed", error);
    return { success: false };
  }
}

function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

export function bootstrapApp(App, rootElement) {
  safeBootstrap();
  createAutoBackup();
  registerServiceWorker();
  createRoot(rootElement).render(App);
}
