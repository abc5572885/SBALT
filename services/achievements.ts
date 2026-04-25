import { supabase } from '@/lib/supabase';
import { createNotification } from './appNotifications';
import { getUserTotalPoints } from './sportStats';

interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  threshold: number;
}

interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement;
}

/**
 * Get all achievements with unlock status for a user
 */
export async function getUserAchievements(userId: string) {
  const [{ data: allAchievements }, { data: userAchievements }] = await Promise.all([
    supabase.from('achievements').select('*').order('category', { ascending: true }),
    supabase.from('user_achievements').select('*').eq('user_id', userId),
  ]);

  const unlockedIds = new Set((userAchievements || []).map((ua: any) => ua.achievement_id));
  const unlockedMap = new Map((userAchievements || []).map((ua: any) => [ua.achievement_id, ua.unlocked_at]));

  return (allAchievements || []).map((a: any) => ({
    ...a,
    unlocked: unlockedIds.has(a.id),
    unlockedAt: unlockedMap.get(a.id) || null,
  }));
}

/**
 * Check and unlock achievements based on current stats
 */
export async function checkAndUnlockAchievements(userId: string) {
  const [
    { count: organizedCount },
    { count: joinedCount },
    totalPoints,
    { count: groupCount },
  ] = await Promise.all([
    supabase.from('events').select('*', { count: 'exact', head: true })
      .eq('organizer_id', userId)
      .or('is_recurring_instance.is.null,is_recurring_instance.eq.false'),
    supabase.from('registrations').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('status', 'registered'),
    getUserTotalPoints(userId),
    supabase.from('groups').select('*', { count: 'exact', head: true })
      .eq('creator_id', userId),
  ]);

  // Get all achievements
  const { data: achievements } = await supabase.from('achievements').select('*');
  if (!achievements) return [];

  // Get already unlocked
  const { data: existing } = await supabase.from('user_achievements').select('achievement_id').eq('user_id', userId);
  const unlockedIds = new Set((existing || []).map((e: any) => e.achievement_id));

  // Check which to unlock
  const statsMap: Record<string, number> = {
    organize: organizedCount || 0,
    join: joinedCount || 0,
    score: totalPoints,
    group: groupCount || 0,
  };

  const newUnlocks: Achievement[] = [];

  for (const achievement of achievements) {
    if (unlockedIds.has(achievement.id)) continue;

    const currentValue = statsMap[achievement.category] || 0;
    if (currentValue >= achievement.threshold) {
      // Unlock!
      const { error } = await supabase.from('user_achievements').insert({
        user_id: userId,
        achievement_id: achievement.id,
      });
      if (!error) {
        newUnlocks.push(achievement);
        // Send notification
        createNotification({
          user_id: userId,
          type: 'achievement_unlocked',
          title: `解鎖成就：${achievement.title}`,
          body: achievement.description,
          data: { achievement_id: achievement.id },
        }).catch(() => {});
      }
    }
  }

  return newUnlocks;
}
