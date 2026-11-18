# Forgiving streaks with earned shields — design (small change)

Date: 17 Nov 2026. Approved in conversation ("proceed"). Research feature 5 (`docs/research/learning-game-engagement-features.md`).

**Why.** Streaks bring players back (Duolingo: streak protection +4% one-week return; an RCT linked streaks to higher
maths scores), but hard resets and streak pressure hurt children. Today EDUVENTURE already forgives one missed day per
week (the rest day), sends no notifications and takes nothing away; this adds earned protection, a gentler display, and
a way to hide the count.

**Goals.**
- **Shields:** every 7 days played (lifetime) earns a shield; at most 2 held. A missed day (never today) uses that
  week's rest day first, then a shield, automatically; otherwise the streak restarts. Shields are never sold.
- **Display:** streak count, shields held, rest day ready, this week's dots (Mon–Sun), best streak. When the streak is
  0 after earlier play: "You learned on N days this month — start a new streak today!" (no big zero).
- **View setting:** "count" or "week" (dots only, no number). Default: week for under-13, count for everyone else.
  Changed with a toggle on the streak box; saved in `user_settings.streak_view` (null = default).

**Non-goals.** Notifications, streak wagers, friend streaks, revival events, paid anything.

**Anti-goals.** Loss animations or messages, selling shields, any penalty for a broken streak.

**Approaches.** (1) Work everything out from `learning_days` in a pure function each time — chosen: no new state to
drift or game, and it can be tested with any list of days. (2) Store shield counts and update them daily — rejected:
needs a daily job and can drift from the real history.

**How.** `streak_from_days(p_days date[], p_today date) returns jsonb` (pure, immutable): forward pass from the first
played day to today → `{current, best, shields, rest_available, today_done}`. `my_streak()` (same name, richer result)
adds `week` (7 booleans for the current Mon–Sun week), `month_days` and `view` (resolved default). Rest weeks are ISO
weeks (Monday start), as today. A rest day or shield keeps the streak alive but does not add to its count.

**Left to the builder.** Exact copy and layout within the existing missions panel.
