/**
 * Score API Service
 * In MVP stage: uses mock data stored in database
 * Later: can be replaced with real API integration
 * 
 * Strategy:
 * 1. Try to read from database first
 * 2. If no data exists, generate mock data and store in database
 * 3. Use external_id to identify and deduplicate games
 */

import { supabase } from '@/lib/supabase';
import { Game } from '@/types/database';

// Generate UUID v4 using crypto API
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

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
    // Set to null for now - teams will be created separately or from real API
    // Database allows NULL for these fields
    home_team_id: null,
    away_team_id: null,
    scheduled_at: scheduledAt,
    status,
    home_score: homeScore,
    away_score: awayScore,
    venue: `Venue ${randomInt(1, 10)}`,
    external_id: `ext-${index}`,
  };
};

/**
 * Get today's games
 * Strategy:
 * 1. Read from database first
 * 2. If empty, generate mock data and upsert (avoid duplicates)
 * 3. Use external_id for deduplication
 */
export const getTodayGames = async (): Promise<Game[]> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  try {
    // Try to read from database first
    const { data: dbGames, error } = await supabase
      .from('games')
      .select('*')
      .gte('scheduled_at', today.toISOString())
      .lt('scheduled_at', tomorrow.toISOString())
      .order('scheduled_at', { ascending: true });

    if (error) throw error;

    // If we have games in database, return them
    if (dbGames && dbGames.length > 0) {
      return dbGames as Game[];
    }

    // If no games, generate mock data
    // Use date-based external_id to ensure consistency
    const dateKey = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const mockGames = Array.from({ length: 10 }, (_, i) => {
      const gameData = generateMockGame(i);
      return {
        ...gameData,
        external_id: `mock-${dateKey}-${i}`,
      };
    }).filter((game) => {
      const gameDate = new Date(game.scheduled_at);
      return gameDate >= today && gameDate < tomorrow;
    });

    // Upsert mock games (insert or update if external_id exists)
    // This prevents duplicates if function is called multiple times
    const { data: insertedGames, error: insertError } = await supabase
      .from('games')
      .upsert(mockGames, {
        onConflict: 'external_id',
        ignoreDuplicates: false,
      })
      .select();

    if (insertError) {
      console.warn('Failed to upsert mock games:', insertError);
      // Return mock data even if insert fails
      return mockGames.map((game) => ({
        id: generateUUID(),
        ...game,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })) as Game[];
    }

    return (insertedGames || []) as Game[];
  } catch (error) {
    console.error('Error fetching today games:', error);
    // Fallback to pure mock data if database fails
    const mockGames = Array.from({ length: 10 }, (_, i) => ({
      id: generateUUID(),
      ...generateMockGame(i),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    return mockGames.filter((game) => {
      const gameDate = new Date(game.scheduled_at);
      return gameDate >= today && gameDate < tomorrow;
    });
  }
};

/**
 * Get all games with pagination
 * Reads from database, generates mock data if empty
 * Uses upsert to avoid duplicates
 */
export const getAllGames = async (page: number = 1, limit: number = 20): Promise<Game[]> => {
  try {
    const offset = (page - 1) * limit;

    // Try to read from database
    const { data: dbGames, error } = await supabase
      .from('games')
      .select('*')
      .order('scheduled_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // If we have enough games, return them
    if (dbGames && dbGames.length >= limit) {
      return dbGames as Game[];
    }

    // If not enough games, generate and upsert mock data
    // Only generate for the current page to avoid generating too much
    const mockGames = Array.from({ length: limit }, (_, i) => ({
      ...generateMockGame((page - 1) * limit + i),
      external_id: `mock-all-${(page - 1) * limit + i}`,
    }));

    // Upsert to avoid duplicates
    const { data: insertedGames, error: insertError } = await supabase
      .from('games')
      .upsert(mockGames, {
        onConflict: 'external_id',
        ignoreDuplicates: false,
      })
      .select();

    if (insertError) {
      console.warn('Failed to upsert mock games:', insertError);
      return mockGames.map((game) => ({
        id: generateUUID(),
        ...game,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })) as Game[];
    }

    // Re-fetch to get the actual data with correct pagination
    const { data: finalGames, error: fetchError } = await supabase
      .from('games')
      .select('*')
      .order('scheduled_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (fetchError) throw fetchError;
    return (finalGames || []) as Game[];
  } catch (error) {
    console.error('Error fetching games:', error);
    // Fallback to pure mock data
    return Array.from({ length: limit }, (_, i) => ({
      id: generateUUID(),
      ...generateMockGame((page - 1) * limit + i),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }
};

/**
 * Get game by ID
 * Reads from database first, falls back to mock if not found
 */
export const getGameById = async (gameId: string): Promise<Game | null> => {
  // Check if gameId is a valid UUID
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(gameId);

  if (isValidUUID) {
    try {
      // Try to read from database
      const { data: game, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (!error && game) {
        return game as Game;
      }
    } catch (error) {
      console.error('Error fetching game from database:', error);
    }
  }

  // Fallback: generate mock game (for backward compatibility with old IDs)
  const mockGame: Game = {
    id: isValidUUID ? gameId : generateUUID(),
    ...generateMockGame(Math.floor(Math.random() * 1000)),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return mockGame;
};

/**
 * Get live games (games in progress)
 */
export const getLiveGames = async (): Promise<Game[]> => {
  try {
    // Try to read from database
    const { data: liveGames, error } = await supabase
      .from('games')
      .select('*')
      .eq('status', 'live')
      .order('scheduled_at', { ascending: false });

    if (!error && liveGames && liveGames.length > 0) {
      return liveGames as Game[];
    }

    // Fallback: get all games and filter
    const allGames = await getAllGames(1, 50);
    return allGames.filter((game) => game.status === 'live');
  } catch (error) {
    console.error('Error fetching live games:', error);
    return [];
  }
};

/**
 * 根據聯賽篩選比賽
 */
export const getGamesByLeague = async (league: string): Promise<Game[]> => {
  try {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('league', league)
      .order('scheduled_at', { ascending: false })
      .limit(50);

    if (!error && data && data.length > 0) {
      return data as Game[];
    }
  } catch (err) {
    console.error('Error fetching games by league:', err);
  }

  // Fallback: filter from all games
  const allGames = await getAllGames(1, 50);
  return allGames.filter((game) => game.league === league);
};

/**
 * 搜尋比賽（根據聯賽名稱或場地）
 * Note: home_team_id / away_team_id are UUIDs, not searchable by name.
 * In MVP stage, search is limited to league and venue fields.
 */
export const searchGames = async (query: string): Promise<Game[]> => {
  const allGames = await getAllGames(1, 50);
  const lowerQuery = query.toLowerCase();

  return allGames.filter(
    (game) =>
      game.league.toLowerCase().includes(lowerQuery) ||
      (game.venue && game.venue.toLowerCase().includes(lowerQuery))
  );
};

