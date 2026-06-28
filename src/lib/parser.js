import {
  DEFAULT_ACCOUNT,
  DEFAULT_BANK_ACCOUNT_ID,
  categoryRules,
  defaultAccounts,
  emotionRules,
  emotionSceneVariants,
  moods,
} from "../constants/categories";
import { toDateInputValue } from "./dateUtils";

export function pickEmotionScene(moodId) {
  const variants = emotionSceneVariants[moodId] || ["sit"];
  return variants[Math.floor(Math.random() * variants.length)];
}

export function normalizeTransactionType(value = "normal") {
  if (["pending_receivable", "pendingReceivable", "pendingIncome", "待收", "应收"].includes(value)) {
    return "pending_receivable";
  }
  if (["pending_payable", "pendingPayable", "pendingExpense", "待支出", "待付"].includes(value)) {
    return "pending_payable";
  }
  return "normal";
}

export function parseDate(text) {
  const date = new Date();
  if (text.includes("前天")) {
    date.setDate(date.getDate() - 2);
  } else if (text.includes("昨天")) {
    date.setDate(date.getDate() - 1);
  }

  const dayMatch = text.match(/(\d{1,2})\s*号/);
  if (dayMatch) {
    const day = Number(dayMatch[1]);
    if (day >= 1 && day <= 31) {
      date.setDate(day);
    }
  }

  return toDateInputValue(date);
}

export function parseAmount(text) {
  const matches = [...text.matchAll(/(\d+(?:\.\d{1,2})?)\s*(?:元|块|块钱)?(?!\s*号)/g)];
  const match = matches[matches.length - 1];
  if (match) return Number(match[1]);
  return parseSpokenChineseAmount(text);
}

export function parseSpokenChineseAmount(text) {
  const numberText = "[零一二两三四五六七八九十百千万点半]";
  const matches = [...text.matchAll(new RegExp(`(${numberText}+(?:块|块钱|元)?${numberText}*)`, "g"))];
  const usable = matches
    .map((item) => item[1])
    .filter((item) => /[一二两三四五六七八九十百千万]/.test(item))
    .filter((item) => item.length > 1 || /[十百千万点半元块]/.test(item));
  const raw = usable[usable.length - 1];
  if (!raw) return 0;
  return chineseAmountToNumber(raw);
}

export function chineseAmountToNumber(rawText) {
  const digitMap = {
    零: 0,
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  };
  const cleanText = rawText.replace(/块钱|块|元/g, "点").replace(/毛/g, "").replace(/分/g, "");
  const [integerText, decimalText = ""] = cleanText.split("点");
  let total = 0;
  let section = 0;
  let current = 0;

  for (const char of integerText) {
    if (char in digitMap) {
      current = digitMap[char];
    } else if (char === "十") {
      section += (current || 1) * 10;
      current = 0;
    } else if (char === "百") {
      section += (current || 1) * 100;
      current = 0;
    } else if (char === "千") {
      section += (current || 1) * 1000;
      current = 0;
    } else if (char === "万") {
      total += (section + current) * 10000;
      section = 0;
      current = 0;
    }
  }

  let amount = total + section + current;
  if (decimalText === "半") return amount + 0.5;
  const decimalDigits = [...decimalText].filter((char) => char in digitMap).map((char) => digitMap[char]).slice(0, 2);
  if (decimalDigits.length) {
    amount += Number(`0.${decimalDigits.join("")}`);
  }
  return Number(amount.toFixed(2));
}

export function pickFeedback(rule, text, hasAmount) {
  if (hasAmount && rule.type === "negative" && (text.includes("奶茶") || text.includes("咖啡"))) {
    return "那今天这杯，就算一点情绪补给。";
  }
  if (hasAmount && rule.type === "negative") {
    return "辛苦啦，今天也在认真生活。";
  }
  if (hasAmount && rule.type === "positive") {
    return "开心的时候，也很适合把生活记下来。";
  }
  const index = Math.abs(text.length) % rule.feedback.length;
  return rule.feedback[index];
}

export function detectEmotion(text) {
  const matchedRule = emotionRules.find((rule) => rule.keywords.some((keyword) => text.includes(keyword)));
  if (!matchedRule) return null;
  const mood = moods.find((item) => item.id === matchedRule.moodId);
  return {
    moodId: matchedRule.moodId,
    moodLabel: mood?.label || "普普通通",
    type: matchedRule.type,
    feedback: pickFeedback(matchedRule, text, parseAmount(text) > 0),
  };
}

export function createRecordId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `record-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function parseAccount(text, defaultAccountId = "cash", accounts = defaultAccounts) {
  if (text.includes("微信")) return { account: "微信", accountId: "wechat" };
  if (text.includes("支付宝")) return { account: "支付宝", accountId: "alipay" };
  if (text.includes("长沙银行")) return { account: "长沙银行", accountId: "bank-changsha" };
  if (text.includes("中国银行")) return { account: "中国银行", accountId: "bank-china" };
  if (text.includes("农业银行")) return { account: "农业银行", accountId: "bank-abc" };
  if (text.includes("东莞银行")) return { account: "东莞银行", accountId: "bank-dongguan" };
  if (text.includes("建设银行")) return { account: "建设银行", accountId: "bank-ccb" };
  if (text.includes("银行卡") || text.includes("银行")) {
    const defaultBank = defaultAccounts.find((account) => account.id === DEFAULT_BANK_ACCOUNT_ID);
    return { account: defaultBank?.name || "中国银行", accountId: DEFAULT_BANK_ACCOUNT_ID };
  }
  if (text.includes("现金")) return { account: "现金", accountId: "cash" };
  const defaultAccount = accounts.find((account) => account.id === defaultAccountId) || defaultAccounts.find((account) => account.id === defaultAccountId);
  return { account: defaultAccount?.name || DEFAULT_ACCOUNT, accountId: defaultAccount?.id || "cash" };
}

export function parseType(text) {
  const incomeWords = ["收入", "工资", "补课费", "红包", "退款", "副业", "奖金", "进账", "收款"];
  return incomeWords.some((word) => text.includes(word)) ? "income" : "expense";
}

export function parseTransactionType(text) {
  if (/待\s*收|应\s*收/.test(text)) return "pending_receivable";
  if (/待\s*支\s*出|计划\s*支\s*出|待\s*付/.test(text)) return "pending_payable";
  return "normal";
}

export function parseCategory(text, type) {
  if (type === "income") return "收入";
  const matched = categoryRules.find(([, words]) => words.some((word) => text.includes(word)));
  return matched ? matched[0] : "其他";
}

export function parseTitle(text, amount, account) {
  let title = text
    .replace(/今天|刚刚|昨天|前天|\d{1,2}\s*号/g, "")
    .replace(/微信|支付宝|长沙银行|中国银行|农业银行|东莞银行|建设银行|银行卡|银行|现金/g, "")
    .replace(/收入|支出|花了|花|付款|收款|进账/g, "")
    .replace(/待收|应收|待支出|计划支出|待付/g, "")
    .replace(new RegExp(`${amount}(?:\\.0+)?\\s*(?:元|块|块钱)?`), "")
    .replace(/[零一二两三四五六七八九十百千万点半]+(?:元|块|块钱)?[零一二两三四五六七八九]?/g, "")
    .replace(/\s+/g, "")
    .trim();

  title = title.replace(/^买/, "");
  if (!title) {
    title = account === "现金" ? "随手记一笔" : `${account}记一笔`;
  }
  return title;
}

export function parseQuickEntry(text, defaultAccountId = "cash", accounts = defaultAccounts, activeTravel = null) {
  const cleanText = text.trim();
  const amount = parseAmount(cleanText);
  const { account, accountId } = parseAccount(cleanText, defaultAccountId, accounts);
  const type = parseType(cleanText);
  const transactionType = parseTransactionType(cleanText);
  const category = parseCategory(cleanText, type);
  const title = parseTitle(cleanText, amount, account);

  return {
    id: createRecordId(),
    raw: cleanText,
    title,
    amount,
    account,
    accountId,
    type,
    transactionType,
    transactionStatus: "open",
    category,
    affectsBalance: transactionType === "pending_receivable" || transactionType === "normal",
    balanceApplied: false,
    travelId: activeTravel?.id || "",
    travelName: activeTravel?.name || "",
    date: parseDate(cleanText),
    createdAt: new Date().toISOString(),
  };
}

export function inferAccountFromLegacy(accountName = "") {
  if (accountName.includes("微信")) return { account: "微信", accountId: "wechat" };
  if (accountName.includes("支付宝")) return { account: "支付宝", accountId: "alipay" };
  if (accountName.includes("长沙银行")) return { account: "长沙银行", accountId: "bank-changsha" };
  if (accountName.includes("中国银行")) return { account: "中国银行", accountId: "bank-china" };
  if (accountName.includes("农业银行")) return { account: "农业银行", accountId: "bank-abc" };
  if (accountName.includes("东莞银行")) return { account: "东莞银行", accountId: "bank-dongguan" };
  if (accountName.includes("建设银行")) return { account: "建设银行", accountId: "bank-ccb" };
  if (accountName.includes("银行卡") || accountName.includes("银行")) {
    const defaultBank = defaultAccounts.find((account) => account.id === DEFAULT_BANK_ACCOUNT_ID);
    return { account: defaultBank?.name || "中国银行", accountId: DEFAULT_BANK_ACCOUNT_ID };
  }
  return { account: accountName || DEFAULT_ACCOUNT, accountId: accountName === "现金" || !accountName ? "cash" : "cash" };
}

export function normalizeRecord(record) {
  const transactionType = normalizeTransactionType(record.transactionType);
  const inferred = record.accountId
    ? { account: record.account || defaultAccounts.find((account) => account.id === record.accountId)?.name || DEFAULT_ACCOUNT, accountId: record.accountId }
    : inferAccountFromLegacy(record.account);

  return {
    ...record,
    account: inferred.account,
    accountId: inferred.accountId,
    transactionType,
    transactionStatus: record.transactionStatus || "open",
    affectsBalance: transactionType === "pending_payable" ? false : transactionType === "pending_receivable" ? true : record.affectsBalance ?? true,
    balanceApplied: record.balanceApplied ?? false,
    travelId: record.travelId || "",
    travelName: record.travelName || "",
  };
}

export function isNormalRecord(record) {
  return normalizeTransactionType(record.transactionType) === "normal";
}
