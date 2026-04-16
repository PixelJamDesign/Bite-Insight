/**
 * Gamification engine — streaks, points, and referrals.
 *
 * All functions operate on the authenticated user's profile and are designed
 * to be called from the app (scanner, food search, profile, etc.).
 */
import { supabase } from './supabase';

// ── Constants ────────────────────────────────────────────────────────────────

/** Points awarded for each action (daily caps enforced in code) */
export const POINTS = {
  DAILY_SCAN: 10,
  FOOD_SEARCH: 5,
  STREAK_7: 50,
  STREAK_30: 200,
  STREAK_100: 500,
  COMPLETE_PROFILE: 100,
  RATE_10_INGREDIENTS: 50,
  REFERRAL_SIGNUP: 100,
} as const;

/** Max food search point awards per day */
export const MAX_SEARCH_POINTS_PER_DAY = 3;

/** Points required to redeem one month of Plus */
export const POINTS_PER_MONTH = 1000;

/** Number of referrals needed for free Plus */
export const REFERRAL_THRESHOLD = 10;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns today's date as YYYY-MM-DD in the device's local timezone */
function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Returns yesterday's date as YYYY-MM-DD in the device's local timezone */
function yesterdayLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Streak Tracking ──────────────────────────────────────────────────────────

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

/**
 * Records a daily activity (scan or food search) and updates the streak.
 * Safe to call multiple times per day — only the first call increments.
 * Returns the updated streak data and any milestone points awarded.
 */
export async function recordActivity(userId: string): Promise<{
  streak: StreakData;
  milestonePoints: number;
  milestoneName: string | null;
}> {
  const today = todayLocal();
  const yesterday = yesterdayLocal();

  // Fetch current streak state
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_streak, longest_streak, last_active_date')
    .eq('id', userId)
    .single();

  if (!profile) return { streak: { currentStreak: 0, longestStreak: 0, lastActiveDate: null }, milestonePoints: 0, milestoneName: null };

  const lastActive = profile.last_active_date;

  // Already active today — no-op
  if (lastActive === today) {
    return {
      streak: {
        currentStreak: profile.current_streak,
        longestStreak: profile.longest_streak,
        lastActiveDate: lastActive,
      },
      milestonePoints: 0,
      milestoneName: null,
    };
  }

  // Calculate new streak
  let newStreak: number;
  if (lastActive === yesterday) {
    // Consecutive day — extend streak
    newStreak = profile.current_streak + 1;
  } else {
    // Streak broken (or first activity ever) — start fresh
    newStreak = 1;
  }

  const newLongest = Math.max(newStreak, profile.longest_streak);

  // Persist
  await supabase
    .from('profiles')
    .update({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_active_date: today,
    })
    .eq('id', userId);

  // Check for streak milestones
  let milestonePoints = 0;
  let milestoneName: string | null = null;

  if (newStreak === 7) {
    milestonePoints = POINTS.STREAK_7;
    milestoneName = 'streak_7';
  } else if (newStreak === 30) {
    milestonePoints = POINTS.STREAK_30;
    milestoneName = 'streak_30';
  } else if (newStreak === 100) {
    milestonePoints = POINTS.STREAK_100;
    milestoneName = 'streak_100';
  }

  // Award milestone points if applicable
  if (milestonePoints > 0 && milestoneName) {
    await awardPoints(userId, milestoneName, milestonePoints);
  }

  return {
    streak: {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActiveDate: today,
    },
    milestonePoints,
    milestoneName,
  };
}

// ── Points System ────────────────────────────────────────────────────────────

/**
 * Awards points to a user. Inserts a ledger entry and increments the balance.
 * Returns the new total balance.
 */
export async function awardPoints(
  userId: string,
  action: string,
  points: number,
  metadata: Record<string, unknown> = {},
): Promise<number> {
  // Insert ledger entry
  await supabase.from('points_ledger').insert({
    user_id: userId,
    action,
    points,
    metadata,
  });

  // Increment balance
  const { data } = await supabase.rpc('increment_points', {
    user_id_input: userId,
    amount: points,
  });

  return (data as number) ?? 0;
}

/**
 * Awards points for a daily scan. Only awards once per day.
 * Returns points awarded (0 if already awarded today).
 */
export async function awardScanPoints(userId: string): Promise<number> {
  const today = todayLocal();

  // Check if already awarded today
  const { count } = await supabase
    .from('points_ledger')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', 'daily_scan')
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59.999`);

  if ((count ?? 0) > 0) return 0;

  return awardPoints(userId, 'daily_scan', POINTS.DAILY_SCAN);
}

/**
 * Awards points for a food search. Max 3 per day.
 * Returns points awarded (0 if daily cap reached).
 */
export async function awardSearchPoints(userId: string): Promise<number> {
  const today = todayLocal();

  // Check how many search awards today
  const { count } = await supabase
    .from('points_ledger')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', 'food_search')
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59.999`);

  if ((count ?? 0) >= MAX_SEARCH_POINTS_PER_DAY) return 0;

  return awardPoints(userId, 'food_search', POINTS.FOOD_SEARCH);
}

/**
 * Redeems points for a month of Plus. Deducts from balance and sets plus_expires_at.
 * Returns true if successful, false if insufficient balance.
 */
export async function redeemPointsForPlus(userId: string): Promise<boolean> {
  // Fetch current balance
  const { data: profile } = await supabase
    .from('profiles')
    .select('points_balance, plus_expires_at, is_plus, is_vip')
    .eq('id', userId)
    .single();

  if (!profile || profile.points_balance < POINTS_PER_MONTH) return false;
  if (profile.is_vip) return false; // VIP already has lifetime access

  // Calculate new expiry — extend from current expiry if still active, else from now
  const now = new Date();
  const currentExpiry = profile.plus_expires_at ? new Date(profile.plus_expires_at) : null;
  const baseDate = currentExpiry && currentExpiry > now ? currentExpiry : now;
  const newExpiry = new Date(baseDate);
  newExpiry.setMonth(newExpiry.getMonth() + 1);

  // Deduct points and set Plus
  await supabase
    .from('profiles')
    .update({
      points_balance: profile.points_balance - POINTS_PER_MONTH,
      is_plus: true,
      plus_expires_at: newExpiry.toISOString(),
    })
    .eq('id', userId);

  // Log the redemption
  await supabase.from('points_ledger').insert({
    user_id: userId,
    action: 'redeem_plus',
    points: -POINTS_PER_MONTH,
    metadata: { expires_at: newExpiry.toISOString() },
  });

  return true;
}

// ── Referral System ──────────────────────────────────────────────────────────

/**
 * Gets or creates a referral code for the user.
 * Codes are 8 characters: user's first name initial + 7 random alphanumeric.
 */
export async function getOrCreateReferralCode(
  userId: string,
  displayName?: string | null,
): Promise<string> {
  // Check for existing code
  const { data: existing } = await supabase
    .from('referral_codes')
    .select('code')
    .eq('user_id', userId)
    .single();

  if (existing) return existing.code;

  // Generate a new code
  const prefix = (displayName ?? 'B').charAt(0).toUpperCase();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
  let suffix = '';
  for (let i = 0; i < 7; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const code = `${prefix}${suffix}`;

  await supabase.from('referral_codes').insert({ user_id: userId, code });

  return code;
}

/**
 * Looks up a referral code and returns the referrer's user ID, or null if invalid.
 */
export async function lookupReferralCode(code: string): Promise<string | null> {
  const { data } = await supabase
    .from('referral_codes')
    .select('user_id')
    .eq('code', code.toUpperCase())
    .single();

  return data?.user_id ?? null;
}

/**
 * Records a referral: the referred user just signed up.
 * Awards points to the referrer and checks the 10-referral milestone.
 */
export async function recordReferral(
  referrerId: string,
  referredUserId: string,
): Promise<{ totalReferrals: number; plusGranted: boolean }> {
  // Insert referral record
  const { error } = await supabase.from('referrals').insert({
    referrer_id: referrerId,
    referred_user_id: referredUserId,
    credited: true,
  });

  // Duplicate referral (user already referred) — skip
  if (error) return { totalReferrals: 0, plusGranted: false };

  // Award referral points
  await awardPoints(referrerId, 'referral_signup', POINTS.REFERRAL_SIGNUP, {
    referred_user_id: referredUserId,
  });

  // Count total referrals
  const { count } = await supabase
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', referrerId);

  const totalReferrals = count ?? 0;

  // Check milestone: 10 referrals = free Plus
  let plusGranted = false;
  if (totalReferrals >= REFERRAL_THRESHOLD) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_vip, is_plus')
      .eq('id', referrerId)
      .single();

    if (profile && !profile.is_vip) {
      // Grant 12 months of Plus
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 1);

      await supabase
        .from('profiles')
        .update({ is_plus: true, plus_expires_at: expiry.toISOString() })
        .eq('id', referrerId);

      await supabase.from('points_ledger').insert({
        user_id: referrerId,
        action: 'referral_milestone',
        points: 0,
        metadata: {
          milestone: REFERRAL_THRESHOLD,
          reward: '12_months_plus',
          expires_at: expiry.toISOString(),
        },
      });

      plusGranted = true;
    }
  }

  return { totalReferrals, plusGranted };
}

/**
 * Gets referral stats for a user.
 */
export async function getReferralStats(userId: string): Promise<{
  code: string;
  totalReferrals: number;
  remainingForPlus: number;
}> {
  const code = await getOrCreateReferralCode(userId);

  const { count } = await supabase
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', userId);

  const total = count ?? 0;

  return {
    code,
    totalReferrals: total,
    remainingForPlus: Math.max(0, REFERRAL_THRESHOLD - total),
  };
}
