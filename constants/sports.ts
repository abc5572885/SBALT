/**
 * Sport-specific configurations for scoring
 */

export interface SportConfig {
  key: string;
  label: string;
  icon: string;
  scoreButtons: number[];      // Point values per tap (e.g. [1,2,3] for basketball)
  hasSets: boolean;            // Whether the sport uses sets/games
  setsToWin?: number;          // Best of N sets (e.g. 3 for badminton, 5 for volleyball)
  pointsPerSet?: number;       // Points to win a set (e.g. 25 for volleyball, 21 for badminton)
  finalSetPoints?: number;     // Points for deciding set (e.g. 15 for volleyball)
}

export const SPORT_CONFIGS: Record<string, SportConfig> = {
  basketball: {
    key: 'basketball',
    label: '籃球',
    icon: 'sportscourt.fill',
    scoreButtons: [1, 2, 3],
    hasSets: false,
  },
  volleyball: {
    key: 'volleyball',
    label: '排球',
    icon: 'sportscourt.fill',
    scoreButtons: [1],
    hasSets: true,
    setsToWin: 3,
    pointsPerSet: 25,
    finalSetPoints: 15,
  },
  badminton: {
    key: 'badminton',
    label: '羽球',
    icon: 'sportscourt.fill',
    scoreButtons: [1],
    hasSets: true,
    setsToWin: 2,
    pointsPerSet: 21,
  },
  running: {
    key: 'running',
    label: '跑步',
    icon: 'sportscourt.fill',
    scoreButtons: [],
    hasSets: false,
  },
  other: {
    key: 'other',
    label: '其他',
    icon: 'sportscourt.fill',
    scoreButtons: [1],
    hasSets: false,
  },
};

export const SPORT_OPTIONS = Object.values(SPORT_CONFIGS);

export function getSportConfig(sportType: string | null | undefined): SportConfig {
  return SPORT_CONFIGS[sportType || 'other'] || SPORT_CONFIGS.other;
}

// 各運動的位置/偏好選項
export const SPORT_POSITIONS: Record<string, { key: string; label: string }[]> = {
  basketball: [
    { key: 'PG', label: '控球後衛 (PG)' },
    { key: 'SG', label: '得分後衛 (SG)' },
    { key: 'SF', label: '小前鋒 (SF)' },
    { key: 'PF', label: '大前鋒 (PF)' },
    { key: 'C', label: '中鋒 (C)' },
  ],
  volleyball: [
    { key: 'setter', label: '舉球' },
    { key: 'outside', label: '主攻' },
    { key: 'middle', label: '副攻' },
    { key: 'opposite', label: '對角' },
    { key: 'libero', label: '自由' },
  ],
  badminton: [
    { key: 'singles', label: '單打' },
    { key: 'doubles', label: '雙打' },
    { key: 'mixed', label: '混雙' },
    { key: 'all', label: '都打' },
  ],
  running: [
    { key: 'sprint', label: '短跑' },
    { key: 'middle', label: '中長跑' },
    { key: 'marathon', label: '馬拉松' },
    { key: 'trail', label: '越野' },
  ],
};
