export type TournamentFormat = 'single_elim' | 'double_elim' | 'round_robin' | 'league' | 'other';
export type TournamentStatus = 'draft' | 'open' | 'closed' | 'ongoing' | 'finished' | 'cancelled';

export const TOURNAMENT_FORMATS: { key: TournamentFormat; label: string; description: string }[] = [
  { key: 'single_elim', label: '單敗淘汰', description: '輸一場直接淘汰' },
  { key: 'double_elim', label: '雙敗淘汰', description: '輸兩場才淘汰' },
  { key: 'round_robin', label: '循環賽', description: '每隊互相對戰' },
  { key: 'league', label: '聯賽', description: '長期積分賽' },
  { key: 'other', label: '其他', description: '自訂賽制' },
];

export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: '草稿',
  open: '報名中',
  closed: '報名截止',
  ongoing: '進行中',
  finished: '已結束',
  cancelled: '已取消',
};

export function getFormatLabel(format: string): string {
  return TOURNAMENT_FORMATS.find((f) => f.key === format)?.label || '其他';
}

export function getStatusLabel(status: string): string {
  return TOURNAMENT_STATUS_LABELS[status as TournamentStatus] || status;
}
