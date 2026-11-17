# Engagement and Retention Mechanics in Learning Apps and Games: Evidence Catalogue (for EDUVENTURE)

Research date: November 2026. Figures are labelled with their year. "Vendor" means the source is the company or is funded by it. "Secondary" means an aggregator or summary rather than the original paper or post.

---

## 1. Duolingo: what streaks, leagues, XP, hearts and energy, quests, notifications and the owl did, and which were the biggest retention wins

### Takeaway
Duolingo's growth turnaround came from optimising one metric: **CURR**, the next-day retention of already-active users. It pulled this lever mainly with **leaderboards and leagues**, **streak mechanics** (streak-saver notifications, streak wager, weekend amulet, freezes, goal commitment) and **bandit-optimised push notifications**. Over about four years this produced 4.5x DAU and cut daily churn of the best users by more than 40%. By mid-2026 CURR had reached an all-time high of 84%, and DAU growth had accelerated to 29% year on year in Q3 2026.

### Cited Findings

**Growth model and North Star (Jorge Mazal, Lenny's Newsletter, about 2022–23):**
- DAU growth had slowed to single digits year on year by mid-2018. After the team adopted CURR as its focus, DAU grew **4.5x over four years**. — [Lenny's Newsletter: How Duolingo reignited user growth](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)
- CURR rose **21%** over those four years, which cut the daily churn of the best users by **more than 40%**. — [Lenny's Newsletter](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)
- In the growth-model simulation, each lever was moved 2% per quarter for three years. CURR's effect on DAU was **5x** that of the next-best lever, and its effect on DAU was 6x its effect on MAU. — [Lenny's Newsletter](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)
- Two early copycat tests failed:
  - A Gardenscapes-style "moves counter" was **completely neutral** for retention and DAU.
  - A referral programme offering a free month of Super raised new users by only **3%**.
  - Source: [Lenny's Newsletter](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)

**Leaderboards and leagues:**
- **Learning time rose 17%** after launch.
- **Highly engaged learners roughly tripled** (defined as 1+ hour a day, 5 days a week).
- **D1 and D7 retention rose with statistical significance.**
- Source: [Lenny's Newsletter](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)
- League structure:
  - There are 10 tiers, with Diamond at the top. Leagues reset weekly on Sunday, with promotion and demotion.
  - Learners are matched with others of similar study habits in a similar time zone.
  - A Diamond Tournament runs for the top 10.
  - Guardrails: learners can opt out by making their profile private, and illegitimate XP leads to removal.
  - A 2018 test found that "a little competition" worked for many learners.
  - Source: [Duolingo blog: Leagues & Leaderboards](https://blog.duolingo.com/duolingo-leagues-leaderboards/)
- **XP rebalancing (June 2024):** Duolingo raised XP for lessons along the path, so that leaderboards rewarded real learning over "XP farming". A partial adjustment added about **1.1M learning minutes a day**; the full adjustment added about **1.8M a day**. — [Duolingo blog: Time Spent Learning Well](https://blog.duolingo.com/time-spent-learning-well)
- Duolingo has said openly that XP and leaderboards invite gaming the system:
  - Monthly Challenges moved from XP-based to Quest-based because learners were "gaming the system to earn XP in bulk".
  - The post states that "XP grinding can happen".
  - Total Sessions was dropped as a metric because it "was biased towards people who were grinding on shorter, easier sessions".
  - Shorter lessons did **not** raise time spent learning well, and ultimately hurt it.
  - Source: [Duolingo blog: Time Spent Learning Well](https://blog.duolingo.com/time-spent-learning-well)

**Streaks:**
- The share of DAU with a streak of 7+ days grew almost **3x**, to more than half of DAU. The streak-saver notification was the first big streak win; no figure was published for it. Reaching a 10-day streak correlated with much lower drop-off, though Duolingo notes this is partly selection bias. — [Lenny's Newsletter](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)
- **Separating the daily goal from the streak (A/B test):**
  - **+3.3% relative D14 retention** and **+1% daily active learners**.
  - The share of daily learners on a streak grew **10.5%** within 20 days.
  - A year later, just over half of daily learners had a 7+ day streak, against about a third the year before.
  - Source: [Duolingo blog: Improving the streak](https://blog.duolingo.com/improving-the-streak)
- **Streak Wager (2017):** learners stake gems on keeping a 7-day streak. It produced statistically significant gains in D1, D7 and D14 retention, with **D7 up 14%**, the largest. — [Duolingo blog, Kai Herng Loh, 10 May 2017](https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals)
- **Weekend Amulet (2017):** this protects the streak over a weekend. Learners who were offered it were **4% more likely to return a week later** and **5% less likely to lose their streak**. Weekend DAU otherwise drops 5–10%. — [Duolingo blog, 2017](https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals)
- **More than 600 streak experiments** had been run by about 2024. The guest on the podcast summarised here (a Duolingo PM) reported two qualitative results, with no magnitudes published:
  - Changing a button from "Continue" to **"Commit to my goal"**, and letting users choose their streak goal, both "significantly increased retention".
  - Retention is most fragile in the **first 7 days**.
  - The same guest cautioned that streaks "can't make up for a weak product".
  - Source: [Lenny's Newsletter: Behind the product, Duolingo streaks](https://www.lennysnewsletter.com/p/behind-the-product-duolingo-streaks)
- **Streak Revival event (June 2026):** **15.4M learners** revived lost streaks, including nearly **8M** who had no active streak when it began. This shows that a one-off amnesty can reactivate lapsed users at scale. — [Duolingo Q2 2026 shareholder letter (SEC 8-K)](https://www.sec.gov/Archives/edgar/data/0001562088/000162828026053299/q2fy26duolingo6-30x26share.htm)
- **Independent RCT on streaks in education:**
  - Setting: Peru, Conecta Ideas maths platform, grades 4–6, about 60,000 students randomised.
  - Result: highlighting streaks increased platform use **and significantly improved math achievement** compared with control. Streak messages worked mainly on the intensive margin (how much existing users used the platform). Personalised reminders worked better on the extensive margin (getting students to use it at all).
  - Authors: Aulagnon, Cristia, Cueto and Malamud. Published as NBER w34173 and in *Economics of Education Review* 2025.
  - I did not obtain exact effect sizes.
  - Sources: [NBER w34173](https://www.nber.org/papers/w34173); [GRADE summary](https://grade.org.pe/en/publicaciones/streaks-to-success-the-effects-of-highlighting-streaks-on-student-effort-and-learning/)

**Push notifications and the owl:**
- Duolingo ran "dozens of small and medium wins" on notifications through A/B tests and a bandit algorithm. Its guardrail: notification volume could not rise without strong justification and **CEO approval**. — [Lenny's Newsletter](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)
- **Peer-reviewed method:** Yancey & Settles, "A Sleeping, Recovering Bandit Algorithm for Optimizing Recurring Notifications" (KDD 2020).
  - It optimises millions of daily practice reminders.
  - Key insight: **"fresh" templates, not recently seen, have more effect**, so novelty decays and each template needs a recovery period.
  - The replication dataset holds 200M reminder notifications sent over 35 days.
  - Sources: [Paper PDF](https://research.duolingo.com/papers/yancey.kdd20.pdf); [Duolingo Research](https://research.duolingo.com/)
  - I could not extract the paper's online DAU lift figure (see Gaps).

**Hearts → Energy (2025):**
- Free users used to have 5 hearts, lost on mistakes. The new Energy system gives **25 energy points that drain on every exercise**. Energy is refilled by watching ads, spending gems or subscribing. Duolingo said learners were "already doing more" under Energy than under Hearts. — [AOL/news coverage](https://www.aol.com/news/duolingo-bringing-energy-language-learning-120004759.html); [Duolingo blog: Energy](https://blog.duolingo.com/duolingo-energy/)
- The change drew a strong backlash, including Change.org petitions to restore hearts. Critics argue the cap exists mainly to sell Super/Max subscriptions, which give unlimited energy. — [Android Authority](https://www.androidauthority.com/quitting-duolingo-energy-system-3599842/); [Change.org petition](https://www.change.org/p/duolingo-hearts-not-energy)
- The Q2 2026 letter mentions Energy only in a bookings comparison: the year-ago quarter included Energy's initial rollout. — [Q2 2026 letter](https://www.sec.gov/Archives/edgar/data/0001562088/000162828026053299/q2fy26duolingo6-30x26share.htm)

**Friend Quests and social features:**
- In Friend Quests, learners now pick the friend they partner with each week rather than being matched at random. Duolingo also tested where to place the Friends feature (sidebar next to Leaderboards vs. profile page); the outcome was not found. — [Duolingo blog: Friends features](https://blog.duolingo.com/friends-social-features/)

**Investor metrics:**

| Metric | Q2 2025 | Q2 2026 |
|---|---|---|
| DAU | 47.7M | **58.7M** (+23%) |
| MAU | 128.3M | **140.6M** (+10%) |
| DAU/MAU (my calculation) | ≈37.2% | **≈41.7%** |
| Paid subscribers | 10.9M | 12.7M |

- CURR reached **84%, an all-time high**, up about 1 point year on year.
- Other items in the Q2 2026 letter:
  - Retention, learning and monetisation are all optimised through an ongoing A/B process called "the Green Machine".
  - Social media brings in more than 1B organic impressions per quarter.
  - Source: [Duolingo Q2 2026 shareholder letter (SEC)](https://www.sec.gov/Archives/edgar/data/0001562088/000162828026053299/q2fy26duolingo6-30x26share.htm)
- **Q3 2026** (reported 3 Nov 2026):
  - DAU growth "accelerating to **29%** year over year".
  - Revenue about $309M (+14%); paid subscribers about 13.1M. These two figures come from secondary reports.
  - Management is prioritising "teaching quality and user growth" and preserving "the quality of the free experience".
  - Source: [Finviz/press release](https://finviz.com/news/414652/duolingo-reports-third-quarter-2026-results)

**Qualitative critique:**
- An arXiv case study, "When Gamification Spoils Your Learning", documents learners misusing Duolingo's gamification by chasing XP and streaks at the expense of learning. — [arXiv 2203.16175](https://arxiv.org/pdf/2203.16175)

### Inferences
- **The biggest reported wins, in order of evidence strength:**
  1. Leaderboards and leagues: +17% learning time, 3x highly engaged learners.
  2. Streak-protection and streak-commitment mechanics: wager +14% D7; amulet +4% one-week return; goal separation +3.3% D14.
  3. Bandit-tuned notifications.
  4. Choosing CURR as the North Star.
- **Failed mechanics:** copied puzzle-game mechanics (the moves counter) and referral rewards did little.
- **The consistent design principle:** protect existing habits with forgiveness tools (freezes, amulets, revival events) rather than only punishing lapses.
- **Duolingo's own course correction:** in 2024 it re-weighted XP so that **learning** scores more, rather than raw activity. EDUVENTURE should define its core metric the same way from day one, for example "minutes on curriculum-aligned questions at appropriate difficulty", not raw battles or XP.
- **Energy and hearts show a monetisation-friction pattern** that is ethically risky for children. A mechanic that stops learning unless the player pays or watches ads would draw the same criticism Prodigy faced (see section 2).

### Gaps
- Not published, or not found: magnitudes for:
  - streak freeze;
  - the iOS streak widget (a "+60% commitment" figure circulates but I could not confirm it in a primary source);
  - Friend Quests and daily quests;
  - the owl mascot's personality-driven notifications ("Duo's passive-aggressive reminders").
- The KDD 2020 paper's online-test DAU lift was not extracted; the PDF was not parsed.
- No Q3 2026 absolute DAU or MAU, and no CURR, was found in this pass.
- The S-1 (2021) figures were not retrieved.

---

## 2. Prodigy Math: how it combines an RPG with maths, what studies show, and the criticism

### Takeaway
Prodigy wraps maths practice in a fantasy RPG: a wizard avatar, turn-based battles in which each spell requires a correct answer, collectible pets, and a paid membership that unlocks cosmetics, pets and areas. Its efficacy evidence is mostly vendor-commissioned and correlational (ESSA Tier 3). Its business model drew a formal 2021 complaint to the FTC from the Campaign for a Commercial-Free Childhood (CCFC, now Fairplay) and about 20 other groups.

### Cited Findings
- **Efficacy evidence, all vendor-run or vendor-commissioned:**
  - An independent analysis commissioned by Prodigy rated Prodigy Math as meeting **ESSA Tier 3**, the lowest evidence tier ("promising").
  - Prodigy lists a Johns Hopkins case study, whose findings I could not retrieve.
  - Source: [Prodigy research page](https://www.prodigygame.com/research)
- **Council Bluffs, Iowa (grades 5–6):** each extra hour answering Prodigy questions was associated with a **0.73-point** higher state-test scale score. Prodigy notes this is **correlational**. — [Prodigy blog: Council Bluffs](https://www.prodigygame.com/blog/council-bluffs)
- **State white papers (Florida, Pennsylvania, Texas):** users outpaced state averages. These are vendor-produced and correlational. — [Florida white paper](https://marketing.prodigygame.com/Florida-Efficacy-Report-White-Paper.pdf); [Texas white paper](https://marketing.prodigygame.com/Texas-Grade-3-Efficacy-Report-White-Paper.pdf)
- **CCFC/Fairplay FTC complaint (19 Feb 2021), backed by about 20 groups:**
  - The game is marketed as free but pushes a paid membership, reported at **up to $107 a year**.
  - In a **19-minute test session, CCFC counted 16 membership advertisements and only 4 math problems.**
  - The complaint says the product "does not instruct children on math skills in any way – it only offers practice".
  - It says claims that Prodigy "improves grades and test scores" lack evidence.
  - It asked the FTC to bar deceptive claims and manipulative design.
  - Sources: [Fairplay press release](https://fairplayforkids.org/feb-19-2021-advocates-to-ftc-prodigy-math-game-preys-on-kids-and-families/); [MediaPost](https://www.mediapost.com/publications/article/360719/ftc-urged-to-investigate-prodigy-math-game-over-al.html); [Axios](https://www.axios.com/2021/02/19/prodigy-math-game-ftc-complaint)
- Prodigy disputed the allegations and said **95% of players use the free version**. — [EdWeek, Feb 2021](https://www.edweek.org/technology/popular-interactive-math-game-prodigy-is-target-of-complaint-to-federal-trade-commission/2021/02)
- Senator Markey and Representative Castor urged the FTC to investigate. The FTC confirmed it had received the complaint; no public action was found. — [CCFC newsletter](https://ccfc.salsalabs.org/ccfcfebruary2021); [EdWeek](https://www.edweek.org/technology/popular-interactive-math-game-prodigy-is-target-of-complaint-to-federal-trade-commission/2021/02)
- Similar criticism of the premium model was raised when Prodigy targeted UK schools. — [inkl/Guardian syndication](https://www.inkl.com/news/maths-app-targeting-uk-schools-is-criticised-over-premium-model)

### Inferences
- Prodigy is the **closest existing analogue to EDUVENTURE**: an RPG in which battles are won by answering questions. Its main risks are a **low ratio of questions to game time** and **membership upsells shown to children inside gameplay**.
- EDUVENTURE should publish its own ratio of questions answered to minutes played.
- EDUVENTURE should keep purchase prompts out of child gameplay, for example by sending them to parent or teacher channels only.
- Malaysian schools and parents would likely react to these practices as US advocates did.

### Gaps
- The details of Prodigy's pet, evolution and membership mechanics come from general knowledge and were not verified against a primary source in this pass. Fairplay's page describing them could not be fetched because of a certificate error.
- No independent RCT of Prodigy was found.
- No published Prodigy retention or engagement metrics (DAU, retention) were found.

---

## 3. Kahoot, Quizlet, Blooket and Gimkit: game modes, timers, competition, economies and collectibles

### Takeaway
Kahoot's live, timed, speed-scored competition is the best-studied of these tools. A 93-study review found mostly positive effects on learning performance, classroom dynamics, attitudes and anxiety. The same review flags **time pressure, speed scoring that discourages reflection, guessing, and fear of losing** as real harms. Blooket (collectible "Blooks" and many game modes) and Gimkit (in-game cash and upgrades) have only small case studies behind them.

### Cited Findings
- **Wang & Tahir (2020), *Computers & Education* 149, 103818: review of 93 studies.**
  - Kahoot! had positive effects on learning performance, classroom dynamics, students' and teachers' attitudes, and students' anxiety. Some studies found little or no effect.
  - Challenges reported by students:
    - "stressful time-pressure for giving answers, not enough time to answer, afraid of losing";
    - "hard to catch up if an incorrect answer had been given".
  - Challenges reported by teachers:
    - "scoring based on how quickly the students answer reducing student reflection";
    - it can "cause some students to guess without thinking";
    - "some students can have a problem with failing a quiz".
  - Source: [Goldsmiths repository](https://research.gold.ac.uk/id/eprint/39435)
- **Kahoot-published studies (vendor, small, short):**
  - In a three-week study of two Grade 9 classes, the Kahoot class showed about twice the progress, and scored **23.6/25 on engagement vs 17.0/25** for the comparison class. The researchers did not isolate which elements caused the effect.
  - A quasi-experiment with 61 university students found Kahoot students outperformed the comparison group on both immediate and delayed post-tests.
  - Sources: [Kahoot blog, Oct 2026](https://kahoot.com/blog/2026/10/21/kahoot-impact-game-based-learning-helps-learning-stick-with-middle-school-students/); [Kahoot blog, Jul 2026](https://kahoot.com/blog/2026/07/10/game-based-learning-vocabulary/)
- **Gimkit:**
  - A descriptive study in dental hygiene courses found Gimkit motivated students and "promoted self-determination". — [CJDH](https://files.cdha.ca/profession/journal/2844.pdf)
  - A 2026 classroom action-research study compared individual and team modes. It frames team modes as building relatedness, in self-determination terms. — [APJDD 2026](https://das.org.sg/wp-content/uploads/2026/02/APJDD-13-1-2026-MASRI.pdf)
- **Blooket:** small qualitative or case studies report higher motivation and more interactive classrooms, credited to competition and point rewards. The authors note that research on Blooket remains limited. — [PMC study](https://pmc.ncbi.nlm.nih.gov/articles/PMC12341505); [UINSI journal](https://journal.uinsi.ac.id/index.php/dinamika_ilmu/article/download/10268/3238)
- No controlled study was found that isolates in-game currency or collectibles (Gimkit cash, Blooket Blooks) as a motivational mechanic. — same sources as above.

### Inferences
- Speed-scored timers raise excitement but cut reflection and **disadvantage slower, struggling or second-language learners**. This matters for Malaysia's multilingual classrooms (BM, English, Chinese, Tamil).
- Possible responses for EDUVENTURE:
  - offer a timer-free or "accuracy-first" mode;
  - give bonus points for streaks of correct answers rather than raw speed;
  - let players correct a mistake later in a battle.
- Team or co-op modes, as in Gimkit's team modes, are a low-risk way to add relatedness (see section 6, Sailer & Homner).

### Gaps
- Quizlet: no study of its game modes (Match, Live, Learn) was retrieved in this pass.
- No retention or DAU data from Blooket, Gimkit or Quizlet.
- No rigorous RCTs of Blooket or Gimkit.

---

## 4. Khan Academy and Khan Academy Kids: mastery points, badges, avatars and characters

### Takeaway
The evidence links Khan Academy **usage dosage** (about 30 minutes a week) to learning gains, ranging from correlational to modest causal effects. There is **no controlled evidence** that its badges or energy points cause engagement or learning. Badge-seeking studies show that students chase "repetitive" badges, which is a gaming risk.

### Cited Findings
- **Khan's own analysis (2022–23), about 350K students in grades 3–8:** students averaging **30+ minutes a week** (18+ hours a year) grew about **20% more than expected** on NWEA MAP Growth, effect size **0.36**. This compares users with projected norms, not a control group, and is classed as ESSA Tier 3. — [Khan Academy annual report: efficacy](https://2023-2024.annualreport.khanacademy.org/efficacy-results); [Khan blog](https://blog.khanacademy.org/new-study-finds-every-minute-spent-on-khan-academy-can-lead-to-learning-gains)
- **MAP Accelerator (2020–21), about 180K students:** users scored **0.26 SD** higher in maths growth than similar students using it for under 15 minutes a week. — [EDM 2022](https://educationaldatamining.org/EDM2022/proceedings/2022.EDM-industry-track.112/index.html)
- **An RCT on mastery learning with Khan Academy** (Oreopoulos et al., 2024) reported **+0.12 to 0.22 SD** in end-of-year maths scores. A PNAS study (2026, about 200K students) found that 30 more minutes a week was associated with **+0.09 to 0.18 SD**. Both were seen via the Khan blog and not verified against the papers. — [Khan blog: Multiple studies](https://blog.khanacademy.org/multiple-studies-show-khan-academy-drives-learning-gains-evidence-for-our-platforms-effectiveness); [Khan Efficacy Results, Nov 2024](https://blog.khanacademy.org/?p=18194)
- **Badges:**
  - A learning-analytics study of 291 university students using Khan Academy at UC3M found that the intention to earn badges was **greater for repetitive badges**. — [Ruipérez-Valiente et al., LAK 2016](https://webs.um.es/jruiperez/papers/conferences/2016_LAK_Intentionality_postprint.pdf)
  - A diary study of 81 students (Khan Academy and Codecademy) found that students used badges in **nine distinct ways**, and that not all students cared about badges. — [White Rose eprint](https://eprints.whiterose.ac.uk/139776/1/1_s2.0_S1071581918305123_main.pdf)

### Inferences
- **Mastery structure plus enough dosage** carries the learning effect, more than badges do. EDUVENTURE's battle-question engine should track mastery per skill and aim for about 30 minutes a week of on-curriculum practice. Cosmetic rewards should sit on top of mastery.
- Badges for repeated actions invite grinding. Badges are better tied to new mastery or to effortful challenge.

### Gaps
- Khan Academy Kids: no evidence was found on how its characters or avatars affect engagement or learning.
- No experimental data on Khan's energy points or avatar unlocks.

---

## 5. Entertainment-game loops (Pokémon, Clash Royale and Clash of Clans, Animal Crossing): intrinsic vs manipulative

### Takeaway
Collection and exploration loops can produce large real-world behaviour change, but it fades over time: Pokémon GO added about 1,473 steps a day among engaged players in the short term. Timer and chest loops (Clash Royale) drive daily returns by deliberately combining **scarcity, uncertainty and pay-to-skip**. Randomised paid rewards (loot boxes) correlate with problem gambling and are regulated as gambling in Belgium. They are the most ethically dangerous loop for a children's product.

### Cited Findings
- **Pokémon GO (Althoff, White & Horvitz, JMIR 2016):**
  - About 32K users; wearable step data combined with search logs.
  - Highly engaged players added **about 1,473 steps a day**, a **more than 25% increase**, over about 30 days.
  - Estimated **144 billion** extra US steps.
  - The authors describe the benefit as **short-term**.
  - Sources: [PMC5174727](https://pmc.ncbi.nlm.nih.gov/articles/PMC5174727); [Microsoft Research](https://www.microsoft.com/en-us/research/publication/influence-pokemon-go-physical-activity-study-implications/)
- **Clash Royale chest loop (2016 analyses):**
  - A free chest every **4 hours**, plus a crown chest after **10 crowns**, pulls players back daily.
  - Only **one chest unlocks at a time and only four can be stored**, which paces play without an energy system.
  - "Uncertainty of hitting their chest timers drives players to come back, **and pay to speed up the timers**."
  - Deconstructor of Fun describes waiting as the key difference from Hearthstone-style loops: it monetises through both card upgrades and timer speed-ups.
  - Sources: [Game Developer: Deconstructing Clash Royale (Adam Telfer)](https://www.gamedeveloper.com/business/deconstructing-clash-royale); [Deconstructor of Fun](https://www.deconstructoroffun.com/blog//2016/02/clash-royale-next-billion-dollar-game.html)
  - These are analytical interpretations with no internal Supercell data. A methodological critique calls the chest-retention claim a hypothesis rather than an established fact. — [Medium: How to deconstruct games better](https://medium.com/strike-the-pixels/how-to-deconstruct-games-better-490f5e9b19bb)
- **Loot boxes and children:**
  - Zendle & Cairns's surveys found that the more people spend on loot boxes, the more severe their problem gambling. This is correlational: loot boxes either cause problem gambling or exploit it.
  - The UK Gambling Commission estimated **up to 31% of 11–16-year-olds** had opened a loot box in the past year. A later survey found **23%** had paid real money for one.
  - **Belgium (2018)** classified paid loot boxes as illegal gambling. The UK House of Lords recommended banning sales to children.
  - Compliance with loot-box rules worldwide has been "generally poor" (Copenhagen PhD thesis, 2025).
  - Sources: [Zendle, UK Parliament written evidence](https://committees.parliament.uk/writtenevidence/83/html/); [IBA](https://ibanet.org/article/B389FF33-433B-4ACB-BFC1-42CFCE22B60A); [Leon Xiao thesis, ITU 2025](https://en.itu.dk/-/media/EN/Research/PhD-Programme/PhD-defences/2025/Leon-Xiao.pdf)

### Inferences
- **Mostly intrinsic and acceptable for EDUVENTURE:**
  - Collection and completion: a "Pokédex" of creatures earned by mastering topics.
  - Evolution tied to mastery milestones.
  - Exploration.
  - Gentle real-time daily events in the Animal Crossing style, for example a daily visitor or a seasonal festival tied to Malaysian holidays such as Hari Raya, CNY and Deepavali, with **no penalty for missing them**.
  - Clan or guild co-op.
- **Manipulative or high-risk for children:**
  - Paid random rewards (loot boxes or gacha).
  - Pay-to-skip timers.
  - Limited chest slots designed to create a feeling of loss.
  - Energy caps that block learning unless the player pays.
  - FOMO-heavy limited-time offers.
- **Safe alternative:** use deterministic or "earned, visible-odds, non-purchasable" chests. Let timers gate cosmetic rewards only, never access to learning.

### Gaps
- Animal Crossing: no empirical study on its retention or check-in design was retrieved; the inference above rests on design analysis only.
- Clash of Clans clans: no published data on their retention effect was retrieved.
- No study of gacha mechanics in educational games.

---

## 6. Meta-analyses of gamification in education: which elements help, do nothing or harm

### Takeaway
Gamification has a **small-to-medium positive effect**:
- cognitive outcomes g ≈ 0.49 (Sailer & Homner); learning performance g = 0.504 (Bai, Hew & Huang);
- smaller and less stable effects on motivation and behaviour.

Effects are stronger with **game fiction (narrative)** and **social interaction, especially competition combined with collaboration**. The "points, badges, leaderboards" (PBL) trio alone can be neutral, and in some classroom studies it has harmed intrinsic motivation and exam scores.

### Cited Findings
- **Sailer & Homner (2020), *Educational Psychology Review* 32:77–112:**
  - About 38 publications and 40 experiments.
  - **Cognitive g ≈ 0.49** (19 comparisons, N = 1,686). This effect was stable in high-rigour studies.
  - **Motivational g ≈ 0.36** and **behavioural g ≈ 0.25**. These were **less stable**, and the figures come from secondary summaries.
  - Moderators:
    - **Game fiction and social interaction** significantly moderated behavioural outcomes.
    - **Competition plus collaboration** may also be valid for motivational outcomes.
  - Sources: [Uni Augsburg OPUS record](https://opus.bibliothek.uni-augsburg.de/opus4/frontdoor/index/index/docId/109056); [Springer DOI 10.1007/s10648-019-09498-w](https://doi.org/10.1007/s10648-019-09498-w)
- **Bai, Hew & Huang (2020), *Educational Research Review* 30:**
  - 30 interventions from 24 quantitative studies, about 3,202 participants.
  - Learning performance **g = 0.504**.
  - Heterogeneity was noted as a caveat.
  - Leaderboards, points and levels are the most frequently used elements.
  - Sources: [ICCE 2019 conference version](https://v0.apsce.net/icce/icce2019/proceedings/paper_136.pdf); [Frontiers in Psychology 2023 citing it](https://www.frontiersin.org/articles/10.3389/fpsyg.2023.1253549/full)
- **Hanus & Fox (2015), *Computers & Education*: negative result.**
  - A 16-week course gamified with **a leaderboard and badges** was compared with the same course without them.
  - Over time the gamified group reported **lower** intrinsic motivation, satisfaction and empowerment.
  - The gamified course **lowered final exam scores**, operating through lowered intrinsic motivation.
  - Source: [summary in UCLA SMHP review](https://www.smhp.psych.ucla.edu/pdfdocs/gamil.pdf)
- **Mekler et al. (2017), *Computers in Human Behavior*: null result.**
  - Points, levels and leaderboards had **no effect on intrinsic motivation or competence**.
  - They did increase **quantity** of output: levels and leaderboards produced the most tags.
  - The authors conclude these elements act as **extrinsic incentives that raise output quantity only**.
  - Source: [Mekler et al. 2017 PDF](https://glassmanlab.seas.harvard.edu/annotated_works/mekler17.pdf)

### Inferences
**Ranking of game elements for EDUVENTURE, by evidence:**
1. **Positive:** narrative or game fiction (EDUVENTURE's MMORPG world is a strong asset); co-op combined with competition, such as guild-vs-guild battles; immediate feedback; mastery-linked progression.
2. **Neutral or quantity-only:** points, levels and leaderboards on their own.
3. **Risky (can harm motivation or learning):** public leaderboards and badges in compulsory class settings, especially for low performers.

To make leaderboards safer:
- use small, matched cohorts (Duolingo-style leagues);
- support relative and personal-best views;
- let players opt out;
- weight the scoring toward learning.

### Gaps
- I could not access the full Sailer & Homner PDF (connection refused), so the motivational and behavioural g values and the per-element moderator results are from secondary sources and need verification.
- Bai et al.'s per-element subgroup effects were not confirmed.
- No meta-analysis specific to children under 12 or to Southeast Asia was found.

---

## 7. Self-Determination Theory and the overjustification effect: implications for reward design

### Takeaway
Expected, task-contingent tangible rewards reliably **undermine** later free-choice intrinsic motivation, and **more so for children** (task-contingent: d ≈ −0.44 for children vs −0.25 for undergraduates). **Positive informational feedback enhances** it (d = +0.33), though less so for children. Reward systems for a children's game should therefore lean on competence feedback, autonomy (choice) and relatedness (co-op), and should not pay children for showing up.

### Cited Findings
- **Deci, Koestner & Ryan (1999), *Psychological Bulletin* 125(6):627–668: meta-analysis of 128 studies.** — [Paper PDF (UW copy)](https://depts.washington.edu/techdocs/papers/deciExtrinsicRewardsAndIntrinsicMotivation99.pdf); [SDT follow-up in Review of Educational Research, 2001](https://selfdeterminationtheory.org/SDT/documents/2001_DeciKoestnerRyan.pdf)
  - **Free-choice intrinsic motivation was significantly undermined by:**
    - engagement-contingent rewards: **d = −0.40**;
    - completion-contingent rewards: **d = −0.36**;
    - performance-contingent rewards: **d = −0.28**;
    - all rewards, all tangible rewards and all expected rewards (each also significant).
  - **Self-reported interest was undermined by** engagement-contingent (d = −0.15) and completion-contingent (d = −0.17) rewards.
  - **Positive feedback enhanced** free-choice behaviour (**d = +0.33**) and self-reported interest (**d = +0.31**).
  - **Children vs college students:**

    | Reward type (free-choice measure) | Children | College students |
    |---|---|---|
    | Engagement-contingent | d = −0.43 (39 studies, after outliers removed) | — |
    | Task-contingent overall | **d = −0.44** | **d = −0.25** |
    | Verbal rewards | **d = +0.11, not significant** (7 studies) | **d = +0.43** (14 studies) |

    The paper concludes that tangible rewards are "more detrimental for children than college students".
  - Expected and unexpected tangible rewards differed significantly on free-choice motivation (Qb = 10.62, p < .001). Unexpected rewards are the less harmful category.

### Inferences
**For EDUVENTURE's reward design (my synthesis of the SDT evidence and sections 1–6):**
- **Competence:**
  - Give informational feedback on mastery, for example "You've mastered fractions: Level 3".
  - Use adaptive difficulty, so that battle wins reflect real skill.
  - Show progress toward mastery.
  - Avoid controlling language such as "You must play to keep your pet alive".
- **Autonomy:**
  - Let players choose quests, subjects and streak goals. Duolingo's "choose your streak goal" finding is consistent with this.
  - Offer optional leaderboards and cosmetic self-expression through chibi avatar customisation.
- **Relatedness:**
  - Guild or class co-op raids, friend quests, and teacher or parent recognition.
  - Sailer & Homner's competition-plus-collaboration finding supports this.
- **Rewards:**
  - Prefer **unexpected, surprise rewards** and **cosmetic, non-pay-to-win items**.
  - Avoid large, expected, per-task tangible payouts. "Coins per correct answer" is a completion-contingent reward, which is the risk zone for children.
  - Do not tie real-world prizes to raw play time.

### Gaps
- No SDT study specific to MMORPG-style educational games for Malaysian or Southeast Asian students was found.
- Cameron & Pierce's counter-meta-analyses, which dispute the undermining effect, were not reviewed in this pass.

---

## 8. Synthesis: mechanic catalogue with evidence and an ethics flag for a children's audience

### Takeaway
The strongest evidence-backed retention mechanics are those that **protect habits**, **add social structure** and **tie progress to mastery**. The highest ethical risks sit where monetisation meets children: paid random rewards, pay-to-skip timers, energy paywalls, and in-game upsells to children.

### Cited Findings
| Mechanic | Who uses it | Measured effect | Evidence quality | Child-ethics flag |
|---|---|---|---|---|
| Streak + streak-saver reminder | Duolingo; Peru Conecta Ideas RCT | Share of DAU with 7+ day streaks up ~3x ([Lenny](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)); RCT: more use **and** higher maths achievement ([NBER](https://www.nber.org/papers/w34173)) | Company + RCT | Medium: streak-loss anxiety. Pair with forgiveness tools. |
| Streak protection (freeze, weekend amulet, revival event) | Duolingo | Amulet: +4% one-week return, −5% streak loss; revival: 15.4M revived ([blog](https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals); [Q2'26](https://www.sec.gov/Archives/edgar/data/0001562088/000162828026053299/q2fy26duolingo6-30x26share.htm)) | Company A/B | Low; reduces anxiety. Do not sell freezes for real money to children. |
| Commitment device (streak wager, "commit to my goal", choose your goal) | Duolingo | Wager +14% D7; goal-choice "significantly" raised retention ([blog](https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals); [Lenny](https://www.lennysnewsletter.com/p/behind-the-product-duolingo-streaks)) | Company A/B | Low if the wager uses in-game currency only |
| Separate daily goal from streak | Duolingo | +3.3% D14, +1% DAU ([blog](https://blog.duolingo.com/improving-the-streak)) | Company A/B | Low |
| Weekly leagues with matched cohorts | Duolingo | +17% learning time, 3x highly engaged, D1/D7 up ([Lenny](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)) | Company A/B | Medium: social comparison; Hanus & Fox negative in class settings. Make it opt-out and use small cohorts. |
| XP weighted toward learning | Duolingo (2024) | +1.1–1.8M learning minutes a day ([blog](https://blog.duolingo.com/time-spent-learning-well)) | Company A/B | Low; reduces grinding |
| Bandit-optimised reminders with novelty decay | Duolingo | Many "small and medium wins"; fresh templates outperform ([KDD'20](https://research.duolingo.com/papers/yancey.kdd20.pdf)) | Peer-reviewed + company | Medium: guilt-tripping mascot. Cap volume; send to parents for young children. |
| Energy or hearts cap with pay-to-refill | Duolingo, Prodigy-like models | "Learners do more" (company) vs strong backlash ([Android Authority](https://www.androidauthority.com/quitting-duolingo-energy-system-3599842/)) | Company claim + anecdote | **High**: blocks learning behind payment or ads |
| RPG battle where answers power attacks, pets, membership | Prodigy | 0.73 scale points per hour (correlational, vendor) ([Prodigy](https://www.prodigygame.com/blog/council-bluffs)) | Vendor, Tier 3 | **High** where membership is upsold in-game: 16 ads vs 4 problems in 19 minutes ([Fairplay](https://fairplayforkids.org/feb-19-2021-advocates-to-ftc-prodigy-math-game-preys-on-kids-and-families/)) |
| Live timed speed-scored quiz | Kahoot, Blooket, Gimkit | Mostly positive across 93 studies; but time-pressure stress, guessing, fear of losing ([Wang & Tahir](https://research.gold.ac.uk/id/eprint/39435)) | Systematic review | Medium; offer an accuracy-first mode |
| Mastery progression + dosage target | Khan Academy | 30 min/week → ~20% above expected growth, ES 0.36 (correlational); RCT +0.12–0.22 SD ([Khan](https://2023-2024.annualreport.khanacademy.org/efficacy-results)) | Correlational + RCT | Low |
| Badges | Khan Academy, many others | Students chase repetitive badges; mixed use ([Ruipérez-Valiente](https://webs.um.es/jruiperez/papers/conferences/2016_LAK_Intentionality_postprint.pdf)) | Case studies | Low–medium (grinding) |
| Narrative and fiction + co-op/competition | General | Significant moderators of behavioural outcomes ([Sailer & Homner](https://opus.bibliothek.uni-augsburg.de/opus4/frontdoor/index/index/docId/109056)) | Meta-analysis | Low |
| Collection and exploration (Pokémon) | Pokémon GO | +1,473 steps a day, >25%, short-term ([JMIR](https://pmc.ncbi.nlm.nih.gov/articles/PMC5174727)) | Observational, peer-reviewed | Low if not monetised randomly |
| Timed chests, slot limits, pay-to-skip | Clash Royale | Daily return driver per analysts ([Game Developer](https://www.gamedeveloper.com/business/deconstructing-clash-royale)) | Analyst opinion | **High** with pay-to-skip |
| Paid loot boxes or gacha | Many F2P games | Spending correlates with problem gambling; illegal in Belgium ([Zendle](https://committees.parliament.uk/writtenevidence/83/html/)) | Correlational + regulatory | **Very high: avoid** |
| Expected tangible per-task rewards | Generic "coins per answer" | Undermine intrinsic motivation, worse in children (d ≈ −0.44) ([Deci et al.](https://depts.washington.edu/techdocs/papers/deciExtrinsicRewardsAndIntrinsicMotivation99.pdf)) | Meta-analysis | Medium; use informational feedback and surprise rewards |

### Inferences
**Recommended core loop for EDUVENTURE (synthesis):**

| Pace | Elements |
|---|---|
| Daily | A short battle quest at the right difficulty; a streak with generous freezes earned in-game; a gentle daily world event that carries no penalty. |
| Weekly | A small matched league or guild challenge combining co-op and competition, with opt-out. |
| Long-term | Mastery-gated creature or pet evolution, a collection log and a narrative arc. |

**Monetisation, if any:** cosmetic only, never randomised, never in the child's gameplay flow, and parent-gated.

**Primary metric:** next-day retention of current players, as in Duolingo's CURR, combined with a learning-weighted time metric, so that the team does not repeat Duolingo's XP-grinding problem.

### Gaps
- There are no published retention numbers for a children's educational MMORPG. EDUVENTURE will need its own A/B testing.
- Malaysia-specific data (school-hours vs home usage, device constraints, PDPA rules on children's data) was outside the scope of this pass.
