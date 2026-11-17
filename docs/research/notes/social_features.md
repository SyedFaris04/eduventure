# Social and Competitive Features in Learning Games: Engagement Evidence and Safety for Minors

Research date: November 2026. Context: EDUVENTURE, a 3D chibi educational MMORPG for Malaysian students. Its age bands are under 13 (preset chat, friends by code), 13–17 (filtered chat), and 18+. Clans, friends and leaderboards are planned.

## 1. Friend streaks and friend quests (Duolingo Friend Streak and Friends Quests, Snapchat Snapstreaks): retention effect and where the line is

### Takeaway
Duolingo's own data links Friend Streak to a 22% higher daily-lesson completion rate, but the figure is correlational and no primary Friends Quests figure was found. Regulators now name communication "streaks" as an excessive-use feature that should be off by default for minors (EU DSA Art. 28 guidelines, July 2025). The line runs between a streak about *learning together*, capped and forgiving, and a streak about *messaging each other* that resets punitively and can be bought back.

### Cited Findings
- Learners with at least one Friend Streak are 22% more likely to complete their daily lesson, and the likelihood rises with each additional Friend Streak. A streak can be shared with up to 5 friends. At the time of writing, 57% of users had at least one friend. Published 20 September 2024; development began January 2024. — [Duolingo Blog, "Product lessons from Friend Streak"](https://blog.duolingo.com/product-lessons-friend-streak/)
- Design points from the same post:
  - Friends do not have to complete a task together. It is "studying alongside" a friend.
  - The cap of 5 was a deliberate choice, because larger groups added complexity for little gain.
  - The main bottleneck was sending the first invite.
  - Motivation relies on notifications and nudges.
  - The post does not discuss safety or privacy. — [Duolingo Blog](https://blog.duolingo.com/product-lessons-friend-streak/)
- One case-study site claims the Duolingo S-1 says one-third of DAUs take part in a Friend Streak. This is unverified against the filing. — [servinity case study](https://servinity-site.pages.dev/case-studies/duolingo/)
- Friends Quests: the only figure found is an aggregator claim of a "10% increase in app opens per user", with no primary source or method. Treat it as unreliable. — [Gitnux](https://gitnux.org/duolingo-user-statistics/)
- Personal streaks at Duolingo, as told by former CPO Jorge Mazal:
  - Current-user retention (CURR) rose 21% over four years, and daily churn among the best users fell by more than 40%.
  - The share of DAU with a 7+ day streak grew almost 3x, to more than half of DAU.
  - Mazal says the link between a 10-day streak and lower dropoff is "largely correlation and selection bias". — [Lenny's Newsletter, "How Duolingo reignited user growth"](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)
- Duolingo's original friends-based leaderboard was "not particularly effective". A referral program offering a free month raised new users by only 3%. — [Lenny's Newsletter](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)
- Snapstreak mechanics: the counter ticks up by one for each consecutive day two people snap each other, and resets to zero the moment a day is missed. — [AddictionHelp](https://www.addictionhelp.com/social-media-addiction/snapchat-addiction/)
- A March 2026 Bits of Freedom study of 300 young people aged 13–21 found:
  - 86% actively maintain Snapstreaks.
  - 25% have paid about €0.99 to restore a broken streak.
  - Respondents described the streak as a status symbol that causes anxiety when threatened.
  - This comes from a secondary summary and was not verified against the original report. — [pulse.bot summary](https://www.pulse.bot/consumer-tech/blogs/new-study-reveals-how-young-people-are-influenced-by-gamification-features-on-snapchat-386b9eae-9eb9-4fb1-8d38-08092e9e2791)
- Snapchat-specific mental-health research is "thin on the ground". Most studies cover social media broadly. — [NeuroLaunch](https://neurolaunch.com/snapchat-and-mental-health/)
- EU Commission guidelines on protecting minors under DSA Article 28 (14 July 2025) recommend:
  - disabling by default features that contribute to excessive use, such as communication "streaks", ephemeral content, read receipts, autoplay and push notifications;
  - removing persuasive design features aimed mainly at engagement.

  They apply to all online platforms accessible to minors except micro and small enterprises. They are non-binding, but the Commission will use them to assess compliance. — [European Commission](https://digital-strategy.ec.europa.eu/en/library/commission-publishes-guidelines-protection-minors); [Hogan Lovells](https://hlc.com/en/publications/the-longawaited-eu-guidelines-on-article-281-dsa-what-online-platforms-must-know); [Taylor Wessing](https://www.taylorwessing.com/en/insights-and-events/insights/2025/07/rd-european-commission-guidelines-on-protection-of-minors-under-the-digital-services-act)

### Inferences
- Where the line sits, based on the contrast between Duolingo and Snapchat plus the EU guidance:
  - **Acceptable for minors:** a shared *learning* goal; a small cap (Duolingo uses 5); opt-in; forgiving mechanics such as freezes or grace days; no paid restore; no late-night "your streak is dying" pushes.
  - **Over the line:** a streak driven by social obligation to *message* a specific person, a hard reset, a paid restore, and urgency notifications.
- For under-13s in EDUVENTURE, a weekly cadence fits better than a daily one. Examples are "your friend group completed 5 lessons this week" or a shared friend-quest progress bar that pauses rather than resets. This avoids daily-obligation pressure and the "streak" design the EU names. Streak notifications should be off by default for minors.
- Duolingo's 22% figure is likely inflated by selection effects. Already-engaged users form friend streaks, as the CPO admits for personal streaks. Budget for a smaller causal effect.

### Gaps
- No primary-source retention figure for Duolingo Friends Quests was found.
- No peer-reviewed study was found that measures anxiety or compulsive use caused specifically by Snapstreaks.
- It is unknown whether Duolingo applies different Friend Streak rules to under-13 or Duolingo Kids accounts.

## 2. Leagues and leaderboards: how Duolingo leagues work, their effect, education research, and safer designs

### Takeaway
Duolingo leagues are weekly XP leaderboards with promotion and demotion across 10 tiers. Duolingo's former CPO reports +17% learning time and 3x as many highly engaged learners after launch. Education research is mixed: leaderboards motivate some learners and can harm others through social comparison and stereotype threat. Relative leaderboards (showing nearby ranks), cohorts of similar skill, cooperative or team boards, and personal-progress framing are the evidence-backed mitigations.

### Cited Findings
- **Duolingo league mechanics** (official post, 3 May 2023):
  - There are 10 leagues, up from the original 5, with Diamond at the top.
  - A new league starts every week, on Sunday in the learner's own time zone.
  - Learners are grouped with others who have similar study habits and a similar time zone, from across all courses.
  - Learners climb up or down based on study effort.
  - The top 10 in Diamond can enter a 3-round Diamond Tournament.
  - Leaderboards were first tested in 2018, when Duolingo found that "a little competition worked for a lot of learners".
  - Opt-out is via "Make My Profile Public" in settings.
  - Accounts with illegitimate XP gains are removed. — [Duolingo Blog, "How do Duolingo Leaderboards work?"](https://blog.duolingo.com/duolingo-leagues-leaderboards/)
- Cohort size of 30, ranked by XP over 7 days, with promotion and demotion zones: this comes from a third-party breakdown. The official post does not state the cohort size. — [Deconstructor of Fun, Duolingo leagues mechanic](https://duolingo.deconstructoroffun.com/mechanics/leagues)
- **Effect of leagues:**
  - Overall learning time rose 17%.
  - "Highly engaged learners" (about 1 hour a day, 5 days a week) tripled.
  - D1 and D7 retention improved with statistical significance.
  - Users are matched with others at a similar engagement level from the prior week and are opted in automatically. — [Lenny's Newsletter (Jorge Mazal)](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)
- **Christy & Fox (2014)**, *Computers & Education* 78:66–77:
  - 80 female undergraduates took a math test after seeing a male-dominated, female-dominated or no leaderboard.
  - The female-dominated leaderboard group scored *lower* than the male-dominated group but reported higher academic identification.
  - The study shows that leaderboard composition triggers social-comparison and stereotype effects. — [dblp record](https://dblp1.uni-trier.de/rec/journals/ce/ChristyF14.html); [Montana State ScholarWorks copy](https://scholarworks.montana.edu/server/api/core/bitstreams/e360fce0-18c6-497b-bea1-495dbdaa95c8/content)
- **Absolute vs relative leaderboards** (2021 study, gamified online class):
  - Absolute board: the top third were more intrinsically motivated, but this did not raise engagement or performance.
  - Relative board: all learners were equally motivated and engaged.
  - The authors suggest a student at the bottom of an absolute board may disengage. — [Emerald, *Internet Research*](https://www.emerald.com/intr/article/33/7/1/178330); [HKU repository](https://hub.hku.hk/bitstream/10722/368255/1/content.pdf); [EdUHK](https://repository.eduhk.hk/en/publications/examining-effects-of-different-leaderboards-on-students-learning-/)
- Prior research on leaderboard *position* conflicts. Some earlier work found that low-ranked learners reported higher competitive effort and better retention than high-ranked ones. — [HKU repository](https://hub.hku.hk/bitstream/10722/368255/1/content.pdf)
- Relative performance feedback had a positive effect on *low-achieving* primary-school students, while high achievers did not change their behaviour. — [Gutenberg School of Management & Economics, Mainz Discussion Paper](https://download.uni-mainz.de/RePEc/pdf/Discussion_Paper_2111.pdf)

### Inferences
- **Safer design pattern for EDUVENTURE**, synthesised from the above:
  1. **Small cohorts** of about 20–30, matched on *prior-week engagement* rather than ability, as Duolingo does. A low performer then competes with peers of similar effort.
  2. **Rank on effort** (XP from lessons and practice, capped per day), not on test scores, so ability is not publicly ranked.
  3. **Relative display:** show only the 2–3 ranks above and below the player, not the full board.
  4. **No demotion for under-13s.** Use promotion-only tiers or a "stay" zone, and pair it with a personal-best board.
  5. **Team, clan and class boards** as the main public competition (intergroup competition, see Section 3).
  6. **Opt-out**, plus no real names or photos on boards. Use the avatar and an auto-generated nickname.
- Leaderboards should not show gender, school name or location. That data enables stereotype-threat effects (Christy & Fox) and is a privacy risk.
- Duolingo's league lift comes from adult and teen users. Do not assume it transfers to children aged 7–12.

### Gaps
- Landers' leaderboard studies (for example Landers & Landers 2014, Landers et al. 2017 on goal-setting) were not retrieved in this session. They are not cited here, so the claim that "leaderboards work like goal-setting" needs a source.
- No official Duolingo source confirms the cohort size of 30 or the exact promotion and demotion counts.
- No study was found on leaderboards for children under 13 in an MMO context.

## 3. Cooperative play: evidence, examples, and retention

### Takeaway
The Johnson & Johnson meta-analyses show cooperative goal structures produce markedly higher achievement than competitive or individualistic ones. Cooperation combined with intergroup competition also beats individual work. This supports clan or class goals and shared bosses over individual ranking. Platform-specific retention data for co-op modes (Kahoot, Gimkit, Prodigy) was not found.

### Cited Findings
- **Johnson, Maruyama et al. (1981), 122 studies:**
  - Cooperation vs competition: effect size .78. The average cooperative participant scored about .75 SD above the average competitive one. Vote count 65–8 in favour of cooperation, with 36 showing no difference.
  - Cooperation vs individualistic effort: effect size .78; vote count 108–6.
  - Cooperation with intergroup competition vs individualistic effort: effect size .50; vote count 20–1.
  - Interpersonal competition vs individualistic effort: no significant difference. — [MAAW summary of Johnson & Maruyama 1981](https://maaw.info/ArticleSummaries/ArtSumJohnsonMaruyama1981.htm)
- A later series (231 studies, 37,422 college and graduate students) found g = .42 for cooperative vs competitive structures and g = .36 for cooperative vs individualistic. — [University of Minnesota Conservancy](https://conservancy.umn.edu/server/api/core/bitstreams/d484edf9-acfb-418e-ae59-010722bfce7a/content)
- Johnson, Johnson & Stanne (2000) found that all eight cooperative learning methods they studied had a significant positive effect on achievement. — [typeset.io](https://typeset.io/pdf/having-your-cake-and-eating-it-too-maximizing-achievement-3hmpmzvc8i.pdf)
- A different summary lists other values (cooperation .73, intergroup .56, competition .09). It could not be verified, so the figures above are treated as primary. — [Brainscape](https://www.brainscape.com/flashcards/johnson-01-13693599/packs/21470251)
- A PRISMA systematic review in *iJET* found that cooperative models combined with gamification and game-based learning strengthen academic, personal and social skills. Kahoot is among the tools studied. — [iJET](https://online-journals.org/index.php/i-jet/article/view/40035)
- A conceptual paper analyses 14 Kahoot modes, including Team mode. It notes that few studies examine the modes separately. — [Athens Journal of Education (2026)](https://www.athensjournals.gr/education/2026-7052-AJE-Muchuweni-02.pdf)

### Inferences
- "Cooperation with intergroup competition" (d = .50 vs individual) maps directly onto **clan vs clan** or **class vs class** weekly challenges. It keeps competitive energy while each child's contribution is pooled, so no individual is ranked last.
- Shared boss or raid mechanics should use **positive interdependence plus individual accountability**, the core Johnson & Johnson conditions. Every member's correct answers damage the boss, and each member's contribution is visible to the group only as a positive ("+12 hits"), never as a bottom rank.
- Class-wide challenges started by a teacher, such as a whole class defeating a "term boss", combine the cooperative effect with the teacher channel in Section 4.

### Gaps
- No primary data was found on how Gimkit team modes, Kahoot Team mode, Blooket modes or Prodigy's co-op features affect retention or learning.
- No study was found that isolates co-op mechanics as a *retention* driver, as opposed to learning, in learning apps.
- A search summary mentioned a 2026 *Educational Psychology Review* gamification meta-analysis. It reportedly found mostly positive effects on motivation, with only 4 studies reporting negative effects, and recommended limiting excessive competition in favour of personal progress and cooperative tasks. The paper itself was not located or verified, so it is not cited above.

## 4. Classroom and teacher integration as an engagement and adoption driver

### Takeaway
Prodigy grew bottom-up through free teacher accounts and class codes, then converted that into district relationships through rostering integrations (Clever). Families pay for premium cosmetics, a freemium model that advocacy groups criticise. Teachers need free class setup, assignment of content, and class-level reports.

### Cited Findings
- Almost 500,000 teachers across North America used Prodigy Math free in 2021. — [Coda competitive analysis](https://coda.io/@nila/competitive-analysis/prodigy-education-2)
- Prodigy integrated with the Clever Library, "gaining traction classroom by classroom", and scaled to more than 8,300 districts in one year. — [Clever case study](https://www.clever.com/?p=12110)
- Prodigy had about 100 million registered users and 9 million monthly active users by January 2021. — [Wikipedia, Prodigy Math Game](https://www.wikipedia.com/wiki/Prodigy_Math_Game)
- Teachers and students get the core experience free, and families can buy premium memberships for in-game items. In 2021 Fairplay criticised Prodigy's freemium model as "manipulative" and said it "promote[s] inequity". — [Wikipedia](https://www.wikipedia.com/wiki/Prodigy_Math_Game); [Coda analysis](https://coda.io/@nila/competitive-analysis/prodigy-education-2)
- Prodigy offers a free teacher dashboard, parent accounts for tracking progress, and free district access with teacher PD. — [Prodigy administrators page](https://www.prodigygame.com/administrators); [Prodigy teacher overview deck](https://de.slideshare.net/ProdigyGame/prodigy-teacher-overview-presentation)
- Minecraft Education keeps multiplayer inside a school's Office 365 tenant, joined by a picture-based join code, with a maximum of 30 players per game. This classroom-scoped model avoids open-world strangers. — [Microsoft Learn](https://learn.microsoft.com/en-us/training/modules/craft-game-based-learning-classroom/unique-features-minecraft-education); [Microsoft Learn: multiplayer](https://learn.microsoft.com/es-mx/training/modules/work-remotely-minecraft-student-ambassador-program/multiplayer-game)

### Inferences
- **Teacher feature set** for EDUVENTURE, based on how Prodigy and Minecraft Education are built:
  - free teacher accounts with a class code and roster import (in Malaysia, via MOE DELIMa / Google Workspace for Education or equivalent);
  - teacher-assigned quests mapped to the KSSR/KSSM syllabus;
  - class and team leaderboards that the teacher can hide;
  - per-student and per-skill reports;
  - a teacher-controlled class-only "instance", like Minecraft's tenant-scoped worlds.
- The teacher channel doubles as a safety channel. A class instance means under-13s mainly interact with known classmates, which fits the "friends only by code" rule.
- Avoid copying Prodigy's model of putting premium cosmetics in front of children inside a school-endorsed product. It draws criticism and may conflict with Malaysian school procurement expectations.

### Gaps
- No primary data was found on how Kahoot, Blooket or Gimkit spread through teachers (adoption funnels, teacher-to-teacher referral rates).
- It was not verified how MOE Malaysia's DELIMa platform supports third-party app rostering.

## 5. Parent features: progress reports and weekly emails

### Takeaway
No rigorous study was found showing that parent progress emails increase children's usage of a learning app. The broader evidence is that school-to-parent digital communication helps attainment, attendance and homework completion *only when it is two-way and personalised*.

### Cited Findings
- A 2021 systematic review of 29 studies found:
  - promising evidence that school–parent communication by phone, text or email improves attainment, attendance and homework completion, but only when messages are two-way and personalised;
  - no conclusive evidence that parental engagement alone, through non-technology approaches, improves outcomes;
  - a caution that receiving emails or texts does not guarantee parents engage, and that many findings rely on parents' perceptions. — [Durham University repository](https://durham-repository.worktribe.com/OutputFile/1243648)
- A WPI thesis tested parent notifications in the ASSISTments tutoring system. Its results were not retrieved. — [WPI digital repository](https://digital.wpi.edu/downloads/6t053g12r?locale=en)
- Texting studies reported a 10% drop in chronic absenteeism when parents received consistent attendance information. This is a vendor summary of Hechinger coverage, so treat it cautiously. — [PowerSchool blog](https://www1.powerschool.com/?p=3026)
- Prodigy promotes parent accounts as a way to get "insights into their classroom progress". — [Prodigy about page](https://www.prodigygame.com/about-prodigy)

### Inferences
- Parent reports should be **specific and actionable**. An example: "Aisyah mastered fractions this week; try asking her about X". They should include a two-way element, such as a parent sending an in-game encouragement sticker or setting a goal. Generic usage emails probably add little.
- For under-13s, the parent channel is also the **consent and control** channel: approving friends and adjusting chat and time limits. That makes the parent account worth building even if the retention effect is uncertain.

### Gaps
- No primary data was found from Duolingo, Prodigy, Khan Academy Kids or similar apps on whether weekly parent emails raise child retention.

## 6. Safety for minors in online games: what established products do, grooming risks, and 2024–2026 policy changes

### Takeaway
Children's MMOs that ran safely for years (Toontown, Club Penguin) used **menu-based preset chat** with no free text for strangers, and free chat only with real-world friends. Roblox's 2025–2026 changes are now the reference point, driven by lawsuits and state attorney-general settlements:
- mandatory age checks (facial estimation or ID) before any chat;
- age-banded chat;
- adult-to-minor chat blocked unless there is a verified real-world link;
- no image or video sharing.

Malaysia's Online Safety Act 2025 adds a local regulatory layer.

### Cited Findings
**Preset chat models**
- Toontown's SpeedChat is a hierarchical, menu-based chat for game interaction with all players that prevents divulging personal information. Free chat was allowed only with real-life acquaintances through "Secret Friends" codes. — [Toontown design paper (Chulalongkorn mirror)](https://www.cp.eng.chula.ac.th/~vishnu/gameResearch/design/toontownJournal.pdf); [Gamasutra/Game Developer postmortem](https://www.gamedeveloper.com/disciplines/postmortem-disney-online-s-toontown)
- "Since there is a finite set of possible sentences, it is impossible to communicate any personal information." — [Game Developer postmortem](https://www.gamedeveloper.com/disciplines/postmortem-disney-online-s-toontown)
- Randy Farmer's account of the origins of Toontown's chat describes SpeedChat as a menu of innocuous pre-built sentences. — [Habitat Chronicles, March 2007](https://habitatchronicles.com/2007/03)
- In Club Penguin, by default you could not type chat to strangers. It used a context-sensitive cascading menu of canned phrases. This comes from an informal secondhand source. — [MetaFilter](https://www.metafilter.com/125206/OKBabyCupid)

**Minecraft Education**
- Multiplayer is limited to the same Office 365 tenant and joined by a four-picture join code.
- After 5 failed join attempts, a player must wait, which stops code guessing.
- Hosts can refresh the code.
- Games are capped at 30 players. — [Minecraft Education support](https://edusupport.minecraft.net/hc/en-us/articles/360047555531); [Microsoft Learn](https://learn.microsoft.com/en-us/training/modules/craft-game-based-learning-classroom/unique-features-minecraft-education)

**Roblox, July 2025 (Trusted Connections)**
- Users 13+ can unlock unfiltered chat and Party Voice only after age estimation.
- Teens 13–17 can add an 18+ user as a Trusted Connection only through real-life channels: an in-person QR code scan or Contact Importer.
- All conversations, including those between Trusted Connections, are still proactively monitored for harm, including grooming signals.
- Photo and video sharing in chat is not supported at any age. — [Roblox newsroom, July 2025](https://about.roblox.com/newsroom/2025/07/advancing-safety-on-roblox-with-age-based-communication); [Roblox Help](https://en.help.roblox.com/hc/sv/articles/37725513985812-Unlocking-Trusted-Connections-Expressive-Chat-Features-Party-Voice-chat-without-filters); [TechCrunch](https://techcrunch.com/2025/07/17/roblox-introduces-new-safeguards-for-teens-including-age-estimation-tech/)

**Roblox, November 2025 (age checks for all chat)**
- All users must pass an age check (government ID or AI face estimation) before using chat.
- Face images are deleted after users are assigned an age bucket.
- The buckets are Under 9, 9–12, 13–15, 16–17, 18–20 and 21+. Users can chat only within their own and similar groups.
- Chat is off by default for under-9s unless a parent consents.
- Chat is filtered for under-13s to block personal information.
- Enforcement started in Australia, New Zealand and the Netherlands in December 2025, and worldwide in early January 2026.
- Roblox claims accuracy within 1–2 years for ages 5–25 but declined to give an accuracy rate. Experts are cautious.
- At that point Roblox faced at least 35 lawsuits alleging grooming and exploitation. — [CNN](https://www.cnn.com/2025/11/18/tech/roblox-ai-age-verification-youth-safety); [TechCrunch](https://techcrunch.com/2025/11/18/roblox-will-require-all-users-to-perform-age-checks-to-access-chat-from-january); [Forbes](https://www.forbes.com/sites/conormurray/2025/11/18/roblox-rolls-out-facial-recognition-technology-to-estimate-users-ages-amid-lawsuits-over-child-safety/)

**Roblox, 2026 (state settlements)**
- Alabama: $12.2M settlement in April 2026.
  - All users must go through age checks by facial estimation or ID, with the rollout reported from 1 May.
  - Chat is blocked until age verification is complete.
  - Adult-to-minor contact is restricted. — [WBRC](https://www.wbrc.com/2026/04/21/alabama-reaches-122-million-settlement-with-roblox-forces-safety-reforms/); [Forbes, Apr 2026](https://www.forbes.com/sites/conormurray/2026/04/21/roblox-settles-with-alabama-over-child-safety-concerns-but-still-faces-state-lawsuits/)
- West Virginia: about $11M settlement. It includes an alert to minors the first time they enter a private chat. — [WV Attorney General](https://ago.wv.gov/article/west-virginia-reaches-11-million-settlement-roblox-prompts-major-child-safety-overhaul)
- Further settlements by state attorneys general:
  - Nevada (about $12M) and South Dakota (13 July 2026).
  - Kansas (more than $10M in commitments).
  - About $54M in total across five states by July 2026, per an aggregator. Sources disagree on totals, so verify against the AG releases. — [tech-insider.org](https://tech-insider.org/roblox-lawsuit-2026/); [Malwarebytes, Apr 2026](https://www.malwarebytes.com/blog/news/2026/04/roblox-clamps-down-on-chats-and-age-checks-as-legal-pressure-builds)
- Pending matters:
  - Louisiana sued in August 2025.
  - Arkansas sued Roblox and Discord.
  - Ohio's AG sought to lead a class action (August 2026).
  - Arizona's AG asked a court on 16 October 2026 to compel Roblox to hand over child-safety records.
  - Roblox denies the allegations. — [TechCrunch, Aug 2025](https://techcrunch.com/2025/08/15/louisiana-attorney-general-sues-roblox); [survivorsrights.com, Oct 2026](https://survivorsrights.com/roblox-exploitation-lawsuit-guide/)

**Grooming risk evidence**
- UK police reports obtained by ITV showed an 87% rise in incidents linked to Roblox, with alleged victims as young as 5 and 11-year-olds most frequent.
- An NSPCC policy officer said perpetrators go on gaming platforms to seek out children.
- Grooming commonly involves "off-linking", moving the chat to private or encrypted apps. — [STV News](https://news.stv.tv/world/its-where-predators-get-children-mums-roblox-warning-over-grooming-risks)
- Offenders may use gifts or trades to build trust. — [CEOP / Thinkuknow](https://www.ceopeducation.co.uk/parents/articles/gaming)
- A WeProtect Global Alliance report (June 2026) uses a 4Cs framework (Content, Contact, Conduct, Commerce). It separates risk factors, such as unmoderated voice chat, from harms such as grooming. — [WeProtect report PDF](https://www.weprotect.org/wp-content/uploads/Online-Gaming-and-Risks-to-Children-Report.pdf)

**Malaysia regulation**
- The Online Safety Act 2025 (Act 866) came into force on 1 January 2026. It covers social media and messaging platforms with more than 8 million Malaysian users. — [Gandhi Syahida](https://www.gandhisyahida.com.my/post/the-online-safety-act-2025-what-malaysia-s-new-internet-rules-mean-for-you); [Consumer Rights Wiki](https://consumerrights.wiki/w/Malaysia_Online_Safety_Act_2025_(ONSA))
- An under-16 social media account ban is enforced through eKYC with MyKad, passport or national digital ID. One source dates the Child Protection Code to 1 June 2026; earlier coverage said only "2026". — [Techwire Asia](https://techwireasia.com/2025/11/malaysia-social-media-ban-under-16-2026/); [Mayer Brown](https://www.mayerbrown.com/en/insights/publications/2025/12/malaysias-proposed-social-media-ban-for-children-how-it-compares-with-australia-and-singapore); [Lowyat](https://www.lowyat.net/2025/374103/malaysia-to-bar-social-media-accounts-for-under-16s-from-2026/)
- ISIS Malaysia warned that eKYC could compromise privacy and anonymity. — [ISIS Malaysia](https://www.isis.org.my/2025/11/24/malaysias-bid-to-bar-under-16s-from-social-media-using-id-checks-stokes-privacy-fears/)

### Inferences
- EDUVENTURE's planned model (preset chat and friends-by-code for under-13s, filtered chat for 13–17) matches the Toontown and Club Penguin pattern, which is the strongest historical precedent. **Additions suggested by Roblox's 2025–26 changes and settlement terms:**
  1. Do not allow **any chat between 18+ and under-18 accounts** unless there is a verified real-world link, such as a parent-approved code or a teacher-created class. Roblox now requires this after lawsuits.
  2. **Age-banded matchmaking and visibility.** Under-13s should not see or be seen by 18+ players in social spaces. University students (18+) should live in a separate shard or zone.
  3. **No free-text channels that carry personal information or links** for any minor. Block numbers, URLs and handles for other apps, because off-linking is the main grooming vector.
  4. **No player-to-player gifting or trading** between unconnected users, and none between adults and minors. Gifts are a known grooming tactic, and Robux transfer limits were part of Roblox's settlements.
  5. **No image or video upload in chat**, and no custom text on clan names or banners without moderation.
  6. Easy **report and block** on every avatar, plus proactive monitoring of filtered chat for grooming patterns, plus a first-private-chat warning for minors (WV settlement).
  7. **Clans for under-13s** should be class-scoped or teacher- and parent-approved, with preset-chat-only clan channels.
- Age assurance: since accounts are likely created through schools or parents, school rostering gives stronger age assurance than self-declaration. Then decide whether facial estimation or MyKad eKYC is needed for the 13–17 to 18+ boundary. It is unverified whether Act 866 applies to a game below the 8M-user threshold. It likely does not apply at launch, but the Roblox settlements set the de facto standard.

### Gaps
- Animal Jam's chat system (it uses filtered and dictionary-based chat modes) was not covered by retrieved sources. It needs verification.
- Roblox "Sentinel" (its open-sourced grooming-detection system) was not found in retrieved sources.
- No 2025–2026 NSPCC, 5Rights or Common Sense Media report specific to in-game chat was retrieved.
- It is unconfirmed whether Malaysia's Online Safety Act or Child Protection Code covers online games or edtech.

## 7. Social sharing for marketing: share cards and achievement images that are safe for minors

### Takeaway
Duolingo's Year in Review ends in a single shareable *image* card summarising stats, a Spotify Wrapped-style mechanic. No source was found on how Duolingo handles under-13 sharing. A safe design for minors is an image-only card with no real name, school, location or friend list, shared through the parent for under-13s.

### Cited Findings
- Duolingo's 2025 Year in Review ends with a shareable card that bundles the user's stats. It was designed to work as an image rather than a link. — [Android Authority](https://www.androidauthority.com/duolingo-year-in-review-2025-3621782)
- Duolingo's children's privacy profile:
  - Common Sense Privacy rates its practices acceptable but flags advertising in the free tier.
  - Users under 16 reportedly receive non-personalised ads.
  - For child users, profile discovery is reportedly restricted to exact-username search.
  - These come from third-party trackers, not Duolingo statements. — [Common Sense Privacy](https://privacy.commonsense.org/evaluation/duolingo); [ConductAtlas: under-16 ads](https://conductatlas.com/platform/duolingo/duolingo-privacy-policy/provision/CA-P-022546/users-under-16-receive-non-personalized-advertisements/); [ConductAtlas: child profile discovery](https://conductatlas.com/platform/duolingo/duolingo-privacy-policy/child-user-profile-discovery-restricted-to-exact-username/)

### Inferences
- **Safe share-card pattern:**
  - Show the chibi avatar, aggregate stats (lessons, subjects mastered, boss defeats) and a clan or class *team* badge.
  - Leave out real names, school names, locations, friend names, usernames or friend codes, and any QR or deep link that leads to the child's profile.
  - Render it as a static image with no tracking link for under-13s.
  - For under-13s, the "Share" button goes to the parent's account or a downloadable image saved through the parent, never directly to social apps. This also aligns with Malaysia's under-16 social media ban.
- Class or clan "Wrapped" cards, for example "Class 5 Amanah defeated 40 bosses this term", give teachers and parents a shareable artefact without exposing any individual child.

### Gaps
- No source was found on whether Duolingo restricts Year in Review sharing for child accounts.
- No data was found on the marketing or virality effect of share cards for children's apps specifically.
