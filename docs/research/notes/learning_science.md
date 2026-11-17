# Learning Science Techniques That Can Become Game Loops (for EDUVENTURE)

Research date: November 2026. Scope: which learning techniques have the strongest evidence, how apps and games have embedded them, with effect sizes, and how each could become a mechanic in EDUVENTURE (3D chibi MMORPG for Malaysian students, primary to university; subject islands, bosses, XP and gold, daily missions and streaks, Code Academy for Python and JavaScript, Language Hall for English and Malay; answers marked on the server).

Evidence labels used below: **[verified]** means the number was read in a primary source or a reliable abstract-level source during this session. **[secondary]** means it came from a press release, blog or summary, not the paper itself. Anything not checked is in the Gaps sections.

---

## 0. Overall ranking of techniques (the umbrella evidence)

### Takeaway
The two techniques with the strongest, broadest evidence are practice testing (retrieval) and distributed practice (spacing). EDUVENTURE's core loop (fight monsters by answering questions) is already a retrieval engine, so the biggest gain comes from *when* and *which* questions come back, not from adding new features.

### Cited Findings
- Dunlosky, Rawson, Marsh, Nathan & Willingham (2013), *Psychological Science in the Public Interest* 14(1), 4-58, reviewed 10 techniques; **practice testing and distributed practice got the only "high utility" ratings**, with benefits across many kinds of tests and students of all ages **[verified via APS release]** — [APS: Which Study Strategies Make the Grade?](https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html)
- **Low utility:** summarisation, highlighting, keyword mnemonic, imagery for text learning, rereading. The rest (elaborative interrogation, self-explanation, interleaving) were moderate, partly because there was less research on them — [ScienceDaily summary](https://www.sciencedaily.com/releases/2013/01/130110111734.htm); [Reading Rockets](https://www.readingrockets.org/resources/resource-library/improving-students-learning-effective-learning-techniques-promising)
- A 2021 follow-up meta-analysis of the same ten techniques (242 studies) exists — [Frontiers in Education 2021, doi 10.3389/feduc.2021.581216](https://www.doi.org/10.3389/feduc.2021.581216)

### Inferences
- EDUVENTURE should avoid "read this lesson again" content (low utility) and turn every lesson into retrieval (monster fights) spread over days (spacing).

### Gaps
- I did not retrieve the effect sizes in the 2021 ten-techniques meta-analysis.

---

## 1. Spaced repetition: evidence, how apps schedule it, how to surface due reviews without homework feel

### Takeaway
Spacing is among the most replicated findings in learning science. The best gap between reviews grows with how long you need to remember, but shrinks as a fraction of it (about 20-40% of a one-week retention interval, falling toward about 5-10% for one year). Duolingo's trainable model (half-life regression) cut prediction error by 45%+ and, in one variant, raised daily return rate by 12% in a six-week A/B test of about 1 million users. That is the clearest evidence that a better scheduler drives both learning and engagement.

### Cited Findings
**Lab and field evidence**
- Cepeda, Vul, Rohrer, Wixted & Pashler (2008), *Psychological Science*: more than 1,350 people learned facts, had a review after a gap of up to 3.5 months, and were tested up to 1 year later. **The optimal gap grows as the test delay grows, but as a proportion of the test delay it falls**. At any test delay, lengthening the gap first raised and then slowly lowered final performance (an inverted U) **[verified, abstract]** — [Cepeda et al. 2008 PDF](https://www.evullab.org/pdf/CepedaVulRohrerWixtedPashler-PS-2008.pdf); [USF record](https://digitalcommons.usf.edu/psy_facpub/1766/)
- Optimal gap was **about 20-40% of a 1-week retention interval, falling to about 5-10% for a 1-year interval**. One summary gives **1-day gap for a 7-day test** and **21-day gap for a 350-day test** **[secondary]** — [Cepeda et al. 2008 PDF](https://www.evullab.org/pdf/CepedaVulRohrerWixtedPashler-PS-2008.pdf); [Dynamic Learning summary](https://dynamiclearning.substack.com/p/the-spacing-effect)
- Practical rule from this: **a gap too short wastes time; a gap too long costs less than a gap too short** (performance falls slowly past the optimum) — [Cepeda et al. 2008](https://www.evullab.org/pdf/CepedaVulRohrerWixtedPashler-PS-2008.pdf)

**Duolingo: half-life regression (Settles & Meeder 2016, ACL)** **[verified, full text]**
- Model: estimates the "half-life" of each word in a student's memory from the student's history (times seen, times right, times wrong) plus per-word ("lexeme") features. Recall probability decays exponentially with time since last practice: p = 2^(-Δ/h) — [Settles & Meeder 2016, ACL P16-1174](https://aclanthology.org/P16-1174.pdf); [code on GitHub](https://www.github.com/duolingo/halflife-regression)
- **Reduced error by 45%+ compared with several baselines** (Leitner, Pimsleur, logistic regression) at predicting recall; MAE for HLR 0.128 vs Leitner cut "nearly in half" — [Settles & Meeder 2016](https://aclanthology.org/P16-1174.pdf)
- **A/B test results (six weeks, just under 1 million students), change in daily retention (share who come back the next day):**
  - Experiment I, HLR vs Leitner: any activity +0.3%, new lessons +0.3%, **practice sessions -7.3%** (significant). Better predictions meant fewer unnecessary review prompts.
  - Experiment II, HLR without word features vs full HLR: **any activity +12.0%**, lessons +1.7%, **practice +9.5%** (all p < 0.001).
  - — [Settles & Meeder 2016, Table 4](https://aclanthology.org/P16-1174.pdf)
- The spaced-repetition model drove **"strength meters" in the skill tree** (skills visibly decay and need refreshing) and chose which words appeared in practice sessions. That is the in-product way Duolingo surfaced due reviews — [Settles & Meeder 2016](https://aclanthology.org/P16-1174.pdf)
- Duolingo's blog says HLR's error was nearly half that of the Leitner system it first used, and that A/B tests were run on which algorithm users preferred — [Duolingo blog: How we learn how you learn](https://blog.duolingo.com/how-we-learn-how-you-learn)

**Anki (SM-2 and FSRS)**
- Anki's default scheduler is based on SM-2. **FSRS has been an option since Anki 23.10.** Anki's docs say FSRS needs **fewer reviews to reach the same retention** and handles late reviews (after breaks of weeks or months) much better. **"Desired retention" is the main control: higher retention means more reviews per day** — [Anki manual FAQ](https://docs.ankiweb.net/faqs/what-spaced-repetition-algorithm)
- Open benchmark of spaced-repetition algorithms (log-loss and calibration on large Anki review datasets) — [Expertium benchmark](https://expertium.github.io/Benchmark.html). Reported figures: log-loss SM-2 0.354 vs FSRS-5 0.291; claims of **20-50% fewer reviews** at 90% retention come from a vendor (Diane) **[secondary, vendor; not verified]** — [Diane FSRS vs SM-2](https://www.diane.app/en/guides/fsrs-vs-sm2)
- Forum users report that the FSRS optimiser often suggests a **desired retention around 0.78-0.85**, lower than the 0.90 many users pick **[anecdotal]** — [Anki forums](https://forums.ankiweb.net/t/update-simulator-for-fsrs-to-compare-with-ankis-built-in-scheduler/23793)

**Quizlet Learn**
- The 2017 launch said Learn used data from millions of anonymised sessions plus spaced repetition to show material "as often as needed to master it" — [THE Journal 2017](https://thejournal.com/articles/2017/03/09/quizlet-debuts-study-feature-that-helps-students-study-efficiently.aspx)
- Quizlet's engineering blog: a recall-prediction model with four features and an exponential forgetting assumption. Key product insight: **most users study a set on a single day; 95% study a set over four days at most**. So true multi-day spacing had too little data, and Quizlet shifted toward within-session adaptivity — [Quizlet tech blog (Medium)](https://medium.com/tech-quizlet/spaced-repetition-for-all-cognitive-science-meets-big-data-in-a-procrastinating-world-59e4d2c8ede1)
- Quizlet does not publicly document its current scheduling **[secondary, competitor blog]** — [Notelyn](https://www.notelyn.com/blog/quizlet-spaced-repetition)

### Inferences (EDUVENTURE mechanics)
- **Lesson from Quizlet:** learners will not come back for spacing on their own. The game must supply the reason to return (daily missions, streaks, events). EDUVENTURE already has these. So its daily mission generator should be the delivery vehicle for due reviews.
- **Lesson from Duolingo:** a better scheduler can *lower* practice-session engagement (Experiment I, -7.3%) if it makes reviews feel less necessary. Engagement and learning gains have to be measured separately in A/B tests.
- **Scheduler:** store per-student, per-question-concept memory state on the server (it already marks answers). Start with a simple HLR-style or FSRS-style model: p_recall = 2^(-days_since/half_life). Double the half-life on correct, shrink it on wrong. Mark an item "due" when p_recall falls below about 0.85 (this links to the 85% rule in section 4). Upgrade to a fitted model (FSRS is open source) once there is review data.
- **"Monsters return" mechanic:** every concept the player has beaten becomes a monster "species" in their bestiary. When its memory strength decays, a **"Returning" monster** of that species re-spawns on the island near the player's usual route (not in a separate review menu). It is weaker-looking but drops **bonus "Memory Shards"**. Beating a returning monster at the right time gives more XP than beating a new one, which rewards spacing over cramming. If the player leaves it too long, it "evolves" (harder phrasing, same concept), which makes forgetting visible but not punishing.
- **"Wilting garden" mechanic (good for younger primary pupils):** each mastered topic is a plant on a home island. Decay is shown as wilting; one short quiz waters it. Duolingo's skill "strength meter" shows the same idea works at scale. Keep it gentle: plants wilt, they never die, so the mechanic does not shame absent learners.
- **Daily mission mix:** generate missions such as "Defeat 5 Returning monsters" plus "Explore 1 new area". The scheduler fills the review slots; the player sees adventure, not homework.
- **Retention target by age:** for exam-prep (SPM, STPM, university), set due threshold higher (about 0.9). For casual primary play, lower (about 0.8) so fewer reviews are needed. This is the Anki "desired retention" knob exposed as a design setting, not a player setting.
- **Exam-aware spacing:** if a student sets an exam date (UPSR replacement assessments, PT3 replacements, SPM), use Cepeda's ratio: gaps of about 10-20% of the time left until the exam.

### Gaps
- Cepeda et al. (2006) *Psychological Bulletin* meta-analysis (Distributed practice in verbal recall tasks): I did not retrieve its effect sizes during this session. From training knowledge it covers 317 experiments in 184 articles and shows spaced beats massed practice overall, but the exact effect numbers should be checked in the paper before citing.
- Memrise: I found no reliable public documentation of its current scheduling algorithm.
- No published evidence found that "wilting garden" or "returning monster" framings themselves raise review completion. They are design inferences from Duolingo's strength meter.

---

## 2. Retrieval practice and the testing effect

### Takeaway
Taking a test (even without a grade) beats restudying for long-term memory, though restudy can look better on an immediate test. Classroom studies show the effect holds in real schools across ages and subjects. The core EDUVENTURE combat loop is retrieval practice, which is the strongest single design advantage the game has.

### Cited Findings
- Roediger & Karpicke (2006), *Psychological Science* 17(3), 249-255: students restudied or were tested on prose passages; final tests at 5 minutes, 2 days or 1 week. **Restudy won on the 5-minute test; testing won on the 2-day and 1-week tests** **[verified, abstract]** — [Roediger & Karpicke 2006 PDF](https://psychology.ecu.edu/wp-content/pv-uploads/sites/216/2019/03/Roediger-Karpicke-2006.pdf)
- Experiment 2: **study once + test three times recalled 61% after one week vs 40% for study four times** **[secondary, WashU press release]** — [WashU Source](https://source.washu.edu/?p=55770)
- Testing slows initial learning but improves long-term retention (the authors' later retrospective) — [APS Observer: Test-enhanced learning](https://www.psychologicalscience.org/observer/test-enhanced-learning)
- Adesope, Trevisan & Sundararajan (2017), *Review of Educational Research* 87(3), 659-701: **118 articles, 272 effect sizes, 15,472 participants**. Practice tests beat restudy and all other comparison conditions. **Multiple-choice practice tests were the most effective single format.** Practice tests with feedback did **not** give significantly larger effects than practice tests without feedback **[secondary summaries]** — [WSU news](https://news.wsu.edu/news/2018/01/09/educational-psychology-article-among-nations-most-read/); [WSU repository](https://rex.libraries.wsu.edu/esploro/outputs/journalArticle/Rethinking-the-Use-of-Tests-A/99900601154801842)
- Agarwal, Nunes & Blunt (2021), *Educational Psychology Review*: systematic review of **50 classroom experiments**, about 49 effect sizes, total n = 5,374. **57% of effect sizes were medium or large**, and almost all were positive. Covered elementary to university and many subjects — [OSF project wiki](https://osf.io/mz2ks/wiki); [Retrieval Practice database](https://www.retrievalpractice.org/review); [InnerDrive summary](https://blog.innerdrive.co.uk/latest-retrieval-practice-review)

### Inferences (EDUVENTURE mechanics)
- **Combat is retrieval:** keep monsters as genuine recall (players produce or choose the answer *before* seeing any hint). Do not put the answer in the monster's flavour text or show a "study card" right before the fight.
- **Multiple choice is fine as the base format** (Adesope found it the most effective single format), which suits fast combat on mobile. Add harder formats as the player levels up (see section 6): type-the-answer for vocabulary, fill-in-the-blank code, short output prediction ("what does this print?").
- **"Pre-battle scouting" (pretesting):** let players attack a new island's monsters before the lesson. Wrong answers are expected and cost nothing. This uses retrieval to prime learning. (Pretesting evidence itself was not checked in this session; see Gaps.)
- **Low-stakes framing:** classroom studies were mostly low-stakes quizzes. In game terms: a missed answer should cost a small amount of HP, never XP or gold already earned.
- **Teacher mode:** Agarwal's classroom evidence supports a "class raid" mode where a teacher launches a 5-minute retrieval boss at the start of a lesson on last week's topic.

### Gaps
- I could not open the Adesope (2017) full text (403). The overall effect size often cited (g = 0.61 vs all comparisons; about 0.51 vs restudy) is from training knowledge and was **not verified** this session.
- I could not verify a pooled effect size (e.g., "g = 0.50") for Agarwal et al. (2021). The review reports effect-size categories, not a single headline number, as far as the sources show.
- Pretesting / errorful generation evidence was not searched.

---

## 3. Interleaving

### Takeaway
Mixing problem types helps learners tell similar categories apart (overall g = 0.42), especially in maths and visual categories. It **hurts** for word lists (g = -0.39) and should be used carefully for text. Interleave *after* each type has been introduced, not during first exposure.

### Cited Findings
- Brunmair & Richter (2019), *Psychological Bulletin* ("Similarity matters"): multilevel meta-analysis of 59 studies, **overall g = 0.42** in favour of interleaving **[verified, abstract]** — [PubMed 31556629](https://pubmed.ncbi.nlm.nih.gov/31556629/); [author PDF](https://www.psychologie.uni-wuerzburg.de/fileadmin/06020400/2019/Brunmair_Richter_in_press__2019_META-ANALYSIS_OF_INTERLEAVED_LEARNING.pdf)
- **Words: blocking beat interleaving, g = -0.39.** Authors advise caution for expository texts and words — [PubMed 31556629](https://pubmed.ncbi.nlm.nih.gov/31556629/)
- Key moderator: interleaving helps most when categories are **similar and hard to tell apart** (hence "Similarity matters") — [author PDF](https://www.psychologie.uni-wuerzburg.de/fileadmin/06020400/2019/Brunmair_Richter_in_press__2019_META-ANALYSIS_OF_INTERLEAVED_LEARNING.pdf)
- Rohrer & Taylor (2007), *Instructional Science* 35, 481-498: blocked vs shuffled maths practice. Shuffled practice gave better delayed test scores — [USF record](https://digitalcommons.usf.edu/psy_facpub/1767/); [PDF](https://www.Gwern.net/doc/psychology/spaced-repetition/2007-rohrer.pdf)
- Classroom replication, Rohrer, Dedrick & Burgess (2014): **72% vs 38%, d = 1.05** for interleaved vs blocked maths practice — [Psychonomic Bulletin & Review 2014](https://link.springer.com/article/10.3758/s13423-014-0588-3)
- Taylor (2008 dissertation): mixed practice **77% vs 38%** on a test with novel problems — [USF ETD](https://digitalcommons.usf.edu/etd/529)

### Inferences (EDUVENTURE mechanics)
- **Island zones are blocked, wild zones are interleaved:** on first visit to the Maths island, each zone teaches one problem type (blocked; fine for first exposure). After a type is unlocked, its monsters start appearing in mixed "Wilds" and in bosses. **Bosses should always be interleaved**, with phases drawing different problem types, so players must first recognise *which* method applies.
- **Code Academy:** good interleaving targets are confusable constructs: `for` vs `while`, list vs dict vs tuple in Python, `==` vs `===` and `let` vs `const` vs `var` in JavaScript, Python vs JavaScript syntax for the same idea (a "Bilingual Bug" monster that mixes both languages).
- **Language Hall:** do **not** interleave raw vocabulary lists (g = -0.39 for words). Do interleave *confusable grammar decisions*: English tenses, Malay affixes (*me-*, *ber-*, *di-*, *-kan*, *-i*), *di* (preposition) vs *di-* (prefix).
- Interleaving makes practice feel harder and lowers in-session accuracy. Tell players: "Mixed battles are tougher but make you stronger" and reward them with higher XP multipliers, so lower accuracy does not feel like failure.

### Gaps
- I did not verify the "63% vs 20%" figure often quoted for Rohrer & Taylor (2007); the verified classroom figures are 72% vs 38% (2014) and 77% vs 38% (2008).
- Moderator effect sizes for maths and paintings in Brunmair & Richter were not retrieved.

---

## 4. Mastery learning, adaptive difficulty and the target success rate

### Takeaway
Mastery learning has a solid moderate effect (about 0.5 SD, from older reviews), but Bloom's "2-sigma" tutoring effect has not held up at that size. For engagement, practice systems aim for roughly 65-85% correct: the "85% rule" is a theoretical result for simple machine-learning-style learning, and Elo-based educational systems found students prefer about 65-75% success.

### Cited Findings
**Mastery learning**
- Kulik, Kulik & Bangert-Drowns (1990), *Review of Educational Research* 60(2), 265-299: **108 controlled evaluations; positive effects on exam performance in college, high school and upper primary** — [Academia.edu record](https://www.academia.edu/81783373/Effectiveness_of_Mastery_Learning_Programs_A_Meta_Analysis); [typeset PDF](https://typeset.io/pdf/effectiveness-of-mastery-learning-programs-a-meta-analysis-45bgwh1byb.pdf)
- Average effect **about 0.52 SD**, larger for weaker students; mastery programs may lower course completion **[secondary, possibly AI-generated summary; not verified against the paper]** — [Academia.edu](https://www.academia.edu/81783373/Effectiveness_of_Mastery_Learning_Programs_A_Meta_Analysis)
- Critique of Bloom's 2-sigma (an essay re-examining the original studies and later tutoring meta-analyses) — [Nintil: On Bloom's two sigma problem](https://nintil.com/bloom-sigma/) (found in search; not read in full this session)

**Knowledge tracing and Elo ratings**
- Pelánek (2016), *Computers & Education*: Elo treats each answer as a "match" between student and item, estimating student skill and item difficulty together. He calls it **simple, robust and effective** — [Pelánek CAE Elo PDF](https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf)
- **Target success rate:** in adaptive *testing*, 50% is optimal, but for *practice* "student motivation is crucial and 50% success rate does not seem very encouraging". Pelánek's system **defaults to 75%**, and adjusts the target from the student's success on the **last 10 questions** — [Pelánek CAE Elo PDF](https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf)
- Empirical: a study of an adaptive geography practice system found **a suitable success rate around 65%**; students using it in school preferred easier questions — [Pelánek, AIED 2015](https://www.fi.muni.cz/~xpelanek/publications/aied15.pdf)
- A 2025 paper ("Keeping Elo alive") finds Elo ratings are generally **not unbiased** and their variance depends on context — [PMC12784335](https://pmc.ncbi.nlm.nih.gov/articles/PMC12784335)

**The "85% rule"**
- Wilson, Shenhav, Straccia & Cohen (2019), *Nature Communications* 10:4646: for gradient-descent-based learning on binary tasks, the optimal training error rate is **15.87% (about 85% correct)** under Gaussian noise, and training at that difficulty can give **exponential improvements in learning rate**. Holds for 1- and 2-layer neural networks and a model of perceptual learning **[verified, abstract]** — [PMC6831579](https://pmc.ncbi.nlm.nih.gov/articles/PMC6831579); [Arizona record](https://experts.arizona.edu/en/publications/the-eighty-five-percent-rule-for-optimal-learning/)
- Wilson cautioned it applies to **simple tasks with a clear right/wrong answer**, not directly to school grades — [ScienceDaily](https://www.sciencedaily.com/releases/2019/11/191105113457.htm); [Neuroscience News](https://neurosciencenews.com/learning-optimized-15171/)

### Inferences (EDUVENTURE mechanics)
- **Elo is a good fit for EDUVENTURE's server:** each question gets a difficulty rating, each player a per-skill rating, and every server-marked answer updates both. This is cheap, needs no training data, and handles new questions automatically. Upgrade later to BKT or a learned model per skill if needed.
- **Target band:** use about **75-80% expected success** for normal monsters (between Pelánek's 65-75% and the 85% rule), about 85-90% for review ("Returning") monsters and for younger primary pupils, and about 60-65% for bosses (harder, higher reward, short). Re-tune from the last 10 answers, as Pelánek does. A/B test the band, since the evidence is not settled.
- **Mastery gate = boss gate:** a boss door unlocks when the player's estimated mastery on that island's skills passes a threshold (e.g., P(known) ≥ 0.9 or Elo above the boss's rating), not when a fixed number of monsters is beaten. Show mastery as a visible "Island Crest" fill bar.
- **Corrective loop (Bloom-style):** after a failed boss, generate a short "training camp" of the exact skills that failed, then allow a rematch. Never just repeat the same boss questions.
- **Flow from both sides:** too-easy monsters feel boring and too-hard ones feel unfair. The adaptive rating keeps difficulty near the target band, which is the same design goal as game flow theory (challenge matched to skill).
- **Equity:** mastery effects are larger for weaker students (if the secondary source is right), which matters for mixed-ability Malaysian classrooms. Mastery gating lets weaker students take longer without being blocked from social and cosmetic parts of the game.

### Gaps
- Bloom (1984) 2-sigma and its non-replication at that size: I did not read the primary sources this session. From training knowledge, later tutoring meta-analyses (e.g., VanLehn 2011; Kraft and colleagues on high-dosage tutoring) find effects closer to 0.3-0.8 SD; this should be verified before citing.
- No primary-source effect sizes for BKT-driven systems (Cognitive Tutor, ASSISTments) or Khan Academy's mastery system were retrieved.
- Csikszentmihalyi flow theory and game-flow (Sweetser & Wyeth 2005) sources were not retrieved.
- No study was found that directly tests the 85% rule with children in an educational game.

---

## 5. Feedback: immediate vs delayed, elaborated, and explanations after wrong answers

### Takeaway
Feedback has a medium average effect (d = 0.48) but varies widely. Feedback that carries more information (what was wrong, why, and how to fix it) works best; plain praise, punishment and rewards have small effects. Correct-answer feedback after a wrong answer is important, but the timing evidence is mixed.

### Cited Findings
- Wisniewski, Zierer & Hattie (2020), *Frontiers in Psychology* 10:3087: **435 studies, 994 effect sizes, more than 61,000 participants; random-effects d = 0.48**, with significant heterogeneity ("feedback cannot be understood as a single consistent form of treatment") **[verified, abstract]** — [Frontiers PDF](https://www.frontiersin.org/articles/10.3389/fpsyg.2019.03087/pdf); [UZH reference page](https://www.gbl.uzh.ch/quartz/references/Wisniewski-et-al.-(2020))
- **More information = more impact.** Feedback has stronger effects on **cognitive and motor skills** than on **motivation and behaviour**. **Praise, punishment and rewards have low or low-to-medium effects**; corrective feedback is highly effective for some outcomes — [Frontiers PDF](https://www.frontiersin.org/articles/10.3389/fpsyg.2019.03087/pdf)
- Adesope et al. (2017): practice tests **with** feedback did **not** give significantly larger testing effects than tests without feedback **[secondary]** — [WSU news](https://news.wsu.edu/news/2018/01/09/educational-psychology-article-among-nations-most-read/)

### Inferences (EDUVENTURE mechanics)
- **After a wrong answer, always show the correct answer plus a 1-2 line "why"** (elaborated feedback). For a wrong answer on a multiple-choice question, explain why the chosen distractor is wrong ("You picked `5` because `range(5)` stops *before* 5"). Write distractors from common mistakes so each one has a ready explanation.
- **XP and gold are rewards, not feedback.** The meta-analysis shows rewards alone have small effects on learning. Keep them for engagement, and make sure every answer also carries information.
- **Timing in combat:** give the correct/incorrect signal instantly (it is a game; it is also needed for the Elo update). Put the longer explanation in a skippable "Insight" card after the fight or on the defeat screen. This keeps combat flowing and still gives elaborated feedback.
- **Code Academy:** feedback should name the error type in plain language and point to the line (e.g., "IndentationError on line 3: Python uses spaces to group code"). Show the expected vs actual output for "predict the output" questions.
- **Language Hall:** for English/Malay grammar mistakes, show the rule and one contrasting example (e.g., *"Dia **di** rumah"* (place) vs *"Buku itu **di**baca"* (passive)).
- **Wrong answers feed the scheduler:** a missed item gets a short half-life so it returns soon as a "Returning" monster (link to section 1).

### Gaps
- Hattie & Timperley (2007) *Review of Educational Research* (feedback model; often-quoted average effect 0.79): not retrieved this session; the 0.79 figure comes from earlier meta-syntheses and was revised down to 0.48 by Wisniewski et al. 2020.
- I did not retrieve exact moderator effect sizes for immediate vs delayed timing from Wisniewski et al. Classic findings (Kulik & Kulik 1988; Butler, Karpicke & Roediger 2007) suggest delayed feedback can help retention in some lab tasks, but immediate is better in classroom settings; this needs checking.

---

## 6. Growth mindset and error framing

### Takeaway
Growth-mindset interventions have, at best, small average effects. The large Yeager et al. (2019) Nature study found about 0.10 GPA points for lower-achieving students, mainly where peer norms supported the message. A 2023 meta-analysis found d = 0.05 overall and d = 0.02 in high-quality studies, though re-analysis finds meaningful effects for at-risk students. For EDUVENTURE: do not build a mindset "lesson"; build error-friendly mechanics instead.

### Cited Findings
- Yeager et al. (2019), *Nature*: a **less-than-one-hour online** growth mindset intervention in a **nationally representative sample of U.S. secondary students** improved grades for **lower-achieving students** **[verified, abstract]** — [Harvard Kennedy School record](https://www.hks.harvard.edu/publications/national-experiment-reveals-where-growth-mindset-improves-achievement); [PMC6786290](https://pmc.ncbi.nlm.nih.gov/articles/PMC6786290)
- Effect: **about 0.10 GPA points on a 4-point scale** for lower achievers; reduced students ending 9th grade off-track by **5.3 percentage points**. It worked where **peer norms aligned with the message** — [EdWeek](https://www.edweek.org/ew/articles/2019/08/07/national-study-shows-how-a-simple-growth.html); [PMC6786290](https://pmc.ncbi.nlm.nih.gov/articles/PMC6786290)
- Macnamara & Burgoyne (2023), *Psychological Bulletin* 149(3-4), 133-173: **63 studies, N = 97,672; d = 0.05 overall, d = 0.04 for studies that actually changed mindsets, d = 0.02 for six high-quality studies**. They argue benefits may come from weak designs, reporting problems and bias — [Psychology Today summary](https://psychologytoday.com/gb/blog/fulfillment-at-any-age/202308/maybe-theres-no-magic-to-the-mindset); [Macnamara PDF (Gwern)](https://Www.Gwern.net/doc/statistics/meta-analysis/2023-macnamara.pdf)
- **Disputed:** Burnette et al. (2023) and Tipton et al. (2023) used multilevel methods and found **meaningful effects for at-risk groups**; Macnamara & Burgoyne's own data also showed effect size linked to student risk status — [Tipton et al., "Why meta-analyses of growth mindset... should follow best practices"](https://ecrhub.org/publications/why-meta-analyses-growth-mindset-and-other-interventions-should-follow-best-practices)

### Inferences (EDUVENTURE mechanics)
- **Flag for the report writer:** the original Dweck/Brainology claims of large effects have **not replicated at that size**. Do not market EDUVENTURE as "teaching growth mindset". The safer claim is: the game treats mistakes as part of learning.
- Error-friendly mechanics that follow from sections 2, 4 and 5 (these need no mindset theory to justify them):
  - **"Lesson learned" bonus:** answering correctly a question you previously got wrong gives extra XP ("Comeback bonus"). This rewards correcting errors, not avoiding them.
  - **Defeat is never a loss of progress:** a lost boss gives a small "Battle Experience" reward plus a training camp.
  - **Process praise in NPC dialogue** ("You tried a new strategy!") rather than "You're so smart", which is cheap to write and low-risk, but expect small effects.
  - **Peer norms:** Yeager found peer norms mattered. Guild/class chat and leaderboards should celebrate improvement ("most improved this week"), not just top scores.

### Gaps
- Original Brainology (Blackwell, Trzesniewski & Dweck 2007) and the Sisk et al. (2018) meta-analysis (often cited at d = 0.08) were not retrieved this session.
- No standardised effect size for Yeager et al. (2019) was found in the sources (only the 0.10 GPA points).
- No studies found on growth-mindset messaging inside games specifically (e.g., Brainology's game-like modules or O'Rourke et al.'s Refraction "brain points" study, 2014, which is a known example but was not checked).

---

## 7. Self-explanation, worked examples and the generation effect (coding and languages)

### Takeaway
Prompting learners to explain steps to themselves has a medium effect (g = 0.55), and generic prompts work better than specific ones. Worked examples help novices but become less useful (or harmful) as skill grows (expertise reversal). This maps well to coding: show worked code first, then fade to completing and then writing code.

### Cited Findings
- Bisra, Liu, Nesbit, Salimi & Winne (2018), *Educational Psychology Review*: **69 effect sizes from 64 reports; random-effects g = 0.55** **[verified, secondary summaries of the abstract]** — [Clearinghouse Unterricht review](https://www.clearinghouse.edu.tum.de/wp-content/uploads/2023/09/CHU-KR-25_ENG_Bisra_2018_Selbsterklaerungen.pdf); [BPS Research Digest](https://www.bps.org.uk/research-digest/self-explanation-powerful-learning-technique-according-meta-analysis-64-studies); [Bisra PDF (Gwern)](https://www.Gwern.net/doc/psychology/spaced-repetition/2018-bisra.pdf)
- **Generic prompts** ("Explain why this step works") beat specific prompts and no prompt. **Most studies were with undergraduates**, so evidence for young children is thinner — [Clearinghouse review](https://www.clearinghouse.edu.tum.de/wp-content/uploads/2023/09/CHU-KR-25_ENG_Bisra_2018_Selbsterklaerungen.pdf); [SFU Summit record](https://summit.sfu.ca/item/34322)
- Dunlosky et al. (2013) rated self-explanation **moderate utility** — [ScienceDaily](https://www.sciencedaily.com/releases/2013/01/130110111734.htm)

### Inferences (EDUVENTURE mechanics)
- **Code Academy "Fading Scroll" quest chain** (worked example to problem): (1) a full worked solution with a self-explanation question ("Why does the loop stop at 4?", multiple choice so the server can mark it); (2) the same code with 1-2 lines blanked (Parsons-style drag-in or fill-in); (3) a near-identical problem from scratch. As the player's Elo rises, skip step 1 (expertise reversal: experts don't need worked examples).
- **"Debug the Bug" monsters:** show broken code and ask the player to find the line and pick the reason. This combines self-explanation with retrieval and maps onto server-marked MCQ.
- **"Predict the output" before running** is generation: the player commits to an answer, then sees the real output.
- **Language Hall:** generation = typing or speaking the word rather than only choosing it (once the item is fairly well known); self-explanation = "Why is *membaca* correct here, not *dibaca*?" with rule choices as answers.
- Since most self-explanation evidence is from undergraduates, use lighter prompts (pictures, two choices) for primary pupils.

### Gaps
- No meta-analytic effect size for the **worked-example effect** or **expertise reversal effect** was retrieved (searched once, no results). Known sources to check: Sweller & Cooper (1985); Kalyuga et al. (2003) on expertise reversal; Atkinson, Derry, Renkl & Wortham (2000).
- **Generation effect** meta-analysis (Bertsch, Pesta, Wiscott & McDaniel 2007, often cited at d = 0.40) was not retrieved; unverified.
- No coding-specific trials (e.g., Parsons problems, subgoal labelling by Margulieux and colleagues) were retrieved.

---

## 8. Evidence from educational game studies (what helps, what distracts)

### Takeaway
Educational games beat non-game instruction by a small-to-moderate amount (g = 0.33; d = 0.29). Learning gains are larger with **multiple sessions**, when games are **combined with other instruction**, and with **simpler visuals**. Games were **not** shown to be more motivating than conventional instruction in Wouters (d = 0.26, not significant). Decorative, interesting-but-irrelevant content ("seductive details") reduces learning, especially in short lessons and for novices.

### Cited Findings
- Clark, Tanner-Smith & Killingsworth (2016), *Review of Educational Research*: digital games vs non-game: **g = 0.33 (95% CI 0.19-0.48), k = 57**. **Augmented game designs vs standard versions: g = 0.34 (95% CI 0.17-0.51), k = 20** **[verified, abstract]** — [PMC4748544](https://pmc.ncbi.nlm.nih.gov/articles/PMC4748544); [SRI brief](https://www.sri.com/publication/education-learning-pubs/digital-learning-pubs/digital-games-design-and-learning-a-systematic-review-and-meta-analysis-brief/)
- In Clark et al., **simpler visual design was as effective or more effective than more visually complex games**, and **multiple game sessions beat single sessions** — [Joan Ganz Cooney Center](https://joanganzcooneycenter.org/?p=16779)
- Authors suggested rich narratives and visual complexity may distract from the content or give alternative goals **[secondary, blog quoting paper]** — [UniversityXP summary](https://www.universityxp.com/research/2021/11/1/digital-games-design-and-learning-a-systematic-review-and-meta-analysis)
- Wouters, van Nimwegen, van Oostendorp & van der Spek (2013), *Journal of Educational Psychology* 105(2), 249-265: vs conventional instruction, **learning d = 0.29, retention d = 0.36** (both p < .01); **motivation d = 0.26, not significant** (k = 31). Larger effects when **supplemented with other instruction** and with **multiple training sessions** — [Utrecht research portal](https://research-portal.uu.nl/en/publications/a-meta-analysis-of-the-cognitive-and-motivational-effects-of-seri/); [e-teaching.org](https://www.e-teaching.org/materialien/literatur/wouters-van-nimwegen-van-ooostendorp-van-der-spek-2013)
- Sundararajan & Adesope (2020), *Educational Psychology Review* ("Keep it Coherent"): learners with seductive details did worse on learning outcomes. Study count differs across sources (58 studies, 7,500+ students per WSU; 68 experiments per another blog) — [WSU news](https://news.wsu.edu/2020/03/19/seductive-details-inhibit-learning/); [Learning and the Brain](https://www.learningandthebrain.com/blog/seductive-details-when-do-cool-stories-and-videos-interfere-with-learning/)
- Seductive details hurt **most in short lessons (< 5 minutes)**, with no significant effect in longer ones (> 10 minutes), and more for **novices** than experts **[secondary]** — [Learning and the Brain](https://www.learningandthebrain.com/blog/seductive-details-when-do-cool-stories-and-videos-interfere-with-learning/)
- No difference by format, timing, placement, size or frequency of the seductive details **[secondary]** — [QIC-WD summary](https://qic-wd.org/node/583)

### Inferences (EDUVENTURE mechanics)
- **The chibi 3D world is fine, but keep the question screen clean.** During a question, hide or dim particle effects, ambient animations and lore text. The 3D world is the "between questions" reward; the question card is a plain, high-contrast learning space. This matters most because EDUVENTURE's fights are short (each question is a < 5-minute lesson, the zone where seductive details hurt most).
- **Integrate theme with content instead of decorating** ("intrinsic integration"): the Python island's monsters should *be* code concepts (a "Loop Serpent" that repeats its attacks n times, a "Null Wraith") so that the story supports the concept rather than competing with it.
- **Multiple short sessions over one long session** is supported by both meta-analyses; this aligns with daily missions and streaks.
- **Combine with teaching:** Wouters found games work better alongside other instruction. Offer a teacher dashboard and lesson-aligned islands (Malaysian KSSR/KSSM syllabus topics), so the game complements class time.
- **Do not assume the game is more motivating than class.** Measure motivation and retention separately.

### Gaps
- Moderator effect sizes for specific mechanics in Clark et al. (e.g., scaffolding, "enhanced" vs "basic" game mechanics, narrative) were not retrieved.
- Pooled effect size (g) for Sundararajan & Adesope (2020) was not found in available sources.
- Evidence specific to Malaysian students or Southeast Asian classrooms was not searched.

---

## 9. Habit formation, session length and microlearning

### Takeaway
Habits take weeks to months to become automatic (median about 66 days in a modelled subset, range 18-254), and **missing one day did not derail habit formation**, though very inconsistent people failed to form habits. This argues for small daily sessions anchored to a routine, and for streak mechanics that forgive single misses.

### Cited Findings
- Lally, van Jaarsveld, Potts & Wardle (2010), *European Journal of Social Psychology* (doi 10.1002/ejsp.674): **96 participants recruited, 82 finished**; for a modelled subset (39 participants whose data fit), the **median time to 95% of their automaticity plateau was 66 days, range 18 to 254 days (254 is a projection)**. **Early repetitions gave the biggest gains in automaticity** — [BPS Research Digest](https://bps.org.uk/research-digest/how-form-habit); [The Behavioral Scientist](https://www.thebehavioralscientist.com/articles/how-long-to-form-a-habit)
- **Missing one opportunity did not significantly affect habit formation**, but **very inconsistent** performers did not form habits. Automaticity was **self-reported** (Self-Report Habit Index items) — [UCL news 2009](https://www.ucl.ac.uk/news/2009/aug/how-long-does-it-take-form-habit)
- Participants were adults (mean age 27), not children — [BPS Research Digest](https://bps.org.uk/research-digest/how-form-habit)

### Inferences (EDUVENTURE mechanics)
- **Streak with forgiveness:** since a single miss does not break habit formation, the streak should not punish one miss. Give a free "Streak Shield" each week (Duolingo's "streak freeze" is a familiar version), and make the shield earnable through play rather than purchase (important for a children's product and Malaysian parents).
- **Tiny daily minimum:** define "streak kept" as a very small action (e.g., 3 questions or one Returning monster, about 2-3 minutes). This follows the Tiny Habits idea of making the behaviour easy and anchoring it to a routine ("after school bus", "after dinner"). Offer an optional routine anchor during onboarding ("When will you play? After school / after dinner").
- **Early weeks matter most:** Lally found the largest automaticity gains early. Front-load rewards and onboarding missions in the first 2-3 weeks, and track 66-day-ish milestones ("Habit Hero" badge at day 66 is a fun reference).
- **Session design:** build the daily loop around 5-15 minute sessions (a handful of monsters plus a mission), with natural stopping points, which also suits school-day phone/tablet limits.
- **Child safety and wellbeing:** streak pressure on minors can backfire. Do not use loss-framed notifications ("Your garden is dying!") late at night; respect parent-set time windows.

### Gaps
- **BJ Fogg / Tiny Habits:** I did not retrieve sources; Tiny Habits (2019 book) is a popular framework (behaviour = motivation + ability + prompt) with limited peer-reviewed controlled trials. Treat as design heuristic, not evidence.
- **Ideal session length for children and teens** and **microlearning effect sizes**: not retrieved this session. No reliable source found in this session for a specific number; any "10-minute" figure should be verified.
- Lally's sample was adults doing health behaviours; no habit-formation studies with school-age learners in educational apps were found.
- Engagement data from Duolingo on streak freezes/streak mechanics were not retrieved.

---

## Summary table: technique, evidence strength, EDUVENTURE mechanic

| Technique | Best effect-size evidence found (status) | EDUVENTURE mechanic |
|---|---|---|
| Retrieval practice | Dunlosky high utility; 61% vs 40% at 1 week (secondary); Agarwal 57% of classroom effects medium/large | Monster combat itself; low-stakes HP-only penalties; pre-lesson scouting fights |
| Spacing / spaced repetition | Cepeda 2008 ridgeline; Duolingo HLR -45% error, +12% daily retention in one A/B arm | "Returning monsters", wilting garden, review slots inside daily missions |
| Interleaving | g = 0.42 overall, g = -0.39 for words; d = 1.05 classroom maths | Mixed "Wilds" zones and interleaved bosses; not for vocab lists |
| Mastery + adaptive difficulty | Mastery ~0.5 SD (secondary); 85% rule (theory); Elo target 65-75% | Elo per question/skill, target 75-80%, mastery-gated boss doors, training camps |
| Elaborated feedback | d = 0.48 overall; information-rich feedback best; rewards/praise weak | Instant right/wrong + "Insight" card explaining the chosen distractor |
| Growth mindset | d = 0.05 overall (disputed; larger for at-risk); Yeager +0.10 GPA | Comeback bonus, no progress loss on defeat, "most improved" boards |
| Self-explanation / worked examples | g = 0.55 (self-explanation) | Fading Scroll quests, Debug the Bug, predict-the-output |
| Educational games | g = 0.33 vs non-game; d = 0.29 learning, motivation n.s. | Clean question UI, intrinsic theming, multi-session play, teacher dashboard |
| Habit formation | Median 66 days (range 18-254); single misses OK | Forgiving streaks, tiny daily minimum, routine anchors, front-loaded onboarding |
