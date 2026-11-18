# Teacher mode — design

Date: 18 Nov 2026. Owner chose it (research feature 12) and decided: **players under 18 may join a class only after a
parent has approved their account.**

**Why.** Prodigy, Kahoot and Blooket spread through teachers; with under-16s off big social media in Malaysia, schools
and teachers are EDUVENTURE's main way in. DELIMa shows teachers are online (97.7%) while students are not (37.3%).

**Goals.**
- **Teacher page `/teacher`** (no game character needed). Any signed-in, non-guest adult can create a class (name,
  optional school name) and gets a class code `XXXX-XXXX` to share (copy / WhatsApp).
- **Students join** with the code from Home ("My classes" card). Under-18s need an approved parent first (the existing
  Ask-my-parent flow); the card says so and links to it. Adults join directly. A student can leave; the teacher can
  remove a student; the parent sees the child's classes on the parent page and can remove them.
- **Class quests.** The teacher picks a subject and topic (from the topics that have questions, showing their KSSR/KSSM
  tag), an optional target TP, a number of right answers (5–30) and a due date. Each member sees the quest and their
  progress on Home ("Fractions: 4 / 10 — Mathematics Mountains"). Progress = right battle answers on that topic since the
  quest was set (at the target TP or above when one is set). Quest topics come up more often in the student's battles
  (weight ×4 in question picking) while the quest is open.
- **Class report** for the teacher: per student — name, days played this week, questions answered and right this week,
  progress on each open quest; per open quest — how many students finished.
- Students see only their own data. The teacher sees members' learning data only (character name, never email or age).

**Non-goals.** Seeing classmates in the world, class raids and chat (need the multiplayer phase), teacher verification,
school dashboards, Google Classroom integration, assigning Code Academy lessons.

**Anti-goals.** A child's data reaching an adult without a parent's approval; any contact channel between teacher and
child inside the game.

**Approach.** Tables `classes`, `class_members`, `class_quests`, written only by functions; progress computed from
`question_attempts` (no counters to drift). Alternative: separate quest battles — rejected; quests should fit the
normal play loop.
