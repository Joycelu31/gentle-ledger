import { normalizeTransactionType } from "./parser";

export function shouldRecordAffectBalance(record) {
  const transactionType = normalizeTransactionType(record.transactionType);
  if (record.transactionStatus === "completed" && transactionType !== "normal") return false;
  if (transactionType === "pending_receivable") return true;
  if (transactionType === "pending_payable") return false;
  return record.affectsBalance ?? true;
}

export function getRecordBalanceDelta(record) {
  const amount = Number(record.amount || 0);
  return record.type === "income" ? amount : -amount;
}

export function applyRecordToAccounts(accounts, record, direction = "apply") {
  if (!record.accountId) return accounts;
  const multiplier = direction === "revert" ? -1 : 1;
  const delta = getRecordBalanceDelta(record) * multiplier;
  let matched = false;
  const nextAccounts = accounts.map((account) => {
    if (account.id !== record.accountId) return account;
    matched = true;
    return {
      ...account,
      balance: Number(account.balance || 0) + delta,
    };
  });
  return matched ? nextAccounts : accounts;
}

export function recordCanAffectBalance(accounts, record) {
  return Boolean(record.accountId && accounts.some((account) => account.id === record.accountId));
}

export function getAccountNameById(accounts, accountId) {
  return accounts.find((account) => account.id === accountId)?.name || "";
}

export function getAccountDisplayName(account) {
  return account?.customName?.trim() || account?.name || "";
}
