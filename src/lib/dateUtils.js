export function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function isToday(dateText) {
  return dateText === toDateInputValue(new Date());
}

export function isThisMonth(dateText) {
  const now = new Date();
  return dateText.startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
}

export function formatDateLabel(dateText) {
  const date = new Date(`${dateText}T00:00:00`);
  const today = toDateInputValue(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = toDateInputValue(yesterdayDate);

  if (dateText === today) return "今天";
  if (dateText === yesterday) return "昨天";
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

export function formatWeekday(dateText) {
  return new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(new Date(`${dateText}T00:00:00`));
}

export function groupRecordsByMonth(records) {
  const sortedRecords = [...records].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
  return sortedRecords.reduce((groups, record) => {
    const monthKey = record.date.slice(0, 7);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.monthKey === monthKey) {
      lastGroup.records.push(record);
    } else {
      groups.push({ monthKey, records: [record] });
    }
    return groups;
  }, []);
}
