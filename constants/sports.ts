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
