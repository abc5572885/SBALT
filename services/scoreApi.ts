/**
 * 比分 API 服務（模擬資料）
 * 在 MVP 階段使用本地模擬資料，後續可替換為真實 API
 */

import { Game } from '@/types/database';

// 模擬的聯賽資料
const LEAGUES = ['NBA', 'PL', 'La Liga', 'Bundesliga', 'MLB', 'NFL'];

// 模擬的球隊名稱
const TEAM_NAMES = [
  'Lakers', 'Warriors', 'Celtics', 'Heat',
  'Manchester United', 'Liverpool', 'Arsenal', 'Chelsea',
  'Real Madrid', 'Barcelona', 'Bayern Munich', 'Dortmund',
  'Yankees', 'Red Sox', 'Dodgers', 'Giants',
  'Patriots', 'Cowboys', 'Packers', 'Steelers',
];

// 生成隨機整數
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// 生成隨機時間（未來 7 天內）
const randomFutureTime = () => {
  const now = new Date();
  const daysOffset = randomInt(0, 7);
  const hoursOffset = randomInt(0, 23);
  const minutesOffset = randomInt(0, 59);
  const date = new Date(now);
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hoursOffset, minutesOffset, 0, 0);
  return date.toISOString();
};

// 生成隨機過去時間（過去 7 天內）
const randomPastTime = () => {
  const now = new Date();
  const daysOffset = randomInt(0, 7);
  const hoursOffset = randomInt(0, 23);
  const minutesOffset = randomInt(0, 59);
  const date = new Date(now);
  date.setDate(date.getDate() - daysOffset);
  date.setHours(hoursOffset, minutesOffset, 0, 0);
  return date.toISOString();
};

// 生成模擬比賽資料
const generateMockGame = (index: number): Omit<Game, 'id' | 'created_at' | 'updated_at'> => {
  const league = LEAGUES[randomInt(0, LEAGUES.length - 1)];
  const homeTeam = TEAM_NAMES[randomInt(0, TEAM_NAMES.length - 1)];
  const awayTeam = TEAM_NAMES[randomInt(0, TEAM_NAMES.length - 1)];
  
  // 30% 機率是已完成比賽，20% 機率是進行中，50% 機率是未開始
  const statusRand = Math.random();
  let status: Game['status'];
  let scheduledAt: string;
  let homeScore: number | null = null;
  let awayScore: number | null = null;

  if (statusRand < 0.3) {
    status = 'finished';
    scheduledAt = randomPastTime();
    homeScore = randomInt(0, 5);
    awayScore = randomInt(0, 5);
  } else if (statusRand < 0.5) {
    status = 'live';
    scheduledAt = randomPastTime();
    homeScore = randomInt(0, 5);
    awayScore = randomInt(0, 5);
  } else {
    status = 'scheduled';
    scheduledAt = randomFutureTime();
  }

  return {
    league,
    home_team_id: `team-${homeTeam.toLowerCase().replace(/\s+/g, '-')}`,
    away_team_id: `team-${awayTeam.toLowerCase().replace(/\s+/g, '-')}`,
    scheduled_at: scheduledAt,
    status,
    home_score: homeScore,
    away_score: awayScore,
    venue: `Venue ${randomInt(1, 10)}`,
    external_id: `ext-${index}`,
  };
};

/**
 * 取得今日比賽列表
 */
export const getTodayGames = async (): Promise<Game[]> => {
  // 模擬 API 延遲
  await new Promise((resolve) => setTimeout(resolve, 300));
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const games: Game[] = Array.from({ length: 10 }, (_, i) => ({
    id: `game-${i}`,
    ...generateMockGame(i),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  // 過濾出今日的比賽
  return games.filter((game) => {
    const gameDate = new Date(game.scheduled_at);
    return gameDate >= today && gameDate < tomorrow;
  });
};

/**
 * 取得所有比賽（支援分頁）
 */
export const getAllGames = async (page: number = 1, limit: number = 20): Promise<Game[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  
  const games: Game[] = Array.from({ length: limit }, (_, i) => ({
    id: `game-${(page - 1) * limit + i}`,
    ...generateMockGame((page - 1) * limit + i),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  return games;
};

/**
 * 取得特定比賽詳情
 */
export const getGameById = async (gameId: string): Promise<Game | null> => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  
  // 模擬查找
  const game: Game = {
    id: gameId,
    ...generateMockGame(parseInt(gameId.replace('game-', '')) || 0),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return game;
};

/**
 * 取得即時比分（進行中的比賽）
 */
export const getLiveGames = async (): Promise<Game[]> => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  
  const allGames = await getAllGames(1, 50);
  return allGames.filter((game) => game.status === 'live');
};

/**
 * 根據聯賽篩選比賽
 */
export const getGamesByLeague = async (league: string): Promise<Game[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  
  const allGames = await getAllGames(1, 50);
  return allGames.filter((game) => game.league === league);
};

/**
 * 搜尋比賽（根據球隊名稱或聯賽）
 */
export const searchGames = async (query: string): Promise<Game[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  
  const allGames = await getAllGames(1, 50);
  const lowerQuery = query.toLowerCase();
  
  return allGames.filter(
    (game) =>
      game.league.toLowerCase().includes(lowerQuery) ||
      game.home_team_id.toLowerCase().includes(lowerQuery) ||
      game.away_team_id.toLowerCase().includes(lowerQuery)
  );
};

