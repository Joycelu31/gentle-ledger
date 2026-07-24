import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronRight, Leaf, Search, Sprout } from "lucide-react";
import "./styles.css";

import { bootstrapApp } from "./bootstrap";
import { getBackups, restoreBackup } from "./lib/autoBackup";
import { exportBackupData, importBackupData } from "./lib/backup";
import {
  IS_DEMO_MODE,
  categoryNotes,
  editableCategories,
  iconByCategory,
  moods,
  transactionTypeMeta,
} from "./constants/categories";
import {
  applyRecordToAccounts,
  getAccountDisplayName,
  getAccountNameById,
  recordCanAffectBalance,
  shouldRecordAffectBalance,
} from "./lib/accountBalance";
import { getMonthKey, groupRecordsByMonth, isSameMonth, isToday, toDateInputValue } from "./lib/dateUtils";
import { buildCategorySummary, buildLightStatsForRecords, buildMonthlyLightStats, formatMonthLabel, formatRecordTime, toCurrency } from "./lib/formatters";
import { createRecordId, detectEmotion, isNormalRecord, normalizeTransactionType, parseQuickEntry, pickEmotionScene } from "./lib/parser";
import {
  loadAccounts,
  loadBudget,
  loadDefaultAccountId,
  loadMoods,
  loadRecords,
  loadTravels,
  saveAccounts,
  saveBudget,
  saveDefaultAccountId,
  saveMoods,
  saveRecords,
  saveTravels,
} from "./lib/storage";

function LightStats({ records, monthKey }) {
  const stats = useMemo(() => buildMonthlyLightStats(records, monthKey), [records, monthKey]);

  return (
    <section className="mt-5 rounded-[28px] border border-white/75 bg-white/55 p-4 shadow-card backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-stone-600">这个月的小节奏</h2>
        <span className="text-xs text-stone-400">轻轻看一眼</span>
      </div>
      {stats.length === 0 ? (
        <p className="py-3 text-sm leading-6 text-stone-400">
          🌿 再记录几笔后，
          <br />
          这里会慢慢热闹起来
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-stone-500">
            这个月最常记录的是：{iconByCategory[stats[0].category] || iconByCategory.其他} {stats[0].label}
          </p>
          <div className="grid gap-2">
            {stats.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-2xl bg-white/58 px-3 py-2 text-sm">
                <span className="min-w-0 truncate text-stone-600">
                  {iconByCategory[item.category] || iconByCategory.其他} {item.label}
                </span>
                <span className="shrink-0 text-xs text-stone-400">{item.count} 次</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function TravelModePanel({
  travels,
  activeTravelId,
  records,
  onCreateTravel,
  onSelectTravel,
  onUpdateTravelNote,
  onUpdateTravelMeta,
}) {
  const [draftName, setDraftName] = useState("");
  const activeTravel = travels.find((travel) => travel.id === activeTravelId) || null;
  const travelRecords = activeTravel ? records.filter((record) => record.travelId === activeTravel.id) : [];
  const travelStats = useMemo(() => buildLightStatsForRecords(travelRecords), [travelRecords]);
  const today = toDateInputValue(new Date());
  const firstTravelDate = travelRecords.map((record) => record.date).sort()[0] || activeTravel?.createdAt?.slice(0, 10) || today;
  const dayNumber = activeTravel ? Math.max(1, Math.floor((new Date(`${today}T00:00:00`) - new Date(`${firstTravelDate}T00:00:00`)) / 86400000) + 1) : 1;

  function submitTravel() {
    const name = draftName.trim();
    if (!name) return;
    onCreateTravel(name);
    setDraftName("");
  }

  return (
    <section className="mt-5 rounded-[28px] border border-white/75 bg-white/55 p-4 shadow-card backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-stone-600">旅行账本</h2>
        {activeTravel && (
          <button className="rounded-full bg-white/70 px-3 py-1.5 text-xs text-stone-500" type="button" onClick={() => onSelectTravel("")}>
            回到日常
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-2xl bg-white/70 px-3 py-2 text-sm text-stone-700 outline-none placeholder:text-stone-300"
          placeholder="例如：🌸 日本旅行 2026"
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
        />
        <button className="rounded-2xl bg-leaf-700 px-4 py-2 text-sm font-medium text-white" type="button" onClick={submitTravel}>
          创建
        </button>
      </div>

      {travels.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {travels.map((travel) => (
            <button
              key={travel.id}
              className={`shrink-0 rounded-full px-3 py-2 text-xs transition active:scale-[0.98] ${
                travel.id === activeTravelId ? "bg-leaf-700 text-white" : "bg-white/70 text-stone-500"
              }`}
              type="button"
              onClick={() => onSelectTravel(travel.id)}
            >
              {travel.name}
            </button>
          ))}
        </div>
      )}

      {activeTravel ? (
        <div className="mt-4 rounded-[24px] bg-leaf-50/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-stone-800">{activeTravel.name} Day{dayNumber}</p>
              <div className="mt-2 flex gap-2">
                <input
                  className="w-24 rounded-xl bg-white/70 px-2 py-1.5 text-xs text-stone-600 outline-none placeholder:text-stone-300"
                  placeholder="城市"
                  value={activeTravel.location || ""}
                  onChange={(event) => onUpdateTravelMeta(activeTravel.id, { location: event.target.value })}
                />
                <input
                  className="w-20 rounded-xl bg-white/70 px-2 py-1.5 text-xs text-stone-600 outline-none placeholder:text-stone-300"
                  placeholder="天气"
                  value={activeTravel.weather || ""}
                  onChange={(event) => onUpdateTravelMeta(activeTravel.id, { weather: event.target.value })}
                />
              </div>
            </div>
            <span className="rounded-full bg-white/70 px-3 py-1.5 text-xs text-leaf-700">{travelRecords.length} 笔</span>
          </div>

          <textarea
            className="mt-3 min-h-20 w-full resize-none rounded-2xl bg-white/70 px-3 py-3 text-sm text-stone-600 outline-none placeholder:text-stone-300"
            placeholder="今天旅行里有什么想轻轻记下？"
            value={activeTravel.notes?.[today] || ""}
            onChange={(event) => onUpdateTravelNote(activeTravel.id, today, event.target.value)}
          />

          <div className="mt-3 space-y-2">
            {travelStats.length === 0 ? (
              <p className="text-sm leading-6 text-stone-400">🌿 这段旅行还很轻，先记下一笔就好。</p>
            ) : (
              <>
                <p className="text-sm text-stone-500">
                  这次旅行最常记录的是：{iconByCategory[travelStats[0].category] || iconByCategory.其他} {travelStats[0].label}
                </p>
                {travelStats.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-2xl bg-white/58 px-3 py-2 text-sm">
                    <span className="truncate text-stone-600">{iconByCategory[item.category] || iconByCategory.其他} {item.label}</span>
                    <span className="text-xs text-stone-400">{item.count} 次</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-stone-400">选中一个旅行账本后，新记录会轻轻归到那段旅程里。</p>
      )}
    </section>
  );
}

function PendingCenter({ records, onCompleteReceivable, onCompletePayable, onDeleteReminder }) {
  const pendingRecords = records.filter((record) => {
    const transactionType = normalizeTransactionType(record.transactionType);
    return transactionType !== "normal" && record.transactionStatus !== "completed";
  });

  return (
    <section className="mt-5 rounded-[28px] border border-white/75 bg-white/55 p-4 shadow-card backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-stone-600">提醒中心</h2>
        <span className="text-xs text-stone-400">{pendingRecords.length ? `${pendingRecords.length} 条` : "很清爽"}</span>
      </div>
      {pendingRecords.length === 0 ? (
        <p className="py-3 text-sm leading-6 text-stone-400">🌿 暂时没有待收或待支出，心里可以轻一点。</p>
      ) : (
        <div className="space-y-3">
          {pendingRecords.map((record) => {
            const transactionType = normalizeTransactionType(record.transactionType);
            const isReceivable = transactionType === "pending_receivable";
            return (
              <article key={record.id} className="rounded-[22px] bg-white/62 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] ${transactionTypeMeta[transactionType]?.className}`}>
                      {isReceivable ? "📌 待收提醒" : "🌱 待支出提醒"}
                    </span>
                    <p className="mt-2 truncate text-sm font-medium text-stone-700">{record.title}</p>
                    <p className="mt-1 text-xs text-stone-400">{toCurrency(record.amount)} · {record.account}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-bark-500">{toCurrency(record.amount)}</span>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    className="rounded-full bg-leaf-50 px-3 py-2 text-xs font-medium text-leaf-700"
                    type="button"
                    onClick={() => (isReceivable ? onCompleteReceivable(record.id) : onCompletePayable(record.id))}
                  >
                    {isReceivable ? "已收回" : "已支付"}
                  </button>
                  <button className="rounded-full bg-white/70 px-3 py-2 text-xs text-stone-400" type="button" onClick={() => onDeleteReminder(record.id)}>
                    删除提醒
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CollapsibleInfoSection({ title, note, count, open, onToggle, children }) {
  return (
    <section className="border-t border-white/60 py-3 first:border-t-0">
      <button className="flex w-full items-center justify-between gap-3 text-left" type="button" onClick={onToggle}>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-stone-600">{title}</span>
          {note && <span className="mt-0.5 block text-xs leading-5 text-stone-400">{note}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {count !== undefined && <span className="rounded-full bg-white/65 px-2.5 py-1 text-xs text-stone-400">{count}</span>}
          <ChevronDown className={`text-leaf-600 transition ${open ? "rotate-180" : ""}`} size={17} strokeWidth={2} />
        </span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}

function TimelineHintSheet({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-stone-900/22 px-4 pb-4 backdrop-blur-md" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-[430px] rounded-[30px] border border-leaf-100 bg-[#fffef9] p-5 shadow-[0_24px_70px_rgba(65,84,55,0.24)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-leaf-50 text-leaf-700">
            <CalendarDays size={19} strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-stone-600">日历查账</p>
            <h2 className="mt-1 text-lg font-semibold text-stone-800">下一阶段会完善按日历查记录</h2>
            <p className="mt-2 text-sm leading-6 text-stone-500">
              这一轮先把入口留清楚。之后可以在这里按日期查看流水、搜索关键词，并快速回到某一天的记录。
            </p>
          </div>
        </div>
        <button className="mt-5 w-full rounded-2xl bg-leaf-700 px-4 py-3 text-sm font-medium text-white" type="button" onClick={onClose}>
          知道了
        </button>
      </div>
    </div>
  );
}

function CategorySummary({ records }) {
  const summary = buildCategorySummary(records);
  const pendingCount = records.filter((record) => !isNormalRecord(record)).length;
  const receivableTotal = records
    .filter((record) => normalizeTransactionType(record.transactionType) === "pending_receivable" && record.transactionStatus !== "completed")
    .reduce((sum, record) => sum + Number(record.amount || 0), 0);

  return (
    <section className="mt-5 rounded-[28px] border border-white/75 bg-white/55 p-4 shadow-card backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-stone-600">分类小结</h2>
        <span className="text-xs text-stone-400">{pendingCount ? `${pendingCount} 条待办未计入` : "实际收支"}</span>
      </div>
      {summary.length === 0 && receivableTotal === 0 ? (
        <p className="py-4 text-sm text-stone-400">还没有可统计的实际收支。</p>
      ) : (
        <div className="space-y-2">
          {receivableTotal > 0 && (
            <div className="rounded-2xl bg-leaf-50/80 px-3 py-2 text-sm text-leaf-700">
              📌 待收总额 {Number(receivableTotal).toLocaleString("zh-CN")}
            </div>
          )}
          {summary.length > 0 && (
            <>
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 text-xs text-stone-400">
                <span>分类</span>
                <span>支出</span>
                <span>收入</span>
              </div>
              {summary.map((item) => (
                <div key={item.category} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-2xl bg-white/58 px-3 py-2 text-sm">
                  <span className="font-medium text-stone-600">
                    {iconByCategory[item.category] || iconByCategory.其他} {item.category}
                    <span className="ml-1 text-xs font-normal text-stone-400">{categoryNotes[item.category] || categoryNotes.其他}</span>
                  </span>
                  <span className="text-bark-500">{Number(item.expense).toLocaleString("zh-CN")}</span>
                  <span className="text-leaf-700">{Number(item.income).toLocaleString("zh-CN")}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function MoodScene({ scene }) {
  const baseScene = scene?.split("-")[0] || "sit";
  return (
    <div className="mood-scene relative mx-auto mt-8 h-52 w-full max-w-[340px] overflow-hidden rounded-[34px] border border-leaf-100/70 bg-white/50 shadow-card backdrop-blur-xl">
      <div className="mood-light absolute inset-0" />
      <div className="mood-cloud mood-cloud-a absolute left-8 top-8 h-7 w-20 rounded-full bg-white/72" />
      <div className="mood-cloud mood-cloud-b absolute right-8 top-14 h-6 w-16 rounded-full bg-white/62" />
      <svg className="mood-scene-art absolute inset-x-0 bottom-0 h-40 w-full" viewBox="0 0 360 170" aria-hidden="true">
        <path d="M0 116c44-14 74-10 119 1 42 10 70-7 111-13 45-7 84 7 130 24v42H0Z" fill="#cbe7c3" />
        <path className="mood-grass" d="M0 132c53-12 104-8 153 3 49 11 98-13 143-4 22 5 43 12 64 13v26H0Z" fill="#abcfa0" />

        {(scene === "walk-sun" || scene === "shine-stars") && (
          <g className="mood-breathe" opacity=".75">
            <circle cx="285" cy="34" r="16" fill="#f2c7ae" />
            <path d="M279 34h12M285 28v12" stroke="#fff5ee" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}
        {(scene === "walk-flower" || scene === "rest-leaf" || scene === "shine-picnic") && (
          <g className="mood-grass" opacity=".85">
            <circle cx="58" cy="126" r="3" fill="#e8b2a4" />
            <circle cx="68" cy="132" r="2.5" fill="#f0d583" />
            <path d="M292 122c8-10 17-8 18 5-10 4-15 1-18-5Z" fill="#84ad78" />
          </g>
        )}
        {(scene === "sit-wind" || scene === "hug-rain") && (
          <g className="mood-cloud" opacity=".38" stroke="#84ad78" strokeWidth="2" strokeLinecap="round" fill="none">
            <path d="M52 64c26-8 44-8 66 0" />
            <path d="M232 72c22-7 37-7 56 0" />
          </g>
        )}
        {(scene === "rest-moon" || scene === "sit-cloud") && (
          <g className="mood-breathe" opacity=".55">
            <path d="M277 38c-11 2-20-6-19-17-8 5-12 14-9 23 4 13 18 19 30 13 7-4 11-11 12-18-4 1-9 1-14-1Z" fill="#eadbc5" />
          </g>
        )}

        {baseScene === "hug" && (
          <g className="mood-breathe mood-figure" transform="translate(104 56)">
            <ellipse cx="70" cy="70" rx="58" ry="34" fill="#fff7ea" />
            <circle cx="70" cy="38" r="34" fill="#fff7ea" />
            <circle cx="49" cy="14" r="13" fill="#fff7ea" />
            <circle cx="91" cy="14" r="13" fill="#fff7ea" />
            <circle cx="58" cy="35" r="2.5" fill="#5a5147" />
            <circle cx="82" cy="35" r="2.5" fill="#5a5147" />
            <path d="M63 47c7 5 15 5 22 0" stroke="#5a5147" strokeWidth="2.4" strokeLinecap="round" fill="none" />
            <path d="M35 70c29 27 68 27 99 0" stroke="#ead9c3" strokeWidth="14" strokeLinecap="round" fill="none" />
            <g transform="translate(54 73) scale(.78)">
              <ellipse cx="34" cy="31" rx="28" ry="15" fill="#fffaf0" />
              <circle cx="62" cy="23" r="15" fill="#fffaf0" />
              <circle cx="67" cy="21" r="2.2" fill="#3d3a32" />
              <path d="M50 14c-6-9-15-8-17 1 5 5 10 6 17-1Z" fill="#eadbc5" />
            </g>
          </g>
        )}

        {baseScene === "rest" && (
          <g className="mood-breathe mood-figure" transform="translate(118 94)">
            <ellipse cx="70" cy="35" rx="52" ry="18" fill="#fffaf0" />
            <circle cx="115" cy="25" r="16" fill="#fffaf0" />
            <path d="M122 24h9M122 30h9" stroke="#5a5147" strokeWidth="2" strokeLinecap="round" />
            <path d="M30 25C16 16 15 7 26 3" stroke="#fffaf0" strokeWidth="8" strokeLinecap="round" fill="none" />
            <circle cx="76" cy="9" r="2" fill="#e7b09d" opacity=".75" />
            <circle cx="90" cy="5" r="1.7" fill="#e7b09d" opacity=".55" />
          </g>
        )}

        {baseScene === "shine" && (
          <g className="mood-bounce-soft mood-figure" transform="translate(86 66)">
            <path d="M62 5 67 20 83 20 70 29 75 44 62 35 49 44 54 29 41 20 57 20Z" fill="#f0c85d" opacity=".96" />
            <g transform="translate(0 44) scale(.85)">
              <ellipse cx="34" cy="31" rx="28" ry="15" fill="#e9c66f" />
              <circle cx="62" cy="23" r="15" fill="#e9c66f" />
              <circle cx="67" cy="21" r="2.2" fill="#3d3a32" />
              <path d="M72 27c4 3 9 3 13 0" stroke="#3d3a32" strokeWidth="2" strokeLinecap="round" fill="none" />
            </g>
            <g transform="translate(140 48) scale(.72)">
              <ellipse cx="34" cy="31" rx="25" ry="14" fill="#d9c6ad" />
              <circle cx="59" cy="22" r="14" fill="#d9c6ad" />
              <path d="M49 11 55 0l6 12M65 12 73 2l1 13" fill="#d9c6ad" />
              <circle cx="64" cy="20" r="2" fill="#3d3a32" />
              <path d="M67 27c4 2 8 2 11-1" stroke="#3d3a32" strokeWidth="2" strokeLinecap="round" fill="none" />
            </g>
          </g>
        )}

        {(baseScene === "walk" || baseScene === "sit") && (
          <g className={`${baseScene === "walk" ? "mood-walk" : "mood-breathe"} mood-figure`} transform="translate(128 78)">
            <ellipse cx="44" cy="42" rx="34" ry="17" fill="#fffaf0" />
            <circle cx="78" cy="32" r="18" fill="#fffaf0" />
            <circle cx="84" cy="30" r="2.4" fill="#3d3a32" />
            <path d="M88 37c4 2 8 2 11 0" stroke="#3d3a32" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M62 20c-7-10-17-9-19 1 5 6 12 7 19-1Z" fill="#eadbc5" />
            <path d="M16 35C1 26 0 13 12 8" stroke="#fffaf0" strokeWidth="8" strokeLinecap="round" fill="none" />
            {baseScene === "sit" && <path d="M35 58v15M61 58v15" stroke="#fffaf0" strokeWidth="8" strokeLinecap="round" />}
          </g>
        )}
      </svg>
    </div>
  );
}

function EmotionPage({ selectedMoodId, onSelectMood }) {
  const selectedMood = moods.find((mood) => mood.id === selectedMoodId);
  const [sceneVariant, setSceneVariant] = useState(() => pickEmotionScene(selectedMoodId || "plain"));

  useEffect(() => {
    if (selectedMoodId) {
      setSceneVariant(pickEmotionScene(selectedMoodId));
    }
  }, [selectedMoodId]);

  function handleSelectMood(mood) {
    setSceneVariant(pickEmotionScene(mood.id));
    onSelectMood(mood);
  }

  return (
    <section className="w-screen shrink-0 px-5 pb-36 pt-5">
      <div className="mx-auto w-full max-w-[430px]">
        <header className="py-2">
          <p className="text-sm text-stone-400">轻轻看一眼自己</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-stone-900">今天感觉怎么样？</h1>
        </header>

        <div className="mt-8 grid grid-cols-2 gap-3">
          {moods.map((mood) => {
            const active = mood.id === selectedMoodId;
            return (
              <button
                key={mood.id}
                className={`rounded-[24px] border px-4 py-4 text-left shadow-card backdrop-blur-xl transition active:scale-[0.98] ${
                  active ? "border-leaf-200 bg-leaf-700 text-white" : "border-white/80 bg-white/60 text-stone-600"
                } ${mood.id === "happy" ? "col-span-2" : ""}`}
                type="button"
                onClick={() => handleSelectMood(mood)}
              >
                <span className="text-2xl">{mood.emoji}</span>
                <span className="ml-2 text-sm font-medium">{mood.label}</span>
              </button>
            );
          })}
        </div>

        <MoodScene scene={selectedMood ? sceneVariant : "sit-cloud"} />

        <div className="mt-5 rounded-[28px] border border-white/75 bg-white/55 px-5 py-4 text-center shadow-card backdrop-blur-xl">
          <p className="text-sm leading-6 text-stone-500">
            {selectedMood ? selectedMood.text : "不选也没关系，今天可以只是安静地路过。"}
          </p>
        </div>
      </div>
    </section>
  );
}

function AssetPage({ accounts, defaultAccountId, onUpdateAccount, onUpdateAccountDetails, onUpdateDefaultAccount, onClose, onExportData, onImportData }) {
  const total = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const dailyAccounts = accounts.filter((account) => account.group !== "bank");
  const bankAccounts = accounts.filter((account) => account.group === "bank");
  const importInputRef = useRef(null);
  const backups = getBackups();
  const sortedBackups = [...backups].sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [resetAccountId, setResetAccountId] = useState(null);
  const [accountDraft, setAccountDraft] = useState({ customName: "", note: "" });
  const [resetDraft, setResetDraft] = useState("");
  const [exportMessage, setExportMessage] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const editingAccount = accounts.find((account) => account.id === editingAccountId);
  const resetAccount = accounts.find((account) => account.id === resetAccountId);

  function openAccountEditor(account) {
    setEditingAccountId(account.id);
    setAccountDraft({
      customName: account.customName || "",
      note: account.note || "",
    });
  }

  function openResetSheet(account) {
    setResetAccountId(account.id);
    setResetDraft(account.balance ? String(account.balance) : "");
  }

  function saveAccountDetails() {
    if (!editingAccount) return;
    onUpdateAccountDetails(editingAccount.id, {
      customName: accountDraft.customName.trim(),
      note: accountDraft.note.trim(),
    });
    setEditingAccountId(null);
  }

  function saveResetBalance() {
    if (!resetAccount) return;
    onUpdateAccount(resetAccount.id, resetDraft);
    setResetAccountId(null);
  }

  function getDatedBackupFileName() {
    const date = toDateInputValue(new Date());
    return `gentle-ledger_backup_${date}.json`;
  }

  function handleExportData() {
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = (tagName, options) => {
      const element = originalCreateElement(tagName, options);
      if (String(tagName).toLowerCase() === "a") {
        const originalClick = element.click.bind(element);
        element.click = () => {
          element.download = getDatedBackupFileName();
          originalClick();
        };
      }
      return element;
    };
    try {
      onExportData();
      setExportMessage("\u5907\u4efd\u5df2\u751f\u6210\uff0c\u53ef\u5b89\u5168\u4fdd\u5b58");
    } finally {
      document.createElement = originalCreateElement;
    }
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!window.confirm("\u5bfc\u5165\u5c06\u8986\u76d6\u5f53\u524d\u6240\u6709\u6570\u636e\uff0c\u662f\u5426\u7ee7\u7eed\uff1f")) {
      event.target.value = "";
      return;
    }
    const result = await onImportData(file);
    setImportMessage(result?.success ? "\u6570\u636e\u5df2\u6062\u590d\u4e3a\u5907\u4efd\u7248\u672c" : "\u5907\u4efd\u6587\u4ef6\u65e0\u6548\uff0c\u8bf7\u91cd\u65b0\u9009\u62e9");
    event.target.value = "";
  }

  function handleRestoreBackup(backup) {
    if (!window.confirm("\u786e\u5b9a\u8981\u6062\u590d\u8fd9\u4e2a\u7248\u672c\u5417\uff1f\u5f53\u524d\u6570\u636e\u4f1a\u88ab\u8986\u76d6")) return;
    const result = restoreBackup(backup);
    if (result.success) {
      window.location.reload();
    }
  }

  function formatBackupTime(timestamp) {
    if (!timestamp) return "-";
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  function renderAccountCard(account) {
    const displayName = getAccountDisplayName(account);
    return (
      <article
        key={account.id}
        className={`${account.tone} rounded-[28px] border border-white/80 p-4 shadow-card backdrop-blur-xl`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`h-10 w-2 rounded-full ${account.mark}`} />
            <div className="min-w-0">
              <h2 className="truncate text-base font-medium text-stone-700">{displayName}</h2>
              <p className="mt-1 text-xs text-stone-400">{account.note || "给这个账户留一句轻备注。"}</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-stone-400">当前余额</p>
            <button
              className="mt-1 rounded-full bg-white/68 px-2.5 py-1 text-lg font-semibold text-stone-700 shadow-sm transition active:scale-[0.98]"
              type="button"
              onClick={() => openResetSheet(account)}
            >
              {toCurrency(account.balance)}
            </button>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded-full bg-white/58 px-3 py-2 text-xs font-medium text-leaf-700 transition active:scale-[0.98]"
            type="button"
            onClick={() => openAccountEditor(account)}
          >
            编辑
          </button>
          <button
            className="rounded-full bg-white/58 px-3 py-2 text-xs font-medium text-stone-500 transition active:scale-[0.98]"
            type="button"
            onClick={() => openResetSheet(account)}
          >
            重置余额
          </button>
        </div>
      </article>
    );
  }

  return (
    <div className="asset-page fixed inset-0 z-40 overflow-y-auto bg-[#f8fbf7]/92 px-5 pb-10 pt-5 backdrop-blur-2xl">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(213,232,205,0.62),transparent_30%),radial-gradient(circle_at_84%_16%,rgba(238,225,202,0.42),transparent_28%)]" />
      <div className="relative mx-auto w-full max-w-[430px]">
        <header className="flex items-center justify-between py-2">
          <button
            className="rounded-full border border-white/80 bg-white/70 px-4 py-2 text-sm font-medium text-leaf-700 shadow-sm backdrop-blur-xl transition active:scale-[0.98]"
            type="button"
            onClick={onClose}
          >
            返回
          </button>
          <p className="text-sm text-stone-400">安静整理一下</p>
        </header>

        <section className="mt-7 rounded-[30px] border border-white/80 bg-white/60 p-5 shadow-card backdrop-blur-xl">
          <p className="text-sm text-stone-500">我的账户</p>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-stone-900">生活余额</h1>
              <p className="mt-2 text-sm leading-6 text-stone-400">知道大概在哪里，就已经很好。</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-stone-400">总资产</p>
              <p className="mt-1 text-xl font-semibold text-leaf-700">{toCurrency(total)}</p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-[28px] border border-white/80 bg-white/58 p-4 shadow-card backdrop-blur-xl">
          <p className="text-sm font-medium text-stone-600">默认记账账户</p>
          <p className="mt-1 text-xs leading-5 text-stone-400">选一个常用账户，之后没写账户时会自动用它。</p>
          <select
            className="mt-3 h-12 w-full rounded-2xl bg-leaf-50/70 px-4 text-sm text-stone-700 outline-none"
            value={defaultAccountId}
            onChange={(event) => onUpdateDefaultAccount(event.target.value)}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {getAccountDisplayName(account)}
              </option>
            ))}
          </select>
        </section>

        <section className="mt-5 space-y-3">
          {dailyAccounts.map(renderAccountCard)}
          <div className="rounded-[30px] border border-white/75 bg-white/42 p-3 shadow-card backdrop-blur-xl">
            <div className="px-2 pb-3 pt-1">
              <h2 className="text-sm font-medium text-stone-600">银行卡</h2>
              <p className="mt-1 text-xs text-stone-400">每张卡单独维护，心里更清楚一点。</p>
            </div>
            <div className="space-y-3">
              {bankAccounts.map(renderAccountCard)}
            </div>
          </div>
        </section>

        <p className="mt-5 rounded-[24px] border border-white/70 bg-white/45 px-5 py-4 text-center text-sm leading-6 text-stone-400 shadow-card backdrop-blur-xl">
          这里先手动维护余额，不自动分析，也不制造压力。
        </p>

        <section className="mt-3 grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <button
              className="w-full rounded-[24px] border border-white/80 bg-white/60 px-5 py-4 text-sm font-medium text-leaf-700 shadow-card backdrop-blur-xl transition active:scale-[0.99]"
              type="button"
              onClick={handleExportData}
            >
              {"\u5bfc\u51fa\u6570\u636e"}
            </button>
            <p className="px-2 text-xs leading-5 text-stone-400">{"\u5bfc\u51fa\u6570\u636e = \u751f\u6210\u4e00\u4efd\u5b8c\u6574\u7684\u65f6\u95f4\u5907\u4efd"}</p>
            {exportMessage && <p className="px-2 text-xs font-medium text-leaf-700">{exportMessage}</p>}
          </div>
          <div className="space-y-2">
            <button
              className="w-full rounded-[24px] border border-white/80 bg-white/60 px-5 py-4 text-sm font-medium text-leaf-700 shadow-card backdrop-blur-xl transition active:scale-[0.99]"
              type="button"
              onClick={() => importInputRef.current?.click()}
            >
              {"\u5bfc\u5165\u6570\u636e"}
            </button>
            {importMessage && <p className="px-2 text-xs font-medium text-leaf-700">{importMessage}</p>}
            <input ref={importInputRef} className="hidden" type="file" accept="application/json,.json" onChange={handleImportFile} />
          </div>
        </section>

        <section className="mt-3 rounded-[24px] border border-white/80 bg-white/58 p-4 shadow-card backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-stone-600">{"\u6570\u636e\u5907\u4efd\u7ba1\u7406"}</h2>
            <span className="text-xs text-stone-400">{sortedBackups.length} {"\u6761"}</span>
          </div>
          {sortedBackups.length === 0 ? (
            <p className="py-2 text-sm text-stone-400">{"\u6682\u65f6\u6ca1\u6709\u5907\u4efd\u8bb0\u5f55"}</p>
          ) : (
            <div className="space-y-0">
              {sortedBackups.map((backup, index) => (
                <div key={`${backup.timestamp || index}-${backup.version || "unknown"}`} className="grid grid-cols-[18px_1fr] gap-3">
                  <div className="relative flex justify-center">
                    <span className={`mt-1 h-3 w-3 rounded-full ${index === 0 ? "bg-leaf-700" : "bg-leaf-200"}`} />
                    {index < sortedBackups.length - 1 && <span className="absolute top-5 bottom-0 w-px bg-leaf-100" />}
                  </div>
                  <div className="pb-4">
                    <div className="rounded-2xl bg-white/58 px-3 py-3">
                      <p className="truncate text-sm font-medium text-stone-600">
                        {index === 0 ? `\u5f53\u524d\u7248\u672c (${backup.version || "-"})` : backup.version || "-"}
                      </p>
                      <p className="mt-1 truncate text-xs text-stone-400">{formatBackupTime(backup.timestamp)}</p>
                      <button className="mt-3 rounded-full bg-leaf-50 px-3 py-2 text-xs font-medium text-leaf-700" type="button" onClick={() => handleRestoreBackup(backup)}>
                        {"\u6062\u590d\u6b64\u7248\u672c"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-end bg-stone-900/24 px-4 pb-4 backdrop-blur-md" onClick={() => setEditingAccountId(null)}>
          <div
            className="mx-auto w-full max-w-[430px] rounded-[30px] border border-leaf-100 bg-[#fffef9] p-5 shadow-[0_24px_70px_rgba(65,84,55,0.26)]"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm text-stone-400">整理账户</p>
            <h2 className="mt-1 text-lg font-semibold text-stone-800">{editingAccount.name}</h2>
            <label className="mt-5 block text-xs text-stone-400">
              账户名称
              <input
                className="mt-1 h-12 w-full rounded-2xl border border-leaf-100 bg-white px-4 text-sm text-stone-800 outline-none placeholder:text-stone-300"
                placeholder={editingAccount.name}
                value={accountDraft.customName}
                onChange={(event) => setAccountDraft((draft) => ({ ...draft, customName: event.target.value }))}
              />
            </label>
            <label className="mt-3 block text-xs text-stone-400">
              备注
              <textarea
                className="mt-1 min-h-20 w-full resize-none rounded-2xl border border-leaf-100 bg-white px-4 py-3 text-sm text-stone-800 outline-none placeholder:text-stone-300"
                placeholder="比如：日常小额支出"
                value={accountDraft.note}
                onChange={(event) => setAccountDraft((draft) => ({ ...draft, note: event.target.value }))}
              />
            </label>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button className="rounded-2xl bg-white/70 px-3 py-3 text-sm font-medium text-stone-500" type="button" onClick={() => setEditingAccountId(null)}>
                取消
              </button>
              <button className="rounded-2xl bg-leaf-700 px-3 py-3 text-sm font-medium text-white" type="button" onClick={saveAccountDetails}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {resetAccount && (
        <div className="fixed inset-0 z-50 flex items-end bg-stone-900/24 px-4 pb-4 backdrop-blur-md" onClick={() => setResetAccountId(null)}>
          <div
            className="mx-auto w-full max-w-[430px] rounded-[30px] border border-leaf-100 bg-[#fffef9] p-5 shadow-[0_24px_70px_rgba(65,84,55,0.26)]"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm text-stone-400">要重新校准这个账户余额吗？</p>
            <h2 className="mt-1 text-lg font-semibold text-stone-800">{getAccountDisplayName(resetAccount)}</h2>
            <label className="mt-5 flex h-14 items-center rounded-[22px] border border-leaf-100 bg-white px-4 shadow-inner">
              <span className="mr-2 text-stone-400">¥</span>
              <input
                className="min-w-0 flex-1 bg-transparent text-xl font-semibold text-stone-700 outline-none placeholder:text-stone-300"
                inputMode="decimal"
                placeholder="输入当前余额"
                value={resetDraft}
                onChange={(event) => setResetDraft(event.target.value.replace(/[^\d.]/g, ""))}
              />
            </label>
            <p className="mt-3 text-xs leading-5 text-stone-400">只是校准当前余额，不会清空历史记录。</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button className="rounded-2xl bg-white/70 px-3 py-3 text-sm font-medium text-stone-500" type="button" onClick={() => setResetAccountId(null)}>
                取消
              </button>
              <button className="rounded-2xl bg-leaf-700 px-3 py-3 text-sm font-medium text-white" type="button" onClick={saveResetBalance}>
                确认调整
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ForestScene() {
  return (
    <div className="forest-scene pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      <div className="sky-wash absolute inset-0" />
      <div className="sun absolute right-[15%] top-[8%] h-20 w-20 rounded-full" />

      <div className="cloud cloud-a absolute left-[-16%] top-[14%] h-10 w-28 rounded-full bg-white/55 blur-[0.2px]" />
      <div className="cloud cloud-b absolute right-[-20%] top-[23%] h-8 w-24 rounded-full bg-white/45 blur-[0.2px]" />

      <svg
        className="balloon absolute left-[14%] top-[13%] h-24 w-16 opacity-75"
        viewBox="0 0 80 120"
        role="img"
      >
        <path d="M40 6c18 0 30 15 30 34 0 23-18 43-30 55C28 83 10 63 10 40 10 21 22 6 40 6Z" fill="#e8b7a8" />
        <path d="M40 8v86" stroke="#fff5ef" strokeWidth="3" opacity=".65" />
        <path d="M24 96h32l-6 15H30l-6-15Z" fill="#b98e72" opacity=".55" />
        <path d="M28 92 20 112M52 92l8 20" stroke="#a27d64" strokeWidth="2" opacity=".45" />
      </svg>

      <svg className="forest-line absolute bottom-20 left-1/2 h-56 w-[620px] max-w-none -translate-x-1/2 opacity-85" viewBox="0 0 620 230">
        <path d="M0 162c65-22 121-27 178-14 74 17 119 8 178-7 88-23 169-10 264 23v66H0Z" fill="#dfeeda" />
        <path d="M0 178c82-20 155-10 232 1 72 10 144-26 225-13 65 10 106 28 163 24v40H0Z" fill="#c8e0bf" />

        <g className="tree tree-left" transform="translate(38 72)">
          <rect x="27" y="70" width="13" height="70" rx="6" fill="#8a7055" />
          <path d="M34 0 0 82h68Z" fill="#8aad80" />
          <path d="M34 26 8 98h52Z" fill="#6f9b68" />
        </g>
        <g className="tree tree-mid" transform="translate(494 48)">
          <rect x="29" y="86" width="14" height="76" rx="6" fill="#8a7055" />
          <path d="M36 0 0 94h72Z" fill="#9abd8d" />
          <path d="M36 34 9 118h54Z" fill="#719d68" />
        </g>
        <g className="tree tree-small" transform="translate(420 92)">
          <rect x="18" y="54" width="10" height="52" rx="5" fill="#9a7d5d" />
          <path d="M23 0 0 68h46Z" fill="#87aa7a" />
        </g>

        <g className="flowers">
          <circle cx="118" cy="176" r="3" fill="#eab0a2" />
          <circle cx="130" cy="184" r="2.5" fill="#fff1c6" />
          <circle cx="392" cy="175" r="2.8" fill="#eab0a2" />
          <circle cx="458" cy="186" r="2.4" fill="#fff1c6" />
          <circle cx="520" cy="174" r="2.7" fill="#eab0a2" />
        </g>

        <g className="dogs" transform="translate(34 140)">
          <g className="dog dog-white" transform="translate(0 8) scale(.82)">
            <ellipse cx="36" cy="31" rx="29" ry="15" fill="#fffaf0" />
            <circle cx="65" cy="23" r="15" fill="#fffaf0" />
            <circle cx="70" cy="21" r="2.2" fill="#3d3a32" />
            <path d="M74 27c4 2 7 2 10 0" stroke="#3d3a32" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M54 14c-5-8-13-7-15 1 4 5 9 6 15-1Z" fill="#eadbc5" />
            <path d="M9 25C-3 18-4 7 7 3" stroke="#fffaf0" strokeWidth="8" strokeLinecap="round" fill="none" />
            <path d="M21 42v14M49 42v14" stroke="#fffaf0" strokeWidth="8" strokeLinecap="round" />
          </g>
          <g className="dog dog-yellow" transform="translate(246 24) scale(.82)">
            <ellipse cx="34" cy="31" rx="28" ry="15" fill="#e9c66f" />
            <circle cx="62" cy="23" r="15" fill="#e9c66f" />
            <circle cx="67" cy="21" r="2.2" fill="#3d3a32" />
            <path d="M71 27c4 2 7 2 10 0" stroke="#3d3a32" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M50 14c-6-9-15-8-17 1 5 5 10 6 17-1Z" fill="#c99a52" />
            <path d="M8 25C-4 18-4 8 7 4" stroke="#e9c66f" strokeWidth="8" strokeLinecap="round" fill="none" />
            <path d="M20 42v14M47 42v14" stroke="#e9c66f" strokeWidth="8" strokeLinecap="round" />
          </g>
          <g className="dog dog-black" transform="translate(486 15) scale(.76)">
            <ellipse cx="34" cy="31" rx="28" ry="15" fill="#45413b" />
            <circle cx="62" cy="23" r="15" fill="#45413b" />
            <circle cx="67" cy="21" r="2.3" fill="#fff8ea" />
            <path d="M71 27c4 2 7 2 10 0" stroke="#fff8ea" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M50 14c-6-9-15-8-17 1 5 5 10 6 17-1Z" fill="#2f2c28" />
            <path d="M8 25C-4 18-4 8 7 4" stroke="#45413b" strokeWidth="8" strokeLinecap="round" fill="none" />
            <path d="M20 42v14M47 42v14" stroke="#45413b" strokeWidth="8" strokeLinecap="round" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function SwipeRecordRow({
  record,
  compact = false,
  batchMode = false,
  selected = false,
  onOpen,
  onRequestDelete,
  onLongPress,
  onToggleSelect,
  onAmountEdit,
}) {
  const [pressStartX, setPressStartX] = useState(null);
  const [swiped, setSwiped] = useState(false);
  const longPressTimer = useRef(null);
  const longPressFired = useRef(false);
  const transactionType = normalizeTransactionType(record.transactionType);
  const transactionMeta = transactionTypeMeta[transactionType] || transactionTypeMeta.normal;

  function getClientX(event) {
    return event.touches?.[0]?.clientX ?? event.changedTouches?.[0]?.clientX ?? event.clientX;
  }

  function beginPress(event) {
    if (event.target.closest("button, input, select, textarea, a")) return;
    const clientX = getClientX(event);
    if (typeof clientX !== "number") return;
    setPressStartX(clientX);
    longPressFired.current = false;
    window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      onLongPress?.(record.id);
    }, 520);
  }

  function handlePressEnd(event) {
    window.clearTimeout(longPressTimer.current);
    if (pressStartX === null) return;
    if (event.target.closest("button, input, select, textarea, a")) {
      setPressStartX(null);
      return;
    }
    const clientX = getClientX(event);
    const deltaX = clientX - pressStartX;
    if (deltaX < -44) {
      setSwiped(true);
    } else if (deltaX > 28) {
      setSwiped(false);
    } else if (longPressFired.current) {
      // Long press has already entered batch mode and selected this row.
    } else if (batchMode) {
      onToggleSelect?.(record.id);
    } else if (Math.abs(deltaX) < 10) {
      if (swiped) {
        setSwiped(false);
      } else {
        onOpen(record.id);
      }
    }
    setPressStartX(null);
  }

  return (
    <div className="relative overflow-hidden rounded-[22px]">
      <button
        className="absolute inset-y-0 right-0 my-1 rounded-2xl bg-[#f7e9e5]/95 px-4 text-xs font-medium text-rose-500"
        type="button"
        onClick={() => onRequestDelete(record.id)}
      >
        删除
      </button>
      <article
        data-record-row="true"
        className={`relative bg-white/70 transition-transform duration-200 active:scale-[0.99] ${selected ? "ring-2 ring-leaf-300" : ""} ${compact ? "px-3 py-2" : "px-4 py-3"}`}
        style={{ transform: swiped ? "translateX(-68px)" : "translateX(0)" }}
        onMouseDown={beginPress}
        onMouseUp={handlePressEnd}
        onMouseLeave={() => window.clearTimeout(longPressTimer.current)}
        onTouchStart={beginPress}
        onTouchEnd={handlePressEnd}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {batchMode && (
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px] ${selected ? "border-leaf-600 bg-leaf-700 text-white" : "border-leaf-200 bg-white/70 text-transparent"}`}>
                ✓
              </span>
            )}
            <span className={`${compact ? "w-6" : "grid h-9 w-9 place-items-center rounded-full bg-leaf-50"} shrink-0 text-center text-base`}>
              {iconByCategory[record.category] || iconByCategory.其他}
            </span>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-medium text-stone-700">{record.title}</p>
                {transactionType !== "normal" && (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${transactionMeta.className}`}>
                    {transactionMeta.label}
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-xs text-stone-400">
                {compact ? categoryNotes[record.category] || categoryNotes.其他 : `${formatRecordTime(record)} · ${categoryNotes[record.category] || categoryNotes.其他}`} · {record.account}
              </p>
            </div>
          </div>
          <button
            className={`shrink-0 rounded-full bg-white/72 px-2.5 py-1 text-sm font-semibold shadow-sm transition active:scale-[0.98] ${record.type === "income" ? "text-leaf-700" : "text-bark-500"}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onAmountEdit?.(record.id);
            }}
          >
            {record.type === "income" ? "+" : "-"}{Number(record.amount).toLocaleString("zh-CN")}
          </button>
        </div>
        {!compact && transactionType !== "normal" && (
          <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs ${transactionMeta.className}`}>
            {transactionMeta.label} · {transactionMeta.hint}
          </span>
        )}
      </article>
    </div>
  );
}

function RecordPage({
  records,
  accounts,
  moodByDate,
  travels,
  activeTravelId,
  onCreateTravel,
  onSelectTravel,
  onUpdateTravelNote,
  onUpdateTravelMeta,
  onOpenAssets,
  onOpenRecord,
  onRequestDelete,
  onRequestBatchDelete,
  onCompleteReceivable,
  onCompletePayable,
  onQuickEditAmount,
}) {
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => getMonthKey());
  const [showTimelineHint, setShowTimelineHint] = useState(false);
  const [openInfoSections, setOpenInfoSections] = useState({});
  const assetPreview = accounts.filter((account) => Number(account.balance || 0) !== 0).slice(0, 2);
  const baseRecords = activeTravelId ? records.filter((record) => record.travelId === activeTravelId) : records;
  const visibleRecords = useMemo(
    () => baseRecords.filter((record) => isSameMonth(record.date, selectedMonthKey)),
    [baseRecords, selectedMonthKey],
  );
  const recentTotals = useMemo(() => {
    return visibleRecords.filter(isNormalRecord).reduce(
      (totals, record) => {
        if (record.type === "income") {
          totals.income += record.amount;
        } else {
          totals.expense += record.amount;
        }
        return totals;
      },
      { income: 0, expense: 0 },
    );
  }, [visibleRecords]);
  const monthBalance = recentTotals.income - recentTotals.expense;
  const normalRecordCount = visibleRecords.filter(isNormalRecord).length;

  const groupedRecords = useMemo(() => groupRecordsByMonth(visibleRecords), [visibleRecords]);
  const todayMood = moodByDate[toDateInputValue(new Date())];
  const pendingReceivableCount = records.filter(
    (record) => normalizeTransactionType(record.transactionType) === "pending_receivable" && record.transactionStatus !== "completed",
  ).length;
  const pendingPayableCount = records.filter(
    (record) => normalizeTransactionType(record.transactionType) === "pending_payable" && record.transactionStatus !== "completed",
  ).length;

  function enterBatchMode(recordId) {
    setBatchMode(true);
    setSelectedIds((current) => (current.includes(recordId) ? current : [...current, recordId]));
  }

  function toggleSelected(recordId) {
    setConfirmBatchDelete(false);
    setSelectedIds((current) => (current.includes(recordId) ? current.filter((id) => id !== recordId) : [...current, recordId]));
  }

  function cancelBatchMode() {
    setBatchMode(false);
    setSelectedIds([]);
    setConfirmBatchDelete(false);
  }

  function deleteSelectedRecords() {
    if (!selectedIds.length) return;
    if (!confirmBatchDelete) {
      setConfirmBatchDelete(true);
      return;
    }
    onRequestBatchDelete(selectedIds);
    cancelBatchMode();
  }

  function moveSelectedMonth(step) {
    const next = new Date(`${selectedMonthKey}-01T00:00:00`);
    next.setMonth(next.getMonth() + step);
    setSelectedMonthKey(getMonthKey(next));
    cancelBatchMode();
  }

  function toggleInfoSection(sectionId) {
    setOpenInfoSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  }

  return (
    <section className="w-screen shrink-0 px-5 pb-36 pt-5">
      <div className="mx-auto w-full max-w-[430px]">
        <header className="flex items-start justify-between py-2">
          <div>
            <p className="text-sm text-stone-400">往左一页，看见生活的痕迹</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-stone-900">记录</h1>
          </div>
          <span className="rounded-full border border-white/80 bg-white/70 px-3 py-2 text-xs text-leaf-700 shadow-sm backdrop-blur-xl">
            时间线
          </span>
        </header>

        <section className="mt-6 rounded-[28px] border border-white/75 bg-white/58 p-4 shadow-card backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-stone-600">🌿 本月记录</h2>
            <button className="rounded-full bg-leaf-50 px-3 py-1.5 text-xs font-medium text-leaf-700" type="button" onClick={onOpenAssets}>
              查看全部资产
            </button>
          </div>
          {assetPreview.length === 0 ? (
            <p className="py-2 text-sm leading-6 text-stone-400">
              🌱 先创建一个常用账户吧
            </p>
          ) : (
            <div className="grid gap-2">
              {assetPreview.map((account) => (
                <div key={account.id} className="flex items-center justify-between rounded-2xl bg-white/55 px-3 py-2 text-sm">
                  <span className="truncate text-stone-600">{getAccountDisplayName(account)}</span>
                  <span className="shrink-0 font-medium text-leaf-700">{toCurrency(account.balance)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <TravelModePanel
          travels={travels}
          activeTravelId={activeTravelId}
          records={records}
          onCreateTravel={onCreateTravel}
          onSelectTravel={onSelectTravel}
          onUpdateTravelNote={onUpdateTravelNote}
          onUpdateTravelMeta={onUpdateTravelMeta}
        />

        <PendingCenter
          records={records}
          onCompleteReceivable={onCompleteReceivable}
          onCompletePayable={onCompletePayable}
          onDeleteReminder={onRequestDelete}
        />

        <section className="mt-5 rounded-[26px] border border-white/80 bg-white/72 p-4 shadow-card backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <button
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-leaf-50 text-lg font-semibold text-leaf-700 transition active:scale-[0.98]"
              type="button"
              onClick={() => moveSelectedMonth(-1)}
              aria-label="上个月"
            >
              ‹
            </button>
            <label className="min-w-0 flex-1 text-center text-xs text-stone-400">
              月份
              <input
                className="mt-1 h-11 w-full rounded-2xl border border-leaf-100 bg-white/88 px-3 text-center text-sm font-medium text-stone-700 outline-none"
                type="month"
                value={selectedMonthKey}
                onChange={(event) => {
                  if (event.target.value) {
                    setSelectedMonthKey(event.target.value);
                    cancelBatchMode();
                  }
                }}
              />
            </label>
            <button
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-leaf-50 text-lg font-semibold text-leaf-700 transition active:scale-[0.98]"
              type="button"
              onClick={() => moveSelectedMonth(1)}
              aria-label="下个月"
            >
              ›
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-stone-400">
            {formatMonthLabel(selectedMonthKey)} · {visibleRecords.length} 条记录
          </p>
        </section>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <article className="rounded-[26px] border border-white/80 bg-white/70 p-4 shadow-card backdrop-blur-xl">
            <p className="text-sm text-stone-500">最近收入</p>
            <p className="mt-3 text-2xl font-semibold text-leaf-700">{toCurrency(recentTotals.income)}</p>
          </article>
          <article className="rounded-[26px] border border-white/80 bg-white/70 p-4 shadow-card backdrop-blur-xl">
            <p className="text-sm text-stone-500">最近支出</p>
            <p className="mt-3 text-2xl font-semibold text-bark-500">{toCurrency(recentTotals.expense)}</p>
          </article>
        </div>

        <div className="mt-5 rounded-[24px] border border-white/75 bg-white/55 px-4 py-3 text-sm text-stone-500 shadow-card backdrop-blur-xl">
          {pendingReceivableCount
            ? `🌿 还有${pendingReceivableCount}笔待收，记得让它回家。`
            : pendingPayableCount
              ? `🌱 还有${pendingPayableCount}笔待支出计划。`
              : todayMood
                ? `🌿 今天：${todayMood.label}`
                : "🌿 今天也可以只是安静记录。"}
        </div>

        <div className="mt-5 rounded-[28px] border border-white/75 bg-white/55 p-4 shadow-card backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-stone-600">{batchMode ? "批量管理" : activeTravelId ? "旅行记录" : "时间线"}</h2>
            {batchMode ? (
              <button className="rounded-full bg-white/70 px-3 py-1.5 text-xs text-stone-500" type="button" onClick={cancelBatchMode}>
                取消
              </button>
            ) : (
              <span className="text-xs text-stone-400">{visibleRecords.length} 条</span>
            )}
          </div>

          {groupedRecords.length === 0 ? (
            <p className="py-8 text-center text-sm leading-6 text-stone-400">
              🌿 今天还没有留下记录
              <br />
              慢慢来也没关系。
            </p>
          ) : (
            <div className="timeline-list max-h-[430px] space-y-5 overflow-y-auto pr-1">
              {groupedRecords.map((group) => (
                <section key={group.monthKey}>
                  <div className="mb-3 flex items-center gap-3">
                    <h3 className="text-sm font-medium text-stone-600">{formatMonthLabel(group.monthKey)}</h3>
                    <span className="h-px flex-1 bg-white/70" />
                  </div>
                  <div className="space-y-3">
                    {group.records.map((record) => (
                      <SwipeRecordRow
                        key={record.id}
                        record={record}
                        batchMode={batchMode}
                        selected={selectedIds.includes(record.id)}
                        onOpen={onOpenRecord}
                        onRequestDelete={onRequestDelete}
                        onLongPress={enterBatchMode}
                        onToggleSelect={toggleSelected}
                        onAmountEdit={onQuickEditAmount}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <LightStats records={visibleRecords} monthKey={selectedMonthKey} />
        <CategorySummary records={visibleRecords} />
      </div>
      {batchMode && (
        <div className="fixed inset-x-0 bottom-24 z-30 px-5">
          <div className="mx-auto flex max-w-[430px] items-center justify-between gap-3 rounded-[24px] border border-white/80 bg-white/86 p-3 shadow-soft backdrop-blur-2xl">
            <span className="text-sm text-stone-500">已选 {selectedIds.length} 条</span>
            <button
              className="rounded-2xl bg-[#f7e9e5] px-4 py-3 text-sm font-medium text-rose-500 disabled:opacity-40"
              type="button"
              disabled={!selectedIds.length}
              onClick={deleteSelectedRecords}
            >
              {confirmBatchDelete ? "确认删除" : "删除选中记录"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function RecordPageStageOne({
  records,
  accounts,
  moodByDate,
  travels,
  activeTravelId,
  onCreateTravel,
  onSelectTravel,
  onUpdateTravelNote,
  onUpdateTravelMeta,
  onOpenAssets,
  onOpenRecord,
  onRequestDelete,
  onRequestBatchDelete,
  onCompleteReceivable,
  onCompletePayable,
  onQuickEditAmount,
}) {
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => getMonthKey());
  const [showTimelineHint, setShowTimelineHint] = useState(false);
  const [openInfoSections, setOpenInfoSections] = useState({});
  const assetPreview = accounts.filter((account) => Number(account.balance || 0) !== 0).slice(0, 2);
  const baseRecords = activeTravelId ? records.filter((record) => record.travelId === activeTravelId) : records;
  const visibleRecords = useMemo(
    () => baseRecords.filter((record) => isSameMonth(record.date, selectedMonthKey)),
    [baseRecords, selectedMonthKey],
  );
  const recentTotals = useMemo(() => {
    return visibleRecords.filter(isNormalRecord).reduce(
      (totals, record) => {
        if (record.type === "income") {
          totals.income += record.amount;
        } else {
          totals.expense += record.amount;
        }
        return totals;
      },
      { income: 0, expense: 0 },
    );
  }, [visibleRecords]);
  const monthBalance = recentTotals.income - recentTotals.expense;
  const groupedRecords = useMemo(() => groupRecordsByMonth(visibleRecords), [visibleRecords]);
  const pendingReceivableCount = records.filter(
    (record) => normalizeTransactionType(record.transactionType) === "pending_receivable" && record.transactionStatus !== "completed",
  ).length;
  const pendingPayableCount = records.filter(
    (record) => normalizeTransactionType(record.transactionType) === "pending_payable" && record.transactionStatus !== "completed",
  ).length;
  const todayMood = moodByDate[toDateInputValue(new Date())];

  function enterBatchMode(recordId) {
    setBatchMode(true);
    setSelectedIds((current) => (current.includes(recordId) ? current : [...current, recordId]));
  }

  function toggleSelected(recordId) {
    setConfirmBatchDelete(false);
    setSelectedIds((current) => (current.includes(recordId) ? current.filter((id) => id !== recordId) : [...current, recordId]));
  }

  function cancelBatchMode() {
    setBatchMode(false);
    setSelectedIds([]);
    setConfirmBatchDelete(false);
  }

  function deleteSelectedRecords() {
    if (!selectedIds.length) return;
    if (!confirmBatchDelete) {
      setConfirmBatchDelete(true);
      return;
    }
    onRequestBatchDelete(selectedIds);
    cancelBatchMode();
  }

  function moveSelectedMonth(step) {
    const next = new Date(`${selectedMonthKey}-01T00:00:00`);
    next.setMonth(next.getMonth() + step);
    setSelectedMonthKey(getMonthKey(next));
    cancelBatchMode();
  }

  function toggleInfoSection(sectionId) {
    setOpenInfoSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  }

  return (
    <section className="w-screen shrink-0 px-5 pb-40 pt-5">
      <div className="mx-auto w-full max-w-[430px]">
        <header className="flex items-start justify-between gap-3 py-2">
          <div className="min-w-0">
            <p className="text-sm text-stone-400">往左一页，看见生活的痕迹</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-stone-900">记录</h1>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              className="grid h-10 w-10 place-items-center rounded-full border border-white/80 bg-white/72 text-leaf-700 shadow-sm backdrop-blur-xl transition active:scale-[0.98]"
              type="button"
              aria-label="搜索预留"
              onClick={() => setShowTimelineHint(true)}
            >
              <Search size={17} strokeWidth={2} />
            </button>
            <button
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/80 bg-white/75 px-3 text-xs font-medium text-leaf-700 shadow-sm backdrop-blur-xl transition active:scale-[0.98]"
              type="button"
              onClick={() => setShowTimelineHint(true)}
            >
              <CalendarDays size={16} strokeWidth={1.9} />
              日历查账
            </button>
          </div>
        </header>

        <section className="mt-5 rounded-[28px] border border-white/80 bg-white/72 p-4 shadow-card backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <button
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-leaf-50 text-lg font-semibold text-leaf-700 transition active:scale-[0.98]"
              type="button"
              onClick={() => moveSelectedMonth(-1)}
              aria-label="上个月"
            >
              ‹
            </button>
            <label className="min-w-0 flex-1 text-center text-xs text-stone-400">
              月份
              <input
                className="mt-1 h-11 w-full rounded-2xl border border-leaf-100 bg-white/90 px-3 text-center text-sm font-medium text-stone-700 outline-none"
                type="month"
                value={selectedMonthKey}
                onChange={(event) => {
                  if (event.target.value) {
                    setSelectedMonthKey(event.target.value);
                    cancelBatchMode();
                  }
                }}
              />
            </label>
            <button
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-leaf-50 text-lg font-semibold text-leaf-700 transition active:scale-[0.98]"
              type="button"
              onClick={() => moveSelectedMonth(1)}
              aria-label="下个月"
            >
              ›
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <article className="rounded-[22px] bg-white/78 p-3">
              <p className="text-xs text-stone-400">本月支出</p>
              <p className="mt-2 text-xl font-semibold text-bark-500">{toCurrency(recentTotals.expense)}</p>
            </article>
            <article className="rounded-[22px] bg-leaf-50/75 p-3">
              <p className="text-xs text-stone-400">本月收入</p>
              <p className="mt-2 text-xl font-semibold text-leaf-700">{toCurrency(recentTotals.income)}</p>
            </article>
            <article className="rounded-[22px] bg-white/78 p-3">
              <p className="text-xs text-stone-400">本月结余</p>
              <p className={`mt-2 text-xl font-semibold ${monthBalance >= 0 ? "text-leaf-700" : "text-bark-500"}`}>{toCurrency(monthBalance)}</p>
            </article>
            <article className="rounded-[22px] bg-white/78 p-3">
              <p className="text-xs text-stone-400">本月记录</p>
              <p className="mt-2 text-xl font-semibold text-stone-800">{visibleRecords.length} 笔</p>
            </article>
          </div>
        </section>

        <section className="mt-5 rounded-[28px] border border-white/80 bg-white/68 p-4 shadow-card backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-stone-700">{batchMode ? "批量管理" : activeTravelId ? "旅行流水" : "本月流水"}</h2>
              <p className="mt-1 text-xs text-stone-400">{formatMonthLabel(selectedMonthKey)} · 最近记录按日期分组</p>
            </div>
            {batchMode ? (
              <button className="rounded-full bg-white/70 px-3 py-1.5 text-xs text-stone-500" type="button" onClick={cancelBatchMode}>
                取消
              </button>
            ) : (
              <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs text-stone-400">{visibleRecords.length} 笔</span>
            )}
          </div>

          {groupedRecords.length === 0 ? (
            <p className="py-8 text-center text-sm leading-6 text-stone-400">
              这个月还没有留下记录
              <br />
              慢慢来，也没关系。
            </p>
          ) : (
            <div className="timeline-list max-h-[520px] space-y-5 overflow-y-auto pr-1">
              {groupedRecords.map((group) => (
                <section key={group.monthKey}>
                  <div className="mb-3 flex items-center gap-3">
                    <h3 className="text-sm font-medium text-stone-600">{formatMonthLabel(group.monthKey)}</h3>
                    <span className="h-px flex-1 bg-white/70" />
                  </div>
                  <div className="space-y-3">
                    {group.records.map((record) => (
                      <SwipeRecordRow
                        key={record.id}
                        record={record}
                        batchMode={batchMode}
                        selected={selectedIds.includes(record.id)}
                        onOpen={onOpenRecord}
                        onRequestDelete={onRequestDelete}
                        onLongPress={enterBatchMode}
                        onToggleSelect={toggleSelected}
                        onAmountEdit={onQuickEditAmount}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>

        <section className="mt-5 rounded-[28px] border border-white/75 bg-white/50 px-4 shadow-card backdrop-blur-xl">
          <CollapsibleInfoSection
            title="账户与提醒"
            note={pendingReceivableCount || pendingPayableCount ? `待收 ${pendingReceivableCount} · 待支 ${pendingPayableCount}` : "资产入口和提醒中心收在这里"}
            count={assetPreview.length}
            open={!!openInfoSections.accounts}
            onToggle={() => toggleInfoSection("accounts")}
          >
            <div className="rounded-[22px] bg-white/60 p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-stone-600">账户概览</p>
                <button className="rounded-full bg-leaf-50 px-3 py-1.5 text-xs font-medium text-leaf-700" type="button" onClick={onOpenAssets}>
                  查看全部资产
                </button>
              </div>
              {assetPreview.length === 0 ? (
                <p className="py-2 text-sm leading-6 text-stone-400">先创建一个常用账户吧</p>
              ) : (
                <div className="grid gap-2">
                  {assetPreview.map((account) => (
                    <div key={account.id} className="flex items-center justify-between rounded-2xl bg-white/62 px-3 py-2 text-sm">
                      <span className="truncate text-stone-600">{getAccountDisplayName(account)}</span>
                      <span className="shrink-0 font-medium text-leaf-700">{toCurrency(account.balance)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <PendingCenter
              records={records}
              onCompleteReceivable={onCompleteReceivable}
              onCompletePayable={onCompletePayable}
              onDeleteReminder={onRequestDelete}
            />
          </CollapsibleInfoSection>

          <CollapsibleInfoSection
            title="旅行账本"
            note={activeTravelId ? "正在查看旅行记录" : "旅行模式和旅行备注"}
            count={travels.length}
            open={!!openInfoSections.travel}
            onToggle={() => toggleInfoSection("travel")}
          >
            <TravelModePanel
              travels={travels}
              activeTravelId={activeTravelId}
              records={records}
              onCreateTravel={onCreateTravel}
              onSelectTravel={onSelectTravel}
              onUpdateTravelNote={onUpdateTravelNote}
              onUpdateTravelMeta={onUpdateTravelMeta}
            />
          </CollapsibleInfoSection>

          <CollapsibleInfoSection
            title="月度洞察"
            note={todayMood ? `今天：${todayMood.label}` : "收入支出、节奏和分类小结"}
            count={visibleRecords.length}
            open={!!openInfoSections.insights}
            onToggle={() => toggleInfoSection("insights")}
          >
            <div className="grid grid-cols-2 gap-3">
              <article className="rounded-[22px] border border-white/80 bg-white/70 p-4">
                <p className="text-xs text-stone-400">最近收入</p>
                <p className="mt-2 text-lg font-semibold text-leaf-700">{toCurrency(recentTotals.income)}</p>
              </article>
              <article className="rounded-[22px] border border-white/80 bg-white/70 p-4">
                <p className="text-xs text-stone-400">最近支出</p>
                <p className="mt-2 text-lg font-semibold text-bark-500">{toCurrency(recentTotals.expense)}</p>
              </article>
            </div>
            <LightStats records={visibleRecords} monthKey={selectedMonthKey} />
            <CategorySummary records={visibleRecords} />
          </CollapsibleInfoSection>
        </section>
      </div>

      {batchMode && (
        <div className="fixed inset-x-0 bottom-24 z-30 px-5">
          <div className="mx-auto flex max-w-[430px] items-center justify-between gap-3 rounded-[24px] border border-white/80 bg-white/86 p-3 shadow-soft backdrop-blur-2xl">
            <span className="text-sm text-stone-500">已选 {selectedIds.length} 笔</span>
            <button
              className="rounded-2xl bg-[#f7e9e5] px-4 py-3 text-sm font-medium text-rose-500 disabled:opacity-40"
              type="button"
              disabled={!selectedIds.length}
              onClick={deleteSelectedRecords}
            >
              {confirmBatchDelete ? "确认删除" : "删除选中记录"}
            </button>
          </div>
        </div>
      )}

      {showTimelineHint && <TimelineHintSheet onClose={() => setShowTimelineHint(false)} />}
    </section>
  );
}

function SummaryCard({ card }) {
  return (
    <article className={`${card.tone} rounded-[28px] border border-white/85 p-5 shadow-card backdrop-blur-xl`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-stone-500">{card.label}</p>
          <p className={`mt-3 text-3xl font-semibold tracking-normal ${card.accent}`}>{card.amount}</p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/80 text-leaf-500 shadow-sm">
          <Leaf size={18} strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-5 text-sm text-stone-400">{card.note}</p>
      {card.progress && (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-white/70">
            <div
              className="h-full rounded-full bg-gradient-to-r from-leaf-300 via-[#eadb96] to-[#e7b294] transition-all"
              style={{ width: `${card.progress.percent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-stone-400">{card.progress.label}</p>
        </div>
      )}
    </article>
  );
}

function CalendarPanel({ value, onChange }) {
  const [viewMonth, setViewMonth] = useState(value.slice(0, 7));
  const firstDay = new Date(`${viewMonth}-01T00:00:00`);
  const viewYear = Number(viewMonth.slice(0, 4));
  const viewMonthNumber = Number(viewMonth.slice(5, 7));
  const monthStartWeekday = firstDay.getDay();
  const daysInMonth = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: monthStartWeekday + daysInMonth }, (_, index) =>
    index < monthStartWeekday ? null : String(index - monthStartWeekday + 1).padStart(2, "0"),
  );

  function moveMonth(step) {
    const next = new Date(`${viewMonth}-01T00:00:00`);
    next.setMonth(next.getMonth() + step);
    setViewMonth(getMonthKey(next));
  }

  function updateViewMonth(year, month) {
    setViewMonth(`${year}-${String(month).padStart(2, "0")}`);
  }

  return (
    <div className="rounded-[22px] border border-white/80 bg-white/76 p-3 shadow-sm">
      <label className="mb-3 block text-xs text-stone-400">
        直接输入日期
        <input
          className="mt-1 h-10 w-full rounded-2xl bg-white/70 px-3 text-sm text-stone-600 outline-none"
          type="date"
          value={value}
          onChange={(event) => {
            if (!event.target.value) return;
            onChange(event.target.value);
            setViewMonth(event.target.value.slice(0, 7));
          }}
        />
      </label>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <label className="text-xs text-stone-400">
          年份
          <select
            className="mt-1 h-10 w-full rounded-2xl bg-leaf-50/70 px-3 text-sm text-stone-600 outline-none"
            value={viewYear}
            onChange={(event) => updateViewMonth(Number(event.target.value), viewMonthNumber)}
          >
            {Array.from({ length: 21 }, (_, index) => new Date().getFullYear() - 10 + index).map((year) => (
              <option key={year} value={year}>
                {year}年
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-stone-400">
          月份
          <select
            className="mt-1 h-10 w-full rounded-2xl bg-leaf-50/70 px-3 text-sm text-stone-600 outline-none"
            value={viewMonthNumber}
            onChange={(event) => updateViewMonth(viewYear, Number(event.target.value))}
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
              <option key={month} value={month}>
                {month}月
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mb-3 flex items-center justify-between">
        <button className="rounded-full bg-leaf-50 px-3 py-1.5 text-xs text-leaf-700" type="button" onClick={() => moveMonth(-1)}>
          上月
        </button>
        <span className="text-sm font-medium text-stone-600">{formatMonthLabel(viewMonth)}</span>
        <button className="rounded-full bg-leaf-50 px-3 py-1.5 text-xs text-leaf-700" type="button" onClick={() => moveMonth(1)}>
          下月
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-stone-400">
        {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const dateValue = day ? `${viewMonth}-${day}` : "";
          const active = dateValue === value;
          return day ? (
            <button
              key={dateValue}
              className={`aspect-square rounded-xl text-sm transition active:scale-[0.96] ${
                active ? "bg-leaf-700 text-white" : "bg-white/55 text-stone-600"
              }`}
              type="button"
              onClick={() => onChange(dateValue)}
            >
              {Number(day)}
            </button>
          ) : (
            <span key={`blank-${index}`} />
          );
        })}
      </div>
    </div>
  );
}

function RecordEditSheet({ record, accounts, onClose, onSave, onDelete }) {
  const [draft, setDraft] = useState(() => ({
    category: record?.category || "其他",
    accountId: record?.accountId || "cash",
    date: record?.date || toDateInputValue(new Date()),
    amount: String(record?.amount || ""),
    note: record?.note || "",
    affectsBalance: record?.affectsBalance ?? true,
  }));
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (!record) return;
    setDraft({
      category: record.category || "其他",
      accountId: record.accountId || "cash",
      date: record.date || toDateInputValue(new Date()),
      amount: String(record.amount || ""),
      note: record.note || "",
      affectsBalance: record.affectsBalance ?? true,
    });
    setShowCalendar(false);
  }, [record]);

  if (!record) return null;
  const transactionType = normalizeTransactionType(record.transactionType);
  const transactionMeta = transactionTypeMeta[transactionType] || transactionTypeMeta.normal;

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-stone-900/24 px-4 pb-4 backdrop-blur-md" onClick={onClose}>
      <div
        className="mx-auto max-h-[calc(100dvh-2rem)] w-full max-w-[430px] overflow-y-auto rounded-[32px] border border-leaf-100 bg-[#fffef9] p-5 shadow-[0_24px_70px_rgba(65,84,55,0.26)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-stone-400">轻轻改一下</p>
            <h2 className="mt-1 text-lg font-semibold text-stone-800">{record.title}</h2>
            <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs ${transactionType === "normal" ? "bg-white/70 text-stone-400" : transactionMeta.className}`}>
              {transactionType === "normal" ? "普通记录" : transactionMeta.label}
            </span>
          </div>
          <button className="rounded-full bg-leaf-50 px-3 py-1.5 text-xs text-leaf-700" type="button" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-stone-400">
            分类
            <select
              className="mt-1 h-12 w-full rounded-2xl border border-leaf-100 bg-white px-3 text-sm text-stone-800 outline-none"
              value={draft.category}
              onChange={(event) => updateDraft("category", event.target.value)}
            >
              {editableCategories.map((category) => (
                <option key={category} value={category}>
                  {iconByCategory[category] || iconByCategory.其他} {category}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-stone-400">
            账户
            <select
              className="mt-1 h-12 w-full rounded-2xl border border-leaf-100 bg-white px-3 text-sm text-stone-800 outline-none"
              value={draft.accountId}
              onChange={(event) => updateDraft("accountId", event.target.value)}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.shortName}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-xs text-stone-400">
            金额
            <span className="mt-1 flex h-12 items-center rounded-2xl border border-leaf-100 bg-white px-3 shadow-inner">
              <span className="mr-1 text-stone-400">¥</span>
              <input
                className="min-w-0 flex-1 bg-transparent text-sm text-stone-800 outline-none"
                inputMode="decimal"
                value={draft.amount}
                onChange={(event) => updateDraft("amount", event.target.value.replace(/[^\d.]/g, ""))}
              />
            </span>
          </label>
          <label className="text-xs text-stone-400">
            日期
            <button
              className="mt-1 h-12 w-full rounded-2xl border border-leaf-100 bg-white px-3 text-left text-sm text-stone-800"
              type="button"
              onClick={() => setShowCalendar((value) => !value)}
            >
              {draft.date}
            </button>
          </label>
        </div>

        {showCalendar && (
          <div className="mt-3">
            <CalendarPanel value={draft.date} onChange={(date) => updateDraft("date", date)} />
          </div>
        )}

        <label className="mt-3 block text-xs text-stone-400">
          备注
          <textarea
            className="mt-1 min-h-16 w-full resize-none rounded-2xl border border-leaf-100 bg-white px-3 py-3 text-sm text-stone-800 outline-none placeholder:text-stone-300"
            placeholder="可以空着"
            value={draft.note}
            onChange={(event) => updateDraft("note", event.target.value)}
          />
        </label>

        {isNormalRecord(record) && (
          <button
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-xs text-stone-500"
            type="button"
            onClick={() => updateDraft("affectsBalance", !draft.affectsBalance)}
          >
            <span className={`h-3 w-3 rounded-full ${draft.affectsBalance ? "bg-leaf-500" : "bg-stone-300"}`} />
            计入账户余额
          </button>
        )}

        <div className="mt-5 grid grid-cols-[1fr_1fr_1.4fr] gap-2">
          <button className="rounded-2xl bg-[#f7e9e5] px-3 py-3 text-sm font-medium text-rose-500" type="button" onClick={() => onDelete(record.id)}>
            删除
          </button>
          <button className="rounded-2xl bg-white/70 px-3 py-3 text-sm font-medium text-stone-500" type="button" onClick={onClose}>
            取消
          </button>
          <button
            className="rounded-2xl bg-leaf-700 px-3 py-3 text-sm font-medium text-white"
            type="button"
            onClick={() =>
              onSave(record.id, {
                ...draft,
                amount: Number(draft.amount || 0),
              })
            }
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function RecordAmountSheet({ record, onClose, onSave }) {
  const [draft, setDraft] = useState(() => String(record?.amount || ""));
  const inputRef = useRef(null);

  useEffect(() => {
    setDraft(String(record?.amount || ""));
    window.setTimeout(() => inputRef.current?.focus(), 40);
  }, [record]);

  if (!record) return null;

  function saveAmount() {
    const amount = Number(draft || 0);
    if (!Number.isFinite(amount)) return;
    onSave(record.id, { amount });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-stone-900/24 px-4 pb-4 backdrop-blur-md" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-[430px] rounded-[30px] border border-leaf-100 bg-[#fffef9] p-5 shadow-[0_24px_70px_rgba(65,84,55,0.26)]"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-sm font-medium text-stone-500">快速修改金额</p>
        <h2 className="mt-1 truncate text-lg font-semibold text-stone-800">{record.title}</h2>
        <label className="mt-5 flex h-16 items-center rounded-[24px] border border-leaf-200 bg-white px-4 shadow-inner">
          <span className="mr-2 text-lg font-medium text-stone-500">¥</span>
          <input
            ref={inputRef}
            className="min-w-0 flex-1 bg-transparent text-2xl font-semibold text-stone-800 outline-none placeholder:text-stone-300"
            inputMode="decimal"
            value={draft}
            onChange={(event) => setDraft(event.target.value.replace(/[^\d.]/g, ""))}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                saveAmount();
              }
            }}
          />
        </label>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button className="rounded-2xl border border-stone-200 bg-white px-3 py-3 text-sm font-medium text-stone-600" type="button" onClick={onClose}>
            取消
          </button>
          <button className="rounded-2xl bg-leaf-700 px-3 py-3 text-sm font-medium text-white shadow-sm" type="button" onClick={saveAmount}>
            保存金额
          </button>
        </div>
      </div>
    </div>
  );
}

function BudgetModal({ draft, setDraft, onClose, onSave, onClear }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-stone-900/12 px-6 backdrop-blur-sm">
      <div className="w-full max-w-[330px] rounded-[30px] border border-white/80 bg-white/88 p-5 shadow-soft backdrop-blur-2xl">
        <h2 className="text-lg font-semibold text-stone-800">本月预算</h2>
        <p className="mt-2 text-sm leading-6 text-stone-400">可设置，也可以先空着。只是帮你轻轻看一眼这个月。</p>
        <label className="mt-5 flex h-14 items-center rounded-[22px] border border-leaf-100 bg-white/70 px-4">
          <span className="mr-2 text-stone-400">¥</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-xl font-semibold text-stone-700 outline-none placeholder:text-stone-300"
            inputMode="decimal"
            placeholder="例如 3000"
            value={draft}
            onChange={(event) => setDraft(event.target.value.replace(/[^\d.]/g, ""))}
          />
        </label>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <button className="rounded-2xl bg-leaf-50 px-3 py-3 text-sm font-medium text-leaf-700" type="button" onClick={onClose}>
            取消
          </button>
          <button className="rounded-2xl bg-white/70 px-3 py-3 text-sm font-medium text-stone-400" type="button" onClick={onClear}>
            暂不设置
          </button>
          <button className="rounded-2xl bg-leaf-700 px-3 py-3 text-sm font-medium text-white" type="button" onClick={onSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function RecentRecords({ records, onOpenRecord, onRequestDelete, onQuickEditAmount }) {
  return (
    <section className="mt-5 rounded-[28px] border border-white/70 bg-white/45 p-4 shadow-card backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-stone-600">最近记录</h2>
        <span className="text-xs text-stone-400">最近 3 条</span>
      </div>
      {records.length === 0 ? (
        <p className="py-2 text-sm text-stone-400">还没有记录，先写一句试试。</p>
      ) : (
        <div className="space-y-2">
          {records.slice(0, 3).map((record) => (
            <SwipeRecordRow
              key={record.id}
              record={record}
              compact
              onOpen={onOpenRecord}
              onRequestDelete={onRequestDelete}
              onAmountEdit={onQuickEditAmount}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function App() {
  const [records, setRecords] = useState(() => loadRecords());
  const [moodByDate, setMoodByDate] = useState(() => loadMoods());
  const [accounts, setAccounts] = useState(() => loadAccounts());
  const [defaultAccountId, setDefaultAccountId] = useState(() => loadDefaultAccountId());
  const [travels, setTravels] = useState(() => loadTravels());
  const [activeTravelId, setActiveTravelId] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState(() => loadBudget());
  const [quickText, setQuickText] = useState("");
  const [feedback, setFeedback] = useState("");
  const [pulseKey, setPulseKey] = useState(0);
  const [pageIndex, setPageIndex] = useState(1);
  const [showAssets, setShowAssets] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [deleteCandidateId, setDeleteCandidateId] = useState(null);
  const [undoDelete, setUndoDelete] = useState(null);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [quickAmountRecordId, setQuickAmountRecordId] = useState(null);
  const [touchStartX, setTouchStartX] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const todayDate = toDateInputValue(new Date());
  const editingRecord = records.find((record) => record.id === editingRecordId) || null;
  const quickAmountRecord = records.find((record) => record.id === quickAmountRecordId) || null;

  useEffect(() => {
    saveRecords(records);
  }, [records]);

  useEffect(() => {
    saveMoods(moodByDate);
  }, [moodByDate]);

  useEffect(() => {
    saveAccounts(accounts);
  }, [accounts]);

  useEffect(() => {
    saveTravels(travels);
  }, [travels]);

  useEffect(() => {
    if (accounts.some((account) => account.id === defaultAccountId)) return;
    setDefaultAccountId("cash");
    saveDefaultAccountId("cash");
  }, [accounts, defaultAccountId]);

  useEffect(() => {
    saveBudget(monthlyBudget);
  }, [monthlyBudget]);

  useEffect(() => {
    if (!feedback) return undefined;
    if (undoDelete) return undefined;
    const timer = window.setTimeout(() => {
      setFeedback("");
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [feedback, pulseKey, undoDelete]);

  useEffect(() => {
    if (!undoDelete) return undefined;
    const timer = window.setTimeout(() => {
      setUndoDelete(null);
      setFeedback("");
    }, 5200);
    return () => window.clearTimeout(timer);
  }, [undoDelete]);

  const summaryCards = useMemo(() => {
    const currentMonthKey = getMonthKey();
    const activeBudget = monthlyBudget?.monthKey === currentMonthKey ? Number(monthlyBudget.amount || 0) : 0;
    const todayExpense = records
      .filter((record) => isNormalRecord(record) && record.type === "expense" && isToday(record.date))
      .reduce((sum, record) => sum + record.amount, 0);
    const todayIncome = records
      .filter((record) => isNormalRecord(record) && record.type === "income" && isToday(record.date))
      .reduce((sum, record) => sum + record.amount, 0);
    const monthBalance = records
      .filter((record) => isNormalRecord(record) && isSameMonth(record.date, currentMonthKey))
      .reduce((sum, record) => sum + (record.type === "income" ? record.amount : -record.amount), 0);
    const monthExpense = records
      .filter((record) => isNormalRecord(record) && record.type === "expense" && isSameMonth(record.date, currentMonthKey))
      .reduce((sum, record) => sum + record.amount, 0);
    const budgetBalance = activeBudget ? activeBudget - monthExpense : monthBalance;
    const budgetPercent = activeBudget ? Math.max(0, Math.min(100, ((activeBudget - monthExpense) / activeBudget) * 100)) : 0;

    return [
      {
        label: "今日支出",
        amount: toCurrency(todayExpense),
        note: todayExpense ? "刚刚记好了" : "今天还很轻盈",
        tone: "bg-white/75",
        accent: "text-bark-500",
      },
      {
        label: "今日收入",
        amount: toCurrency(todayIncome),
        note: todayIncome ? "有新的进账" : "慢慢来就好",
        tone: "bg-leaf-50/80",
        accent: "text-leaf-700",
      },
      {
        label: "月余额",
        amount: toCurrency(budgetBalance),
        note: activeBudget ? "按本月预算轻轻算了一下" : "你可以设置本月预算获得更直观提示 🌿",
        tone: "bg-white/80",
        accent: "text-leaf-700",
        progress: activeBudget
          ? {
              percent: budgetPercent,
              label: `还剩 ${Math.round(budgetPercent)}% · 本月预算 ${toCurrency(activeBudget)}`,
            }
          : null,
      },
    ];
  }, [records, monthlyBudget]);

  function submitQuickEntry() {
    const cleanText = quickText.trim();
    if (!cleanText) return;

    const emotion = detectEmotion(cleanText);
    const activeTravel = travels.find((travel) => travel.id === activeTravelId) || null;
    const parsed = parseQuickEntry(cleanText, defaultAccountId, accounts, activeTravel);
    if (!parsed.amount && emotion) {
      saveDetectedMood(emotion, cleanText);
      setQuickText("");
      setFeedback(`🌿 ${emotion.feedback}`);
      setPulseKey((key) => key + 1);
      return;
    }

    if (!parsed.amount) {
      setFeedback("写上金额就能记啦");
      setPulseKey((key) => key + 1);
      return;
    }

    const didApplyBalance = shouldRecordAffectBalance(parsed) && recordCanAffectBalance(accounts, parsed);
    const appliedAccountName = didApplyBalance ? getAccountNameById(accounts, parsed.accountId) : "";
    const recordToSave = {
      ...parsed,
      balanceApplied: didApplyBalance,
    };
    const nextAccounts = didApplyBalance ? applyRecordToAccounts(accounts, recordToSave, "apply") : accounts;
    const nextRecords = [recordToSave, ...records].slice(0, 60);
    setAccounts(nextAccounts);
    saveAccounts(nextAccounts);
    setRecords(nextRecords);
    saveRecords(nextRecords);
    if (emotion) {
      saveDetectedMood(emotion, cleanText);
    }
    setQuickText("");
    const pendingText = parsed.transactionType === "pending_receivable" ? "，待收已先扣余额" : "";
    setFeedback(emotion ? `🌿 ${emotion.feedback}` : appliedAccountName ? `🌿 轻轻记下啦，${appliedAccountName}余额已更新${pendingText}` : "🌱 今天也认真生活了");
    setPulseKey((key) => key + 1);
  }

  function handleSubmit(event) {
    event.preventDefault();
    submitQuickEntry();
  }

  function handleTouchStart(event) {
    if (event.target.closest("input, button, form, [data-record-row]")) {
      setTouchStartX(null);
      return;
    }
    setTouchStartX(event.touches[0].clientX);
  }

  function handleTouchEnd(event) {
    if (touchStartX === null) return;

    const deltaX = event.changedTouches[0].clientX - touchStartX;
    if (deltaX < -48) {
      setPageIndex((current) => Math.min(current + 1, 2));
    } else if (deltaX > 48) {
      setPageIndex((current) => Math.max(current - 1, 0));
    }
    setTouchStartX(null);
  }

  function handleSelectMood(mood) {
    setMoodByDate((current) => ({
      ...current,
      [todayDate]: {
        id: mood.id,
        label: mood.label,
        date: todayDate,
        createdAt: new Date().toISOString(),
      },
    }));
  }

  function openBudgetModal() {
    const currentMonthKey = getMonthKey();
    setBudgetDraft(monthlyBudget?.monthKey === currentMonthKey && monthlyBudget.amount ? String(monthlyBudget.amount) : "");
    setShowBudgetModal(true);
  }

  function saveMonthlyBudget() {
    const amount = Number(budgetDraft || 0);
    if (!amount) {
      setMonthlyBudget(null);
      setShowBudgetModal(false);
      setFeedback("本月先不设预算也可以。");
      setPulseKey((key) => key + 1);
      return;
    }
    setMonthlyBudget({
      monthKey: getMonthKey(),
      amount,
      updatedAt: new Date().toISOString(),
    });
    setShowBudgetModal(false);
    setFeedback("本月预算已轻轻放好。");
    setPulseKey((key) => key + 1);
  }

  function clearMonthlyBudget() {
    setMonthlyBudget(null);
    setBudgetDraft("");
    setShowBudgetModal(false);
    setFeedback("本月先不设预算也可以。");
    setPulseKey((key) => key + 1);
  }

  function saveDetectedMood(emotion, rawText) {
    if (!emotion) return;
    const nextMoodByDate = {
      ...moodByDate,
      [todayDate]: {
        id: emotion.moodId,
        label: emotion.moodLabel,
        date: todayDate,
        raw: rawText,
        source: "quick-input",
        createdAt: new Date().toISOString(),
      },
    };
    setMoodByDate(nextMoodByDate);
    saveMoods(nextMoodByDate);
  }

  function handleUpdateAccount(accountId, value) {
    const cleanValue = value.replace(/[^\d.]/g, "");
    const nextValue = cleanValue.split(".").length > 2 ? cleanValue.slice(0, -1) : cleanValue;
    setAccounts((current) =>
      current.map((account) =>
        account.id === accountId
          ? {
              ...account,
              balance: nextValue,
            }
          : account,
      ),
    );
  }

  function handleUpdateAccountDetails(accountId, updates) {
    setAccounts((current) =>
      current.map((account) =>
        account.id === accountId
          ? {
              ...account,
              customName: updates.customName ?? account.customName ?? "",
              note: updates.note ?? account.note ?? "",
            }
          : account,
      ),
    );
  }

  function handleUpdateDefaultAccount(accountId) {
    setDefaultAccountId(accountId);
    saveDefaultAccountId(accountId);
    setFeedback("默认账户已更新");
    setPulseKey((key) => key + 1);
  }

  function handleCreateTravel(name) {
    const travel = {
      id: createRecordId(),
      name,
      location: "",
      weather: "",
      notes: {},
      createdAt: new Date().toISOString(),
    };
    const nextTravels = [travel, ...travels];
    setTravels(nextTravels);
    saveTravels(nextTravels);
    setActiveTravelId(travel.id);
    setFeedback("旅行账本已轻轻放好");
    setPulseKey((key) => key + 1);
  }

  function handleUpdateTravelNote(travelId, date, note) {
    setTravels((current) =>
      current.map((travel) =>
        travel.id === travelId
          ? {
              ...travel,
              notes: {
                ...(travel.notes || {}),
                [date]: note,
              },
            }
          : travel,
      ),
    );
  }

  function handleUpdateTravelMeta(travelId, updates) {
    setTravels((current) => current.map((travel) => (travel.id === travelId ? { ...travel, ...updates } : travel)));
  }

  function handleToggleAffectsBalance(recordId) {
    const record = records.find((item) => item.id === recordId);
    if (!record) return;
    if (!isNormalRecord(record)) {
      setFeedback("这条先作为待办记录，不计入账户余额。");
      setPulseKey((key) => key + 1);
      return;
    }

    const nextAffectsBalance = !record.affectsBalance;
    if (record.balanceApplied && !nextAffectsBalance) {
      setAccounts((current) => applyRecordToAccounts(current, record, "revert"));
    } else if (!record.balanceApplied && nextAffectsBalance) {
      setAccounts((current) => applyRecordToAccounts(current, record, "apply"));
    }

    setRecords((current) =>
      current.map((item) =>
        item.id === recordId
          ? {
              ...item,
              affectsBalance: nextAffectsBalance,
              balanceApplied: nextAffectsBalance,
            }
          : item,
      ),
    );
  }

  function handleSaveRecordEdits(recordId, updates) {
    const record = records.find((item) => item.id === recordId);
    if (!record) return;

    const nextRecord = { ...record };
    if (updates.accountId) {
      const account = accounts.find((item) => item.id === updates.accountId);
      if (!account) return;
      nextRecord.accountId = account.id;
      nextRecord.account = account.name;
    }
    nextRecord.category = updates.category ?? record.category;
    nextRecord.date = updates.date ?? record.date;
    nextRecord.amount = Number(updates.amount ?? record.amount ?? 0);
    nextRecord.note = updates.note ?? record.note ?? "";
    nextRecord.affectsBalance = updates.affectsBalance ?? record.affectsBalance ?? true;

    let nextAccounts = accounts;
    if (record.balanceApplied && shouldRecordAffectBalance(record)) {
      nextAccounts = applyRecordToAccounts(nextAccounts, record, "revert");
    }
    const shouldApplyBalance = shouldRecordAffectBalance(nextRecord) && recordCanAffectBalance(nextAccounts, nextRecord);
    if (shouldApplyBalance) {
      nextAccounts = applyRecordToAccounts(nextAccounts, nextRecord, "apply");
    }
    nextRecord.balanceApplied = shouldApplyBalance;

    const nextRecords = records.map((item) => (item.id === recordId ? nextRecord : item));
    setAccounts(nextAccounts);
    saveAccounts(nextAccounts);
    setRecords(nextRecords);
    saveRecords(nextRecords);
    setEditingRecordId(null);
    setQuickAmountRecordId(null);
    setFeedback("这条记录已轻轻改好。");
    setPulseKey((key) => key + 1);
  }

  function requestDeleteRecord(recordId) {
    const record = records.find((item) => item.id === recordId);
    if (!record) return;
    const recordIndex = records.findIndex((item) => item.id === recordId);
    let nextAccounts = accounts;
    if (shouldRecordAffectBalance(record) && record.balanceApplied) {
      nextAccounts = applyRecordToAccounts(nextAccounts, record, "revert");
    }
    const nextRecords = records.filter((item) => item.id !== recordId);

    setEditingRecordId(null);
    setQuickAmountRecordId(null);
    setDeleteCandidateId(null);
    setUndoDelete({ items: [{ record, index: recordIndex }] });
    setAccounts(nextAccounts);
    saveAccounts(nextAccounts);
    setRecords(nextRecords);
    saveRecords(nextRecords);
    setFeedback("这条记录已轻轻移走");
    setPulseKey((key) => key + 1);
  }

  function cancelDeleteRecord() {
    setDeleteCandidateId(null);
  }

  function confirmDeleteRecord() {
    const record = records.find((item) => item.id === deleteCandidateId);
    if (!record) {
      setDeleteCandidateId(null);
      return;
    }

    if (shouldRecordAffectBalance(record) && record.balanceApplied) {
      setAccounts((current) => applyRecordToAccounts(current, record, "revert"));
    }
    setRecords((current) => current.filter((item) => item.id !== record.id));
    setQuickAmountRecordId(null);
    setDeleteCandidateId(null);
    setFeedback(record.balanceApplied ? "已删除，余额也帮你恢复啦。" : "这条记录已轻轻移走。");
    setPulseKey((key) => key + 1);
  }

  function undoLastDelete() {
    if (!undoDelete) return;
    const items = undoDelete.items || [{ record: undoDelete.record, index: undoDelete.index }];
    let nextAccounts = accounts;
    items.forEach(({ record }) => {
      if (shouldRecordAffectBalance(record) && record.balanceApplied) {
        nextAccounts = applyRecordToAccounts(nextAccounts, record, "apply");
      }
    });
    const nextRecords = [...records];
    [...items]
      .sort((a, b) => a.index - b.index)
      .forEach(({ record, index }) => {
        nextRecords.splice(Math.max(0, index), 0, record);
      });
    setAccounts(nextAccounts);
    saveAccounts(nextAccounts);
    setRecords(nextRecords);
    saveRecords(nextRecords);
    setUndoDelete(null);
    setFeedback("已恢复回来啦");
    setPulseKey((key) => key + 1);
  }

  function requestBatchDeleteRecords(recordIds) {
    const ids = new Set(recordIds);
    const items = records
      .map((record, index) => ({ record, index }))
      .filter(({ record }) => ids.has(record.id));
    if (!items.length) return;

    let nextAccounts = accounts;
    items.forEach(({ record }) => {
      if (shouldRecordAffectBalance(record) && record.balanceApplied) {
        nextAccounts = applyRecordToAccounts(nextAccounts, record, "revert");
      }
    });
    const nextRecords = records.filter((record) => !ids.has(record.id));
    setEditingRecordId(null);
    setDeleteCandidateId(null);
    setUndoDelete({ items });
    setAccounts(nextAccounts);
    saveAccounts(nextAccounts);
    setRecords(nextRecords);
    saveRecords(nextRecords);
    setFeedback(`${items.length} 条记录已轻轻移走`);
    setPulseKey((key) => key + 1);
  }

  function completeReceivable(recordId) {
    const record = records.find((item) => item.id === recordId);
    if (!record || normalizeTransactionType(record.transactionType) !== "pending_receivable" || record.transactionStatus === "completed") return;
    const incomeRecord = {
      ...record,
      id: createRecordId(),
      raw: `${record.account}收入${record.amount}${record.title}收回`,
      title: `${record.title}收回`,
      type: "income",
      category: "收入",
      transactionType: "normal",
      transactionStatus: "open",
      affectsBalance: true,
      balanceApplied: true,
      date: toDateInputValue(new Date()),
      createdAt: new Date().toISOString(),
    };
    const nextAccounts = applyRecordToAccounts(accounts, incomeRecord, "apply");
    const nextRecords = [
      incomeRecord,
      ...records.map((item) =>
        item.id === recordId
          ? {
              ...item,
              transactionStatus: "completed",
              affectsBalance: false,
              balanceApplied: false,
            }
          : item,
      ),
    ];
    setAccounts(nextAccounts);
    saveAccounts(nextAccounts);
    setRecords(nextRecords);
    saveRecords(nextRecords);
    setFeedback("这笔待收已回家啦");
    setPulseKey((key) => key + 1);
  }

  function completePayable(recordId) {
    const record = records.find((item) => item.id === recordId);
    if (!record || normalizeTransactionType(record.transactionType) !== "pending_payable" || record.transactionStatus === "completed") return;
    const paidRecord = {
      ...record,
      transactionType: "normal",
      transactionStatus: "completed",
      affectsBalance: true,
      balanceApplied: true,
    };
    const nextAccounts = applyRecordToAccounts(accounts, paidRecord, "apply");
    const nextRecords = records.map((item) => (item.id === recordId ? paidRecord : item));
    setAccounts(nextAccounts);
    saveAccounts(nextAccounts);
    setRecords(nextRecords);
    saveRecords(nextRecords);
    setFeedback("计划支出已记成真实支出");
    setPulseKey((key) => key + 1);
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8fbf7] text-stone-900">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_8%,rgba(206,229,197,0.72),transparent_30%),radial-gradient(circle_at_86%_20%,rgba(234,225,204,0.5),transparent_28%)]" />
      <ForestScene />
      {IS_DEMO_MODE && (
        <div className="pointer-events-none fixed right-4 top-4 z-40 rounded-full border border-white/80 bg-white/68 px-3 py-1.5 text-xs font-medium text-leaf-700 shadow-sm backdrop-blur-xl">
          🌿 演示模式
        </div>
      )}
      <div
        className="relative z-[1] flex min-h-screen w-[300vw] transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${pageIndex * 100}vw)` }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <EmotionPage selectedMoodId={moodByDate[todayDate]?.id} onSelectMood={handleSelectMood} />
        <section className="w-screen shrink-0">
          <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-5 pb-36 pt-5">
            <header className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm text-stone-400">今天也慢慢来</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-normal text-stone-900">轻记账</h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex h-11 items-center rounded-full border border-white/80 bg-white/70 px-3 text-sm font-medium text-leaf-700 shadow-sm backdrop-blur-xl transition active:scale-[0.98]"
                  type="button"
                  onClick={openBudgetModal}
                >
                  预算
                </button>
                <button
                  className="inline-flex h-11 items-center gap-1 rounded-full border border-white/80 bg-white/75 px-4 text-sm font-medium text-leaf-700 shadow-sm backdrop-blur-xl transition active:scale-[0.98]"
                  type="button"
                  aria-label="进入资产页"
                  onClick={() => setShowAssets(true)}
                >
                  资产
                  <ChevronRight size={16} strokeWidth={2} />
                </button>
              </div>
            </header>

            <section className="mt-9 flex flex-1 flex-col justify-center gap-4">
              <div className="mb-2 flex items-center gap-2 pl-1 text-sm text-leaf-700">
                <Sprout size={17} strokeWidth={1.9} />
                <span>今日概览</span>
              </div>
              {summaryCards.map((card) => (
                <SummaryCard key={card.label} card={card} />
              ))}
              <RecentRecords
                records={records}
                onOpenRecord={setEditingRecordId}
                onRequestDelete={requestDeleteRecord}
                onQuickEditAmount={setQuickAmountRecordId}
              />
            </section>
          </div>
        </section>
        <RecordPageStageOne
          records={records}
          accounts={accounts}
          moodByDate={moodByDate}
          travels={travels}
          activeTravelId={activeTravelId}
          onCreateTravel={handleCreateTravel}
          onSelectTravel={setActiveTravelId}
          onUpdateTravelNote={handleUpdateTravelNote}
          onUpdateTravelMeta={handleUpdateTravelMeta}
          onOpenAssets={() => setShowAssets(true)}
          onOpenRecord={setEditingRecordId}
          onRequestDelete={requestDeleteRecord}
          onRequestBatchDelete={requestBatchDeleteRecords}
          onCompleteReceivable={completeReceivable}
          onCompletePayable={completePayable}
          onQuickEditAmount={setQuickAmountRecordId}
        />
      </div>

      {editingRecord && (
        <RecordEditSheet
          record={editingRecord}
          accounts={accounts}
          onClose={() => setEditingRecordId(null)}
          onSave={handleSaveRecordEdits}
          onDelete={requestDeleteRecord}
        />
      )}

      {quickAmountRecord && (
        <RecordAmountSheet
          record={quickAmountRecord}
          onClose={() => setQuickAmountRecordId(null)}
          onSave={handleSaveRecordEdits}
        />
      )}

      <div className={`fixed bottom-[5.8rem] left-1/2 z-20 flex -translate-x-1/2 gap-1.5 transition-opacity ${feedback ? "pointer-events-none opacity-0" : "opacity-100"}`}>
        <button
          className={`h-2 rounded-full transition-all ${pageIndex === 0 ? "w-6 bg-leaf-700" : "w-2 bg-leaf-200"}`}
          type="button"
          aria-label="打开情绪页"
          onClick={() => setPageIndex(0)}
        />
        <button
          className={`h-2 rounded-full transition-all ${pageIndex === 1 ? "w-6 bg-leaf-700" : "w-2 bg-leaf-200"}`}
          type="button"
          aria-label="回到首页"
          onClick={() => setPageIndex(1)}
        />
        <button
          className={`h-2 rounded-full transition-all ${pageIndex === 2 ? "w-6 bg-leaf-700" : "w-2 bg-leaf-200"}`}
          type="button"
          aria-label="打开记录页"
          onClick={() => setPageIndex(2)}
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/80 bg-white/70 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-2xl">
        <div className="mx-auto max-w-[430px]">
          {feedback && (
            <div key={pulseKey} className="quick-feedback mb-2 flex items-center justify-center gap-3 px-2 text-center text-sm text-leaf-700">
              <span>{feedback}</span>
              {undoDelete && (
                <button
                  className="rounded-full bg-leaf-50 px-3 py-1 text-xs font-medium text-leaf-700"
                  type="button"
                  onClick={undoLastDelete}
                >
                  撤销
                </button>
              )}
            </div>
          )}
          <form className="flex h-14 items-center rounded-[24px] border border-leaf-100 bg-white/90 px-5 shadow-soft" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="quick-note">
              记录一下今天？
            </label>
            <input
              id="quick-note"
              className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-stone-800 outline-none placeholder:text-stone-400"
              placeholder="记录一下今天？"
              type="text"
              value={quickText}
              onChange={(event) => setQuickText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitQuickEntry();
                }
              }}
            />
            <button
              className="ml-3 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-leaf-700 text-white shadow-sm transition active:scale-95"
              type="button"
              aria-label="提交记录"
              onClick={submitQuickEntry}
              onTouchEnd={(event) => {
                event.preventDefault();
                event.stopPropagation();
                submitQuickEntry();
              }}
            >
              <ChevronRight size={18} strokeWidth={2.2} />
            </button>
          </form>
        </div>
      </div>

      {showAssets && (
        <AssetPage
          accounts={accounts}
          defaultAccountId={defaultAccountId}
          onUpdateAccount={handleUpdateAccount}
          onUpdateAccountDetails={handleUpdateAccountDetails}
          onUpdateDefaultAccount={handleUpdateDefaultAccount}
          onExportData={exportBackupData}
          onImportData={importBackupData}
          onClose={() => setShowAssets(false)}
        />
      )}

      {showBudgetModal && (
        <BudgetModal
          draft={budgetDraft}
          setDraft={setBudgetDraft}
          onClose={() => setShowBudgetModal(false)}
          onSave={saveMonthlyBudget}
          onClear={clearMonthlyBudget}
        />
      )}

      {deleteCandidateId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-stone-900/12 px-6 backdrop-blur-sm">
          <div className="w-full max-w-[320px] rounded-[28px] border border-white/80 bg-white/86 p-5 text-center shadow-soft backdrop-blur-2xl">
            <h2 className="text-base font-semibold text-stone-800">要删掉这条记录吗？</h2>
            <p className="mt-2 text-sm leading-6 text-stone-400">如果它计入了账户余额，会一起帮你恢复。</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                className="rounded-2xl bg-leaf-50 px-4 py-3 text-sm font-medium text-leaf-700 transition active:scale-[0.98]"
                type="button"
                onClick={cancelDeleteRecord}
              >
                取消
              </button>
              <button
                className="rounded-2xl bg-[#f7e9e5] px-4 py-3 text-sm font-medium text-rose-500 transition active:scale-[0.98]"
                type="button"
                onClick={confirmDeleteRecord}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

bootstrapApp(<App />, document.getElementById("root"));
