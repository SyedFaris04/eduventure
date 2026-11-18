# Curriculum tags and estimated TP levels — design

Date: 18 Nov 2026. The owner chose this (research: "TP Tracker report", features 2/13/21) before teacher mode, which
will build on it.

**Why.** Since UPSR and PT3 ended, Malaysian parents have no national benchmark; classroom assessment (PBD) reports a
mastery level TP1–TP6 per topic. A report that says "Fractions: about TP3" is the research's strongest parent hook, and
teachers will want to set work by topic and level.

**What exists.** Each question has free-text `alignment` (435 of 630 mention KSSR or KSSM, e.g. "KSSR Sains Tahun 5"),
a `bloom` level (remember 154, understand 164, apply 268, analyze 34, evaluate 10) and a topic.

**Goals.**
- Structured tags on every question that has a Malaysian alignment: `curriculum: { system: 'KSSR' | 'KSSM', subject,
  years: number[] }` — parsed from the alignment text; when the text names no year, the years come from the level
  (primary → Tahun 1–6, lower secondary → Tingkatan 1–3, upper secondary → Tingkatan 4–5). Written into the content
  files (so reviewers can correct them) and into the database.
- A TP level per question from its Bloom level: remember 1, understand 2, apply 3, analyse 4, evaluate 5, create 6.
- **Estimated TP per topic** for a child, from all their battle answers: the highest level t where they have at least
  2 right answers on that topic's questions at TP ≥ t, with at least 60% right at that level and above. Topics with
  fewer than 3 answers show "not enough practice yet".
- The parent report gains a "Topics" table: subject, topic, estimated TP, answers — clearly labelled "estimated from
  EDUVENTURE practice, not the school's official PBD level".
- New questions must carry the tags when their alignment mentions KSSR/KSSM (content check), and `gen:questions` writes them.

**Non-goals.** Official DSKP standard codes (needs the DSKP documents and an educator), changing question difficulty,
showing TP to the child, admin editing of tags in the UI (content files are the source).

**Anti-goals.** Presenting an estimate as an official school grade.

**Approach.** A one-off script tags the content files and writes a backfill migration; `pick_question` is untouched.
Alternative: a hand-maintained mapping table per topic — rejected: 630 questions by hand, and the alignment text already
says it.
