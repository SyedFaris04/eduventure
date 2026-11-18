# Parent approval, time limits and break reminders — design

Date: 18 Nov 2026. The owner said "proceed" to option A (share a link) after the research
(`docs/research/learning-game-engagement-features.md`, features 8, 9 and 13; ethics notes).

## Why

Malaysia's PDPA (amended) has a parent or guardian consent for players under 18; the UK Children's Code and the FTC
expect parental controls and no "sticky" design. Today most children start as anonymous guests and no parent ever
approves anything: the database just records "consent: now" for under-13 email sign-ups. This adds a real approval by a
parent, parent controls, and wellbeing defaults — before chat or friends exist, so those can require approval from day one.

## Goals

1. **Ask my parent (child side).** Players under 18 (`age_band_for` = under13 or teen) without an approved guardian see a
   card on Home: a link `/parent?code=XXXX-XXXX` and the code, with "Send on WhatsApp" (wa.me share) and "Copy".
   A code lasts 7 days; asking again replaces it. Learning stays fully playable while waiting.
2. **Parent page `/parent` (parent side).** Opens without needing a game character. Not signed in → "Log in" or
   "Create a parent account" (existing pages; they return to `/parent` and keep the code). Signed in as a guest
   (a child's device) → "Please open this link on your own phone" (never sign the guest out: that would lose the
   child's progress). Signed in with an email account → enter/confirm the code, tick "I am this child's parent or
   guardian and I am 18 or older", and Approve. The parent's own birth year must make them 18+ (asked if missing).
3. **Parent controls.** For each approved child the parent sees, and can change: a daily play limit (none, 30, 60, 90 or
   120 minutes) and "Remove". Removing returns the child to "waiting for a parent".
4. **Weekly report** on the parent page per child: days played this week, minutes per day, questions answered and
   accuracy, lessons finished, topics going well and topics to practise (from `topic_mastery`), current streak.
5. **Time limit.** The client reports play once a minute while the world or a lesson is open and visible; the server
   counts at most one minute per 50 seconds. When today's minutes reach the limit, starting a battle, a boss fight or
   a lesson is refused ("Time's up for today — see you tomorrow!"), enforced by the database. Home shows minutes left.
6. **Break reminder.** After 40 minutes of continuous play, a friendly card: "Time for a stretch break!" with
   "Take a break" (to Home) and "Keep playing". Shown again every 40 minutes. No streak or pet pressure in it.
7. **Approval is the gate for anything social later.** `my_guardian()` reports the status so future chat, friends and
   purchases can require `approved`.

## Non-goals

Email sending of our own (reports are on the parent page), chat/friends, purchases, school/teacher accounts, ID or
face age checks, notifications, parent-set quiet hours.

## Anti-goals

- Signing out or losing a guest's progress anywhere in this flow.
- Locking a child out of learning while waiting for approval.
- A child approving themselves (same account), or an account under 18 approving anyone.
- Shaming or scary copy for the child.

## Constraints

- All rules in the database (standing rule); new tables readable only by the people they concern.
- Supabase free-tier email limits apply to parent sign-up confirmation (owner: configure custom SMTP before launch).
- Seven locales; migrations pushed only after the owner approves this project's push.

## Approaches

- **A. Share a link + code, parent signs in on their own device (chosen).** No new email service; fits WhatsApp use.
- B. Email the parent an approval link — needs an email service and children often don't know the address.

Limits of A (accepted): a determined teen could create a second adult email account and approve themselves; the
"18 or older" tick and birth-year check make this a deliberate lie rather than an accident. Stronger checks (ID, card)
are out of scope.

## Left to the builder

Code alphabet/format, page layout, report layout, how often the client pings (≤ once a minute), and test structure.
