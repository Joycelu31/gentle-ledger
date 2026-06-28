export const STORAGE_KEY = "gentle-ledger-records-v1";

export const MOOD_STORAGE_KEY = "gentle-ledger-moods-v1";

export const ACCOUNT_STORAGE_KEY = "gentle-ledger-accounts-v1";

export const BUDGET_STORAGE_KEY = "gentle-ledger-monthly-budget-v1";

export const DEFAULT_ACCOUNT_STORAGE_KEY = "gentle-ledger-default-account-v1";

export const TRAVEL_STORAGE_KEY = "gentle-ledger-travels-v1";

export const DEFAULT_ACCOUNT = "现金";

export const DEFAULT_BANK_ACCOUNT_ID = "bank-china";

export const IS_DEMO_MODE = new URLSearchParams(window.location.search).get("demo") === "1";

export const defaultAccounts = [
  {
    id: "wechat",
    name: "微信",
    shortName: "微信",
    customName: "",
    note: "",
    balance: 0,
    group: "daily",
    tone: "bg-[#eef8ec]/80",
    mark: "bg-[#84ad78]",
  },
  {
    id: "alipay",
    name: "支付宝",
    shortName: "支付宝",
    customName: "",
    note: "",
    balance: 0,
    group: "daily",
    tone: "bg-[#edf7fb]/80",
    mark: "bg-[#7eb7cc]",
  },
  {
    id: "cash",
    name: "现金",
    shortName: "现金",
    customName: "",
    note: "",
    balance: 0,
    group: "daily",
    tone: "bg-[#fbf4e8]/80",
    mark: "bg-[#d4b783]",
  },
  {
    id: "bank-changsha",
    name: "长沙银行",
    shortName: "长沙银行",
    customName: "",
    note: "",
    balance: 0,
    group: "bank",
    tone: "bg-[#f6f3ed]/80",
    mark: "bg-[#b6aa96]",
  },
  {
    id: "bank-china",
    name: "中国银行",
    shortName: "中国银行",
    customName: "",
    note: "",
    balance: 0,
    group: "bank",
    tone: "bg-[#f6f3ed]/80",
    mark: "bg-[#b6aa96]",
  },
  {
    id: "bank-abc",
    name: "农业银行",
    shortName: "农业银行",
    customName: "",
    note: "",
    balance: 0,
    group: "bank",
    tone: "bg-[#f6f3ed]/80",
    mark: "bg-[#b6aa96]",
  },
  {
    id: "bank-dongguan",
    name: "东莞银行",
    shortName: "东莞银行",
    customName: "",
    note: "",
    balance: 0,
    group: "bank",
    tone: "bg-[#f6f3ed]/80",
    mark: "bg-[#b6aa96]",
  },
  {
    id: "bank-ccb",
    name: "建设银行",
    shortName: "建设银行",
    customName: "",
    note: "",
    balance: 0,
    group: "bank",
    tone: "bg-[#f6f3ed]/80",
    mark: "bg-[#b6aa96]",
  },
];

export const moods = [
  {
    id: "good",
    emoji: "🙂",
    label: "还不错",
    text: "这样的平静也很好。",
    scene: "walk",
  },
  {
    id: "plain",
    emoji: "😐",
    label: "普普通通",
    text: "普通的一天也值得被记录。",
    scene: "sit",
  },
  {
    id: "tired",
    emoji: "😵",
    label: "有点累",
    text: "先休息一下也没关系 🌿",
    scene: "rest",
  },
  {
    id: "low",
    emoji: "😞",
    label: "情绪低低",
    text: "今天是不是有点辛苦了？",
    scene: "hug",
  },
  {
    id: "happy",
    emoji: "✨",
    label: "今天很开心",
    text: "今天好像有一点点闪闪发光 ✨",
    scene: "shine",
  },
];

export const emotionSceneVariants = {
  good: ["walk", "walk-sun", "walk-flower"],
  plain: ["sit", "sit-wind", "sit-cloud"],
  tired: ["rest", "rest-moon", "rest-leaf"],
  low: ["hug", "hug-warm", "hug-rain"],
  happy: ["shine", "shine-stars", "shine-picnic"],
};

export const emotionRules = [
  {
    moodId: "tired",
    type: "negative",
    keywords: ["累", "烦", "难受", "崩溃", "想哭", "撑不住", "压力大", "焦虑", "不开心", "心情很差", "心情不好"],
    feedback: ["今天是不是有点辛苦了？", "先慢一点也没关系。", "辛苦啦，今天也在认真生活。"],
  },
  {
    moodId: "happy",
    type: "positive",
    keywords: ["开心", "快乐", "放松", "舒服", "开心一点", "很棒", "高兴", "不错"],
    feedback: ["今天的开心也值得被记住 ✨", "这个瞬间可以轻轻收好。", "今天好像有一点点闪闪发光 ✨"],
  },
  {
    moodId: "plain",
    type: "neutral",
    keywords: ["普通", "一般", "还行", "平静"],
    feedback: ["普通的一天也值得被记录。", "这样的平静也很好。", "今天就这样轻轻经过也可以。"],
  },
];

export const categoryRules = [
  ["餐饮", ["奶茶", "咖啡", "吃饭", "饭", "拉面", "早餐", "午餐", "晚餐", "水果", "外卖", "餐", "喝"]],
  ["交通", ["地铁", "公交", "打车", "出租", "高铁", "火车", "机票", "停车", "油费"]],
  ["购物", ["买衣服", "衣服", "鞋", "包", "购物", "超市", "日用品", "水果"]],
  ["娱乐", ["电影", "按摩", "唱歌", "游戏", "演出", "娱乐", "酒吧"]],
  ["学习", ["补课", "课程", "书", "学费", "考试", "资料", "学习"]],
  ["医疗", ["医院", "药", "看病", "体检", "牙", "医疗"]],
  ["旅行", ["旅行", "旅游", "景区", "门票", "露营", "帐篷"]],
  ["住宿", ["酒店", "民宿", "住宿", "宾馆"]],
  ["人情", ["红包", "请客", "礼物", "份子", "人情"]],
];

export const iconByCategory = {
  餐饮: "☕",
  交通: "🚇",
  购物: "🛍",
  娱乐: "🌙",
  学习: "📖",
  医疗: "🌿",
  旅行: "✈️",
  住宿: "🏡",
  人情: "🫶",
  收入: "🍃",
  其他: "·",
};

export const categoryNotes = {
  餐饮: "吃喝小事",
  交通: "路上的花费",
  购物: "生活添置",
  娱乐: "放松一下",
  学习: "给自己充电",
  医疗: "照顾身体",
  旅行: "去远一点的地方",
  住宿: "落脚一晚",
  人情: "人情往来",
  收入: "进账",
  其他: "生活碎片",
};

export const editableCategories = ["餐饮", "交通", "购物", "娱乐", "学习", "医疗", "旅行", "住宿", "人情", "收入", "其他"];

export const transactionTypeMeta = {
  normal: {
    label: "",
    className: "",
  },
  pending_receivable: {
    label: "📌 待收",
    className: "bg-leaf-50 text-leaf-700",
    hint: "已先计入余额，等收回时再记收入。",
  },
  pending_payable: {
    label: "🌿 待支出",
    className: "bg-[#fbf4e8] text-bark-500",
    hint: "暂不影响余额，只是轻轻提醒。",
  },
};
