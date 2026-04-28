/**
 * Tournament Standings — 戰績排名計算。
 *
 * 來源：tournament 內所有 finished matches + per-match team scores（從 stats 表 sum）。
 * 輸出：每個 registered team 的 W-L-D、得分、失分、淨分差、勝率。
 *
 * 升降級：本服務只算排名；升降級的「決定」由主辦方根據排名手動執行
 * （下個 tournament 報名時把隊伍指派到新的 division）。
 */

import { supabase } from '@/lib/supabase';
import {
  basketballTotalPoints,
  getMatchBadmintonStats,
  getMatchBasketballStats,
  getMatchVolleyballStats,
} from './sportStats';
import { Match } from './matches';

export interface TeamStanding {
  group_id: string;
  team_label: string;
  division_id: string | null;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  points_for: number;
  points_against: number;
  point_diff: number;
  win_rate: number;
}

interface MatchScore {
  match: Match;
  homeScore: number;
  awayScore: number;
}

async function getMatchScore(match: Match, sport: string): Promise<MatchScore> {
  let homeScore = 0;
  let awayScore = 0;
  if (sport === 'basketball') {
    const stats = await getMatchBasketballStats(match.id);
    for (const s of stats) {
      const pts = basketballTotalPoints(s);
      if (s.team_label === match.home_label) homeScore += pts;
      else if (s.team_label === match.away_label) awayScore += pts;
    }
  } else if (sport === 'volleyball') {
    const stats = await getMatchVolleyballStats(match.id);
    for (const s of stats) {
      if (s.team_label === match.home_label) homeScore += s.points_total || 0;
      else if (s.team_label === match.away_label) awayScore += s.points_total || 0;
    }
  } else if (sport === 'badminton') {
    const stats = await getMatchBadmintonStats(match.id);
    for (const s of stats) {
      if (s.team_label === match.home_label) homeScore += s.points_won || 0;
      else if (s.team_label === match.away_label) awayScore += s.points_won || 0;
    }
  }
  return { match, homeScore, awayScore };
}

export async function getTournamentStandings(tournamentId: string): Promise<TeamStanding[]> {
  // Fetch tournament + sport
  const { data: t } = await supabase
    .from('tournaments')
    .select('sport_type')
    .eq('id', tournamentId)
    .maybeSingle();
  const sport = t?.sport_type || 'other';

  // Fetch finished matches via matchdays
  const { data: matches } = await supabase
    .from('matches')
    .select('*, tournament_matchdays!inner(tournament_id)')
    .eq('context_type', 'tournament')
    .eq('status', 'finished')
    .eq('tournament_matchdays.tournament_id', tournamentId);

  const matchScores = await Promise.all(((matches || []) as Match[]).map((m) => getMatchScore(m, sport)));

  // Fetch registrations for active teams
  const { data: regs } = await supabase
    .from('tournament_registrations')
    .select('group_id, team_label, division_id, status')
    .eq('tournament_id', tournamentId)
    .neq('status', 'withdrawn');

  // Initialize map
  const map = new Map<string, TeamStanding>();
  for (const r of regs || []) {
    map.set(r.group_id, {
      group_id: r.group_id,
      team_label: r.team_label,
      division_id: r.division_id,
      played: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      points_for: 0,
      points_against: 0,
      point_diff: 0,
      win_rate: 0,
    });
  }

  // Aggregate
  for (const ms of matchScores) {
    const m = ms.match;
    if (!m.home_group_id || !m.away_group_id) continue;
    const home = map.get(m.home_group_id);
    const away = map.get(m.away_group_id);
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.points_for += ms.homeScore;
    home.points_against += ms.awayScore;
    away.points_for += ms.awayScore;
    away.points_against += ms.homeScore;

    if (ms.homeScore > ms.awayScore) {
      home.wins++;
      away.losses++;
    } else if (ms.awayScore > ms.homeScore) {
      away.wins++;
      home.losses++;
    } else {
      home.draws++;
      away.draws++;
    }
  }

  // Compute derived
  for (const s of map.values()) {
    s.point_diff = s.points_for - s.points_against;
    s.win_rate = s.played === 0 ? 0 : s.wins / s.played;
  }

  // Sort: wins desc → point_diff desc → points_for desc
  return Array.from(map.values()).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.point_diff !== a.point_diff) return b.point_diff - a.point_diff;
    return b.points_for - a.points_for;
  });
}
