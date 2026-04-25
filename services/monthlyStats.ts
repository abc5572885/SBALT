import { supabase } from '@/lib/supabase';
import { basketballTotalPoints } from './sportStats';

export interface MonthlySummary {
  /** 本月參與場次（打卡 + 正式戰績去重）*/
  games: number;
  /** 跟上月比較的差值 (games this month - games last month) */
  delta: number;
  /** 主指標（依 selectedSport），N=0 時為 null */
  mainStat: { value: string; label: string } | null;
  /** 本月運動類型（如僅 1 種運動）*/
  sportLabel: string | null;
}

interface DateRange {
  start: Date;
  end: Date;
}

function thisMonthRange(): DateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

function lastMonthRange(): DateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start, end };
}

async function countCheckIns(userId: string, range: DateRange, sport: string): Promise<number> {
  let q = supabase
    .from('check_ins')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('played_at', range.start.toISOString())
    .lt('played_at', range.end.toISOString());
  if (sport !== 'all') q = q.eq('sport_type', sport);
  const { count } = await q;
  return count || 0;
}

interface CheckInBasic {
  sport_type: string;
  stats: Record<string, any> | null;
}

async function fetchCheckInsThisMonth(userId: string, range: DateRange, sport: string): Promise<CheckInBasic[]> {
  let q = supabase
    .from('check_ins')
    .select('sport_type, stats')
    .eq('user_id', userId)
    .gte('played_at', range.start.toISOString())
    .lt('played_at', range.end.toISOString());
  if (sport !== 'all') q = q.eq('sport_type', sport);
  const { data } = await q;
  return (data || []) as CheckInBasic[];
}

async function fetchEventStatsThisMonth(userId: string, range: DateRange, sport: string) {
  // 取所有三張 sport_stats，依 sport 過濾
  const tables: Array<{ table: string; sport: string }> = [
    { table: 'basketball_stats', sport: 'basketball' },
    { table: 'volleyball_stats', sport: 'volleyball' },
    { table: 'badminton_stats', sport: 'badminton' },
  ];
  const results: { sport: string; row: any }[] = [];
  for (const t of tables) {
    if (sport !== 'all' && sport !== t.sport) continue;
    const { data } = await supabase
      .from(t.table)
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', range.start.toISOString())
      .lt('created_at', range.end.toISOString());
    (data || []).forEach((row) => results.push({ sport: t.sport, row }));
  }
  return results;
}

export async function getMonthlySummary(userId: string, sport: string): Promise<MonthlySummary> {
  const thisR = thisMonthRange();
  const lastR = lastMonthRange();

  const [thisCount, lastCount, thisCheckIns, thisEvents] = await Promise.all([
    countCheckIns(userId, thisR, sport),
    countCheckIns(userId, lastR, sport),
    fetchCheckInsThisMonth(userId, thisR, sport),
    fetchEventStatsThisMonth(userId, thisR, sport),
  ]);

  const games = thisCount + thisEvents.length;
  const lastGames = lastCount; // last-month event count omitted for now (light weight)

  // 主指標：依 sport 算
  let mainStat: { value: string; label: string } | null = null;

  if (games > 0) {
    if (sport === 'basketball') {
      const ciPts = thisCheckIns.reduce((sum, c) => sum + (Number(c.stats?.points) || 0), 0);
      const evtPts = thisEvents.reduce((sum, e) => sum + basketballTotalPoints(e.row), 0);
      const totalPts = ciPts + evtPts;
      mainStat = { value: (totalPts / games).toFixed(1), label: '分均' };
    } else if (sport === 'volleyball') {
      const ciPts = thisCheckIns.reduce((sum, c) => sum + (Number(c.stats?.points) || 0), 0);
      const evtPts = thisEvents.reduce((sum, e) => sum + (Number(e.row.points_total) || 0), 0);
      const totalPts = ciPts + evtPts;
      mainStat = { value: String(totalPts), label: '總得分' };
    } else if (sport === 'badminton') {
      const won = thisCheckIns.reduce((sum, c) => sum + (Number(c.stats?.games_won) || 0), 0);
      const evtWon = thisEvents.reduce((sum, e) => sum + (Number(e.row.sets_won) || 0), 0);
      mainStat = { value: String(won + evtWon), label: '勝局' };
    } else if (sport === 'all') {
      mainStat = { value: String(games), label: '參與' };
    }
  }

  return {
    games,
    delta: games - lastGames,
    mainStat,
    sportLabel: sport === 'all' ? null : sport,
  };
}
