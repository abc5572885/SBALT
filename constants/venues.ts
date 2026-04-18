export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type DaySchedule = { start: number; end: number } | null;
export type WeeklySchedule = Record<DayKey, DaySchedule>;

export const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const DAY_LABELS: Record<DayKey, string> = {
  mon: '週一',
  tue: '週二',
  wed: '週三',
  thu: '週四',
  fri: '週五',
  sat: '週六',
  sun: '週日',
};

// JS Date.getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
const JS_DAY_TO_KEY: Record<number, DayKey> = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat',
};

export function getDayKeyFromDate(date: Date): DayKey {
  return JS_DAY_TO_KEY[date.getDay()];
}

export const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  mon: { start: 6, end: 22 },
  tue: { start: 6, end: 22 },
  wed: { start: 6, end: 22 },
  thu: { start: 6, end: 22 },
  fri: { start: 6, end: 22 },
  sat: { start: 6, end: 22 },
  sun: { start: 6, end: 22 },
};

export function formatScheduleSummary(schedule: WeeklySchedule | null | undefined): string {
  if (!schedule) return '未設定';
  const openDays = DAY_KEYS.filter((k) => schedule[k] !== null);
  if (openDays.length === 0) return '全週公休';
  if (openDays.length === 7 && DAY_KEYS.every((k) => {
    const s = schedule[k];
    return s && s.start === schedule.mon!.start && s.end === schedule.mon!.end;
  })) {
    return `每日 ${pad2(schedule.mon!.start)}:00 - ${pad2(schedule.mon!.end)}:00`;
  }
  return openDays.map((k) => {
    const s = schedule[k]!;
    return `${DAY_LABELS[k]} ${pad2(s.start)}:00-${pad2(s.end)}:00`;
  }).join('、');
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

export const VENUE_AMENITIES: { key: string; label: string }[] = [
  { key: 'parking', label: '停車場' },
  { key: 'shower', label: '淋浴間' },
  { key: 'locker', label: '置物櫃' },
  { key: 'water', label: '飲水機' },
  { key: 'wifi', label: 'Wi-Fi' },
  { key: 'vending', label: '販賣機' },
  { key: 'aircon', label: '冷氣' },
  { key: 'scoreboard', label: '計分板' },
  { key: 'equipment', label: '器材租借' },
];

export function getAmenityLabel(key: string): string {
  return VENUE_AMENITIES.find((a) => a.key === key)?.label || key;
}
