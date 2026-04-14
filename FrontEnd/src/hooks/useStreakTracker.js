/**
 * useStreakTracker – Production-grade streak & daily time tracking hook
 *
 * Rules:
 *  - Streak increases at most ONCE per calendar day (local time).
 *  - Gap > 1 day  → reset streak to 1.
 *  - Same-day refresh → no change.
 *  - Daily time resets at midnight automatically.
 *  - Uses BroadcastChannel to prevent duplicate counting across tabs.
 *  - Persists to localStorage (instant) and optionally syncs to backend.
 */

import { useEffect, useRef, useCallback, useState } from "react";

// ─── Storage Keys ────────────────────────────────────────────────────────────
const STORAGE_KEY = "streak_tracker_v2";

// ─── Default State ───────────────────────────────────────────────────────────
const DEFAULT_STATE = {
  currentStreak: 0,
  lastActiveDate: null,   // "YYYY-MM-DD" local
  dailyTimeSpent: 0,      // seconds for today
  dailyDate: null,        // the date dailyTimeSpent belongs to
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns today as "YYYY-MM-DD" in LOCAL time */
function todayLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Returns yesterday as "YYYY-MM-DD" in LOCAL time */
function yesterdayLocal() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

/** Load persisted state from localStorage (safe) */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

/** Save state to localStorage (throttled by caller) */
function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage quota – silently ignore
  }
}

/**
 * Core streak update function.
 * Returns the next state after evaluating today vs lastActiveDate.
 * NEVER increments more than once per day.
 */
function computeStreakUpdate(prev) {
  const today = todayLocal();
  const yesterday = yesterdayLocal();

  // Daily time reset: if stored dailyDate is not today, reset time
  const effectiveDailyTime =
    prev.dailyDate === today ? prev.dailyTimeSpent : 0;

  let newStreak = prev.currentStreak;

  if (!prev.lastActiveDate) {
    // First-ever use
    newStreak = 1;
  } else if (prev.lastActiveDate === today) {
    // Already counted today – no change
    newStreak = prev.currentStreak;
  } else if (prev.lastActiveDate === yesterday) {
    // Consecutive day
    newStreak = prev.currentStreak + 1;
  } else {
    // Gap > 1 day – reset
    newStreak = 1;
  }

  return {
    currentStreak: newStreak,
    lastActiveDate: today,
    dailyTimeSpent: effectiveDailyTime,
    dailyDate: today,
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * @param {Object} options
 * @param {Function} [options.onStreakUpdate] - called with updated state when streak changes
 */
export function useStreakTracker({ onStreakUpdate } = {}) {
  const [state, setState] = useState(() => {
    // Hydrate from storage immediately (no flicker)
    const stored = loadState();
    const today = todayLocal();
    // Reset daily time if it's a new day
    if (stored.dailyDate !== today) {
      return { ...stored, dailyTimeSpent: 0, dailyDate: today };
    }
    return stored;
  });

  // Refs for timers and tab deduplication
  const timerRef = useRef(null);
  const saveTimerRef = useRef(null);
  const channelRef = useRef(null);
  const isLeaderTabRef = useRef(false);

  // ── Tab leadership via BroadcastChannel ────────────────────────────────────
  useEffect(() => {
    // Only the "leader" tab runs the time timer.
    if (typeof BroadcastChannel === "undefined") {
      isLeaderTabRef.current = true;
      return;
    }

    const ch = new BroadcastChannel("streak_tracker");
    channelRef.current = ch;

    // Announce self; if a leader already exists it will respond
    let leaderExists = false;
    ch.postMessage({ type: "PING" });

    const pingTimeout = setTimeout(() => {
      if (!leaderExists) {
        // No response → this tab becomes the leader
        isLeaderTabRef.current = true;
        ch.postMessage({ type: "LEADER" });
      }
    }, 300);

    ch.onmessage = (e) => {
      const { type, state: remoteState } = e.data;

      if (type === "PING" && isLeaderTabRef.current) {
        // Respond so the new tab knows a leader exists
        ch.postMessage({ type: "LEADER" });
      }
      if (type === "LEADER" && !isLeaderTabRef.current) {
        leaderExists = true;
        clearTimeout(pingTimeout);
      }
      if (type === "STATE_SYNC" && remoteState) {
        // Follower tabs receive state from leader
        setState(remoteState);
      }
    };

    return () => {
      clearTimeout(pingTimeout);
      if (isLeaderTabRef.current) {
        ch.postMessage({ type: "LEADER_LEAVING" });
      }
      ch.close();
    };
  }, []);

  // ── Streak init on mount ───────────────────────────────────────────────────
  useEffect(() => {
    setState((prev) => {
      const next = computeStreakUpdate(prev);
      saveState(next);
      if (next.currentStreak !== prev.currentStreak) {
        onStreakUpdate?.(next);
      }
      return next;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Live time ticker (leader tab only) ────────────────────────────────────
  useEffect(() => {
    function tick() {
      if (!isLeaderTabRef.current) return;

      const today = todayLocal();

      setState((prev) => {
        const isNewDay = prev.dailyDate !== today;
        const next = {
          ...prev,
          dailyDate: today,
          dailyTimeSpent: isNewDay ? 1 : prev.dailyTimeSpent + 1,
          // If it's a new day, apply streak logic too
          ...(isNewDay ? computeStreakUpdate({ ...prev, dailyDate: today, dailyTimeSpent: 0 }) : {}),
        };

        // Broadcast to follower tabs every tick
        channelRef.current?.postMessage({ type: "STATE_SYNC", state: next });

        return next;
      });
    }

    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Throttled localStorage save (every 5 s) ───────────────────────────────
  useEffect(() => {
    saveTimerRef.current = setInterval(() => {
      setState((current) => {
        saveState(current);
        return current; // no re-render
      });
    }, 5000);
    return () => clearInterval(saveTimerRef.current);
  }, []);

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Format seconds → "Xm Ys" */
  const formatTime = useCallback((seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }, []);

  /** Manually mark a valid learning activity (quiz, 5+ min video, etc.) */
  const markActivity = useCallback(() => {
    setState((prev) => {
      const next = computeStreakUpdate(prev);
      saveState(next);
      onStreakUpdate?.(next);
      return next;
    });
  }, [onStreakUpdate]);

  /** Reset everything (dev/testing only) */
  const resetAll = useCallback(() => {
    const fresh = { ...DEFAULT_STATE, dailyDate: todayLocal(), currentStreak: 0 };
    saveState(fresh);
    setState(fresh);
  }, []);

  return {
    currentStreak: state.currentStreak,
    dailyTimeSpent: state.dailyTimeSpent,         // raw seconds
    formattedTime: formatTime(state.dailyTimeSpent),
    lastActiveDate: state.lastActiveDate,
    markActivity,
    resetAll,
  };
}
