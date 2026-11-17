# Languages Island (Language Kingdom) — Design

Date: 17 Nov 2026. Project 4 of 4 in the "3D world, islands, coding, languages" request. Projects 1–3 are merged.

## Why

The owner asked for language learning in the style of Duolingo and Busuu, on its own island with exploring, monsters, levels, equipment and money. The first audience is Malaysian students, reached through social media, before the game goes worldwide. English is the language Malaysian students most need for school (SPM). Bahasa Melayu for beginners gives international players a reason to come, and shows off the game's Malaysian identity.

## What the player gets

- **Language Kingdom:** a fifth place, reached from Pak Hamid's jetty. It replaces the last "Coming soon" row. The theme is international: a castle town of letters with a library tower, signposts in many languages and scroll-shaped trees.
- **Monsters:** three new ones, **Wordworm** (a bookworm), **Alpha-bat** (a bat with letter wings) and **Comma-leon** (a chameleon). They ask vocabulary and grammar questions and are marked on the server like every battle.
- **Boss:** the **Lexicon Dragon**, fought from level 5.
- **The Language Hall:** a building with a teacher NPC, **Cikgu Lina**. Talking to her opens the Hall, which is also reachable from a Home button.
- **Two courses:**
  - **English for Malaysian students** (`english-basics`). Instructions are in simple English, and every instruction and new word also shows its Bahasa Melayu meaning.
  - **Bahasa Melayu for beginners** (`malay-basics`). Instructions are in English, and BM words come with their English meanings.
- **Lessons:** short (3–5 minutes) and mixed, Duolingo-style:
  - **Learn:** a word card with an emoji picture, the word, its meaning and 🔊.
  - **Pick:** choose the meaning of a word or sentence.
  - **Match:** tap word ↔ meaning pairs.
  - **Build:** tap word tiles into the right order to make a sentence.
  - **Gap:** pick the missing word.
  - **Listen:** hear a word or sentence (🔊) and pick what was said.
  - **Type:** translate a short phrase. Several answers are accepted, and small slips are forgiven.
- **Rewards:** the first time a lesson is finished pays **25 XP and 10 gold**, the same as the Code Academy. Units unlock in order.

## Goals

1. **Language Kingdom:**
   - a 44 × 44 map with the theme `kingdom`, a jetty and Pak Hamid;
   - 3 monsters and the Lexicon Dragon;
   - the Language Hall with Cikgu Lina at its door, where "Back to the world" returns the player;
   - areas `'Language Hall'`, `'Library Tower'`, `'Market of Words'` and `'Story Gardens'`.
2. **Two courses, each 3 units × 4 lessons**, so 24 lessons, each with 6–8 steps.
   - English units: *Hello & me* (greetings, introducing yourself, numbers 1–10), *Family & friends* (family words, describing people, have/has), *Food & my day* (Malaysian food, times of day, simple present).
   - BM units: *Salam & perkenalan*, *Keluarga & nombor*, *Makanan & pasar*.
3. **The server marks every exercise** except Learn cards. With no code to run, there is nothing to fake: `complete_lesson` requires every marked step correct in the attempt, and pays once.
4. **Listening:** the browser's built-in speech (`speechSynthesis`), with no download and no cost.
   - English uses an `en-*` voice.
   - BM uses an `ms-*` voice, then falls back to an `id-*` voice (very close), and finally hides 🔊.
   - Listen steps are skipped automatically when no voice exists. They are not required for the reward, so a phone without voices can still finish.
5. **About 60 new language questions** for the island's monsters:
   - English vocabulary and grammar for `primary`/`lower_secondary`/`upper_secondary`, about 45;
   - beginner BM for `lifelong`, about 15.
   - They use the same format and review path as the bank.
6. **Review:** lessons appear in `/admin` → "Language Hall lessons", the same tab design as the Code Academy, with the same review rules.

## Non-goals (this project)

- Speaking practice with the microphone, and pronunciation scoring.
- Other languages (Mandarin, Japanese, Korean, Arabic) and non-Latin scripts.
- Harder SPM-level units, essays and long reading passages.
- Recorded human audio. The built-in voices only.
- Hearts or lives, as on Duolingo. Mistakes never end a lesson, as in the Code Academy.

## Anti-goals

- A lesson that can't be finished on a phone without a Malay or English voice.
- Translations that are wrong or awkward. All lessons go through review, and the owner arranges a native-speaker check of the BM content before publishing.
- Typed answers marked wrong for a trivial slip (capitals, extra spaces, a final full stop) or for a correct alternative wording that the lesson lists.
- Farmable rewards: a replay pays nothing, and an API call can't pay twice.

## Approaches considered

1. **Extend the lesson system the Code Academy uses** with language step kinds. *Chosen:* one engine, reward path, unit locking and review for both.
2. **A separate language-learning system.** Dropped: it duplicates rewards, locking and review for no gain.
3. **A paid language-content service.** Dropped: licence fees, content the owner can't review, and the game's look broken.

## Design

### Content and engine

- **Course files:** `content/courses/english-basics.json` and `content/courses/malay-basics.json`, with the same top-level shape as the coding courses.
  - `language` becomes `'english' | 'malay'` alongside `'python' | 'javascript'`.
  - Each course gets a `kind`: `'code' | 'language'`.
- **New step kinds:**
  - `card`: `word`, `meaning`, `emoji`, `say` (the text to speak; defaults to `word`) and `note`.
  - `pick`: `prompt`, `say?`, `options` (2–4), `answer`.
  - `match`: `pairs` (3–5 `[left, right]`). The answer is every pair. Shown shuffled.
  - `build`: `prompt` (the meaning to express), `tiles` (the right words plus 1–3 distractors), `answer` (the tile order; alternative orders allowed through `accept_orders`).
  - `gap`: `sentence` with `___`, `options`, `answer`.
  - `listen`: `say`, `options`, `answer`.
  - `type`: `prompt`, `accept` (one or more answers).
- **Typed answers** are normalised before comparing: lower case, trimmed, inner spaces collapsed, and these dropped: a final `. ! ?` and the quote characters `' "`. The server's `norm_answer()` and the client mirror each other, as `norm_code` does, and a test checks they match.
- **Marking:** every kind except `card` is marked by the server. Answers live in `lesson_step_keys`; the public step carries only what the screen shows.
  - `match` is answered as a list of pairs.
  - `build` is answered as the tile order.
  - `listen` is marked like `pick`.
  - For `listen`, the `say` text is public: the browser has to speak it. That is the nature of the exercise, and it gives away no more than hearing it does.
- **Content checks in tests:** the schema and rules (unique ids; answers are among the options; build answers use every right tile once; type `accept` is not empty; match pairs are unique), and every course has a `card` before a word is tested. These are language rules; no code execution is needed.
- **Generator:** `gen-lessons` already handles any course file; it gains the new step fields.

### Server

- The same tables and functions as the Academy, with these changes:
  - `lesson_steps` gets new nullable columns: `word`, `meaning`, `emoji`, `say`, `pairs` (jsonb, public; left and right lists shuffled separately), `tiles` (text[], public) and `prompt`.
  - `answer_lesson_step` gains marking for `pick`, `gap`, `listen` (choice), `match` (the set of pairs equals the key), `build` (the order equals the key or one of `accept_orders`) and `type` (`norm_answer` in `accept`).
- **Courses:** a `courses.kind` column, with the Python and JavaScript rows set to `code`.
- **Language Kingdom server data:**
  - the `islands` row `language_kingdom`, with the subjects `english`, `malay_language`, `academic_english`;
  - monsters `wordworm`, `alphabat` and `commaleon`, with the same HP, XP and gold ranges;
  - boss `lexicon_dragon`, gated at level 5 through the existing unlock;
  - `boss_island('lexicon_dragon') = 'language_kingdom'`.

### Client

- **Pages:** `/hall`, `/hall/:course` and `/hall/:course/:lesson` reuse the Academy pages, filtered to `kind = 'language'`, with their own title, intro and back link. The Academy shows only `kind = 'code'`.
- **The lesson player** gains components for the new kinds:
  - large tap targets;
  - Build tiles that move from a tray into the answer line and tap back out;
  - Match as two columns of tappable cards that lock in pairs;
  - Type with a text field that has `autocapitalize="off"` and the right `lang` attribute.
- **Speech:** `speak(text, lang)` uses `speechSynthesis` with the best available voice (`en-GB`, then `en-*`; `ms-MY`, then `ms-*`, then `id-*`). `canSpeak(lang)` decides whether 🔊 and Listen steps show. With reduced motion, nothing changes: speech isn't motion.
- **Instructions:** English course steps show a BM translation line (`meaning`/`note` fields). BM course steps show English. The UI chrome follows the player's interface language as usual.
- **Admin:** the review page gets a "Language Hall lessons" tab, reusing `LessonReview` filtered by kind.

### Unchanged

The other islands, the Code Academy, battles, bosses, unlocks, the shop and every reward rule.

## Constraints

- No new runtime dependencies. Speech is a browser feature.
- Every database change is a migration with RLS. Answers are never readable before answering.
- 360 px phones: no horizontal scroll; tiles and pairs wrap.
- All UI strings in 7 locales. Lesson content is English and BM by design.

## Testing

- **Unit:**
  - the course schema and rules;
  - the `norm_answer` mirror;
  - the build, match and type checks in components;
  - the voice-picking fallback (`en` → any `en-*`; `ms` → `id-*` → none);
  - Listen steps skipped when there's no voice;
  - the map (zones reachable, the Hall door).
- **Server:**
  - every new kind is marked right and wrong;
  - typed slips are accepted ("Selamat pagi." = "selamat pagi");
  - keys aren't readable;
  - Listen is skipped as unmarked when no voice exists, without blocking completion. *Design call:* `complete_lesson` requires all marked steps except `listen`, so speech is a bonus.
  - Language Kingdom monsters serve language questions;
  - the Lexicon Dragon gate.
- **End-to-end:** sail to Language Kingdom, talk to Cikgu Lina, finish English lesson 1 (with a voice absent in headless Chrome, Listen steps are skipped), see +25 XP, and Back returns to the Hall door.

## Left to the builder

- The lesson wording within the unit topics, the emoji choices, the map layout and the prop and monster designs.

## Calls I made (for the owner to check)

- **English and BM first,** both 3 units × 4 lessons.
- **Listen steps don't count toward finishing a lesson,** so phones without a voice aren't stuck.
- **Malay text needs a native-speaker check** before publishing. It stays "in review" until you approve it.
- **Teacher name Cikgu Lina; boss name Lexicon Dragon.**
