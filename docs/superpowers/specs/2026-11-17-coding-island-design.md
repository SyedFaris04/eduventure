# Coding Island (Technology City) — Design

Date: 17 Nov 2026. Project 3 of 4 in the "3D world, islands, coding, languages" request. Projects 1 (3D world) and 2 (island world) are merged.

## Why

The owner asked for coding courses (Python, Java and others) with a simple in-game code editor and terminal, on their own island with exploring, monsters, levels, equipment and money. The audience is **both beginners and students already learning, beginners first**. The first players are Malaysian school students reached through social media, then the rest of the world. Coding has to feel like the rest of EDUVENTURE: short, playful and rewarding, never a dry IDE.

## What the player gets

- **Technology City:** a fourth place, reached from Pak Hamid's jetty. It replaces the "Coming soon" row. The theme is international: glowing circuit paths, server towers, neon lamps and robot statues.
- **Monsters:** 3 new monsters that ask code-reading questions ("What does this print?"), marked on the server like every battle.
- **Boss:** the **Glitch Golem**, fought from level 5 like the other island bosses. Its rounds are code questions.
- **The Code Academy:** a building in the city with a teacher NPC, **Cikgu Byte**. Talking to Cikgu Byte opens the Academy, which is also reachable from a Home button.
- **Two beginner courses:** **Python Basics** and **JavaScript Basics**. Each lesson is short (3–5 minutes), in the style of Duolingo or Busuu, with four kinds of step:
  - **Learn:** a short card with a code example. Pressing **Run** shows its output in the terminal.
  - **Predict:** "What will this print?" Answered by picking an option or typing the output.
  - **Fix:** one line of a small program is broken; the player edits it.
  - **Write:** the player writes one to three lines in the editor, presses **Run**, and sees the output in the terminal.
- **Editor and terminal:**
  - The editor has coloured code.
  - A row of tap-to-insert keys sits under it, so phones need little typing: `print()`, `""`, `+`, `=`, `if`, `for`, `:`, indent, and the variable names in the lesson.
- **Rewards and progress:**
  - Finishing a lesson for the first time pays XP and gold.
  - Units unlock in order.
  - Progress is saved on the server.

## Goals

1. **Technology City:**
   - a 44 × 44 tile map with the theme `tech`, a jetty and Pak Hamid;
   - 3 monsters and the Glitch Golem;
   - the Code Academy building with Cikgu Byte at its door.
2. **The Academy:**
   - the pages `/academy`, `/academy/:course` and `/academy/:course/:lesson`;
   - reached from Cikgu Byte, which saves the player's place, and from Home;
   - "Back" returns where the player came from.
3. **Two courses in this release:** Python Basics and JavaScript Basics, each **3 units × 4 lessons = 12 lessons**, so 24 lessons in all. Each lesson has 5–8 steps.
   - Topics for both languages:
     - Unit 1: output, strings and variables.
     - Unit 2: numbers, input-free maths and if/else.
     - Unit 3: loops and lists or arrays.
   - More units come later on the same format.
4. **Running code in the browser:**
   - Each language runs in a Web Worker: JavaScript directly, Python through **Pyodide** loaded on demand from jsDelivr at a pinned version.
   - Every run has a **3-second limit**. Past the limit the worker is stopped, and the terminal says the code took too long, for example an endless loop.
   - Python loads only when the first Python lesson opens, behind a "Getting Python ready…" bar. It is never part of the first page load.
5. **Fair rewards (the chosen approach):**
   - The server marks **Predict** and **Fix** steps. Their answers live in a table the client cannot read, as with questions.
   - **Learn** and **Write** steps are completed in the browser.
   - The lesson reward is **fixed, small and paid once per lesson per player**: 25 XP and 10 gold. Faking a lesson can never earn more than finishing it honestly.
6. **Content checks:**
   - Every lesson file is validated automatically, in the same spirit as the question bank.
   - The test suite actually runs every code sample and Write-step solution: JavaScript in Node, and Python through Pyodide as a development dependency. Each must produce the expected output.
   - Lessons enter "in review", and the owner approves them in `/admin` before they count in production (the existing `allow_draft_questions` flag decides).
7. **Questions for the island:** about **60 new code-reading questions** (subject `programming`):
   - Python and JavaScript, beginner to intermediate;
   - tagged `upper_primary`/`lower_secondary`/`upper_secondary`/`pre_university` as fitting;
   - the same format and review path as the existing bank.

## Non-goals (this project)

- Java and any other language that needs a server to run code (later, on a server sandbox).
- Harder tracks for SPM Computer Science or university (later, on the same lesson format).
- A free-play sandbox, programs that ask for keyboard input (`input()`/`prompt`), files, graphics or turtle drawing.
- Lesson text in Malay or other languages: English first. The format keeps text separate from code so translations can be added later.
- Course certificates, Academy leaderboards and missions that count lessons.

## Anti-goals

- A first page load that downloads Python or the editor. Both must arrive only when a lesson needs them.
- A lesson that freezes the game: endless loops, huge output, or a crashed worker. The terminal always recovers.
- Rewards that can be farmed: repeating a lesson, or calling the API directly, pays nothing extra.
- An Academy that is unusable on a 360 px phone. The editor, keys and terminal must fit without horizontal scrolling.
- A lesson sample whose stated output is wrong. The tests run every sample to prevent this.

## Approaches considered

1. **The browser runs the code; the server guards the rewards.** *Chosen.* No new services and no running cost, instant runs, works on phones. Cheating gains at most the one-time lesson reward.
2. **The server runs every program as well.** Hardest to cheat, but Python needs a paid or self-hosted code runner, and every Run waits on the network, which is slow on mobile data. Deferred until Java needs a server anyway.
3. **No real code running, only questions about code.** Dropped: it removes the editor and terminal the owner asked for.

## Design

### Technology City (the 3D place)

- **Map:** `src/game/maps/technology_city.ts` (`PlaceId` `technology_city`, now `built: true`), 44 × 44.
  - The Academy is a 3 × 3 building with Cikgu Byte at its door.
  - Areas: `'Code Academy'`, `'Server Gardens'`, `'Neon Plaza'`, `'Data Docks'`.
  - The jetty and arrival point follow the other islands' pattern.
- **Theme `tech`:**
  - a dusk-purple sky; `circuit` path tiles in teal with glowing lines, using an emissive tint; dark `metal` ground;
  - code-built props `server_tower`, `neon_lamp`, `robot_statue`, `holo_tree` and `academy` (3 × 3).
  - New tile and prop kinds follow the island-world pattern (themes, code props, minimap colours).
- **Monsters**, built in code in the existing chunky style:

  | id | Name | Look |
  |---|---|---|
  | `bugsy` | Bugsy | a beetle with antenna cursors |
  | `bytebot` | Byte-bot | a small boxy robot |
  | `loopy` | Loopy | a snake-like loop of cable with a plug head |

  Server rows have island `technology_city` and the same HP, XP and gold ranges as the other islands.
- **Boss `glitch_golem`:** a cube-pixel golem with flickering emissive pixels. Level-5 gate, island subjects for its rounds, its own texts under `bosses.glitch_golem`.
- **The `islands` row:** `technology_city`, with the subjects `programming`, `computer_science`, `artificial_intelligence` and `cybersecurity`.
- **NPC `teacher`:** Cikgu Byte, a friendly robot teacher. Talking to Cikgu Byte saves the player's place and navigates to `/academy`.

### Lessons as content

- **Files:** `content/courses/<course>.json`, one per course (`python-basics`, `javascript-basics`). Each holds: course meta, then units, then lessons, then steps.
- **Every step** has a `kind` (`learn` | `predict` | `fix` | `write`), `text` (English), and `code` where relevant.
  - **predict:** either `options` + `answer` (an option id), or `answer_text` (the exact expected output, compared after trimming trailing whitespace on each line).
  - **fix:** `code` with one line marked broken, `accept` (the fixed line in one or more accepted forms, compared after normalising spaces), `expected_output`, `hint` and `explanation`.
  - **write:** `starter`, `expected_output`, optional `must_use` (tokens the solution must contain, such as `for`), `solution` and `hint`.
  - **learn:** `code` and `expected_output`. Run shows it.
- **Lesson metadata:** `id`, `version`, `status` (`in_review` | `approved` | `published`), `source`, `licence` and `objective`, like questions.
- **Import:** a generator script turns the files into migrations, mirroring `gen-questions`.
  - The answers for Predict and Fix steps go into a key table the client cannot read.
  - The step text, code, starter, Write `expected_output`, `must_use` and `hint` are public, because the browser needs them to check Write steps.
  - The Write `solution` is server-only. A "Show answer" after two failed tries is fetched through a function.

### Server

- **Tables:**
  - `courses`, `lessons` and `lesson_steps` are public, with no answers;
  - `lesson_step_keys` is server-only;
  - `lesson_attempts` (one active per player and lesson) and `lesson_step_results` record what happened;
  - `lesson_rewards` has primary key (user, lesson), which pays once.
- **Functions** (all `security definer`):
  - `start_lesson(p_lesson)` returns the steps without answers, plus a resumed or new attempt. Locked units are refused: unit N needs every lesson of unit N−1 completed by this player.
  - `answer_lesson_step(p_attempt, p_step, p_answer)` marks Predict and Fix steps only and returns correct, the explanation and the accepted answer after a correct answer or the second wrong one. A 1-second minimum gap between answers stops scripted spamming.
  - `complete_lesson(p_attempt)` succeeds only when every Predict and Fix step of the lesson was answered correctly in this attempt. It inserts `lesson_rewards`, pays 25 XP and 10 gold through the existing XP and wallet path on the first completion, and returns `{ first_time, xp, gold, totals, leveled_up }`. A repeat returns `first_time: false` and pays 0.
  - `lesson_solution(p_attempt, p_step)` returns a Write solution only after two failed checks recorded for that step. The client reports failed checks with `note_write_attempt`; it can only unlock the hint earlier, never pay anything.
  - `my_course_progress(p_course)` returns the completed lesson ids, so units unlock and ticks show.
- **Content flag:** published-only in production, with drafts allowed while `allow_draft_questions` is true. The same flag covers lessons.

### Client

- **Pages:**
  - `/academy` lists the courses with their progress.
  - `/academy/:course` shows units and lessons, with locks and ticks.
  - `/academy/:course/:lesson` is the lesson player: a step progress bar, the step card, the editor, the key row, the terminal, and Run/Check/Continue.
  - All are lazy routes, so CodeMirror loads only with the lesson page.
- **Editor:** CodeMirror 6, the one new runtime dependency (with its Python and JavaScript language packs). Keys insert at the cursor. Large touch targets.
- **Runner** (`src/features/academy/runner/`):
  - `runCode(lang, code, { timeoutMs: 3000 })` returns `{ stdout, error, timedOut }`.
  - One worker per language is kept warm and replaced after a timeout.
  - Output is capped at 200 lines.
- **Write check, in the browser:** the output matches `expected_output` (trailing whitespace trimmed), and every `must_use` token appears in the code. A miss shows the hint and counts a try.
- **Wrong answers:** they never end a lesson. The player retries; after two wrong tries the answer or solution is shown, and the step must still be completed to continue. This is kind to beginners.
- **Lesson complete:** a celebration screen (XP, gold, the "New unlock!" card if a level-up happened), then "Next lesson".
- **Strings:** every UI string is in all 7 locales. Lesson text is English this release.
- **Accessibility:** the editor and terminal have labels, the terminal is `aria-live`, everything works by keyboard, and reduced motion is respected.

### Unchanged

The other places, the battle and boss systems (they gain one island), unlocks, the shop, missions, and every server rule.

## Constraints

- **Dependencies:** CodeMirror 6 is the only new runtime dependency. Pyodide arrives from the jsDelivr CDN at a pinned version; the `pyodide` npm package is a development dependency for tests only.
- **Database:** every change is a migration with RLS. Answers are never readable before answering. No secret keys.
- **Phones:** works at 360 px wide, with no horizontal scroll on the lesson page.
- **Timeouts:** every run stops after 3 s, and the game never freezes.

## Testing

- **Unit:**
  - the course files' schema;
  - every Learn sample, Fix expected output and Write solution executes to its stated output (JS in Node, Python through Pyodide);
  - the runner times out an endless loop and recovers;
  - the Write check (output match, `must_use`);
  - unit locking from progress;
  - the map (size, jetty, Academy, every zone reachable).
- **Server tests:**
  - Predict and Fix marking;
  - answers are not readable;
  - `complete_lesson` refuses with an unanswered or wrong step;
  - first completion pays 25 XP and 10 gold, and a repeat pays 0;
  - a locked unit is refused;
  - `lesson_solution` is refused before two failed tries;
  - Technology City monsters serve programming-family questions;
  - the Glitch Golem gate.
- **End-to-end:**
  - sail to Technology City, talk to Cikgu Byte, open Python Basics;
  - complete lesson 1: Predict and Fix answered, a Write step typed and run, with Python really running in the browser;
  - see the reward;
  - the reward does not repeat on a replay.

## Left to the builder

- The exact lesson wording and examples, within the unit topics above.
- The map layout, prop shapes and monster designs.
- The editor theme and how the key row looks, following the existing UI style.

## Calls I made (for the owner to check)

- **3 units × 4 lessons per course** this release, instead of the 5 × 5 first sketched. It's 24 well-checked lessons rather than 50 rushed ones, and you still have the existing question bank to review.
- **25 XP and 10 gold per first lesson completion,** paid once.
- **Lesson text in English first.** Malay translation of lessons is a later step, and needs a native reviewer.
- **Teacher name Cikgu Byte:** a small Malaysian touch in an international city.
