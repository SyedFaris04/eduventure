# Ethics and regulation limiting engagement design in children's games and apps (Malaysia, app stores, worldwide), status as of November 2026

Scope: EDUVENTURE is a free-to-play educational 3D chibi MMORPG for ages about 7 to university. It has in-game gold earned by learning, a shop, streaks, missions and a virtual pet. Leaderboards and chat are planned, and monetisation is undecided. Launch order: web, Google Play and the Apple App Store in Malaysia, then worldwide.

Source-confidence convention used in these notes:
- **[verified]**: fetched or search-confirmed in this research session (Nov 2026).
- **[background]**: a well-established fact from the public record before mid-2026, cited to its canonical primary URL but NOT re-fetched this session. The report writer should treat these as reliable but spot-check exact wording.
- This is not legal advice.

---

## Q1. Which dark patterns do regulators and researchers name for children, and which specific mechanics?

### Takeaway
Regulators (FTC, the EU Commission, the UK ICO) and researchers (Radesky et al. 2022, 5Rights) converge on the same mechanics:
- artificial time pressure (countdown timers, "buy now")
- streaks and social-obligation loops
- infinite scroll and autoplay
- attention-recapturing notifications
- characters that pressure the child (parasocial pressure)
- "lures" to keep playing or to buy
- virtual currencies that obscure real cost
- randomized paid rewards
- design that makes purchases easy by accident

US enforcement so far has hit unauthorized or accidental purchases and default-on chat hardest (Epic, $520M).

### Cited Findings
- **FTC staff report "Bringing Dark Patterns to Light" (Sept 2022).** It groups dark patterns into four types:
  - design that induces false beliefs;
  - design that hides or delays material information;
  - design that leads to unauthorized charges;
  - design that obscures or subverts privacy choices.

  It specifically flags games and children's apps: virtual currencies that obscure real cost, and designs making it easy for kids to buy without parental authorization. [background] — [FTC report](https://www.ftc.gov/reports/bringing-dark-patterns-light)
- **FTC v. Epic Games (Fortnite), December 2022: $520M total.** [background] — [FTC press release](https://www.ftc.gov/news-events/news/press-releases/2022/12/fortnite-video-game-maker-epic-games-pay-more-half-billion-dollars-over-ftc-allegations)
  - $275M civil penalty for COPPA violations, the largest COPPA penalty at that time. The violations included collecting under-13 data without parental consent and turning **voice and text chat on by default**, which exposed kids to strangers and harassment.
  - $245M in refunds for dark patterns: a counter-intuitive button layout that caused unwanted purchases with one press, charges without authorization, and locking accounts of users who disputed charges.
  - The order requires voice and text chat to be **off by default** for children and teens unless a parent (for under-13s) or the teen opts in.
- **FTC v. Cognosphere (HoYoverse, Genshin Impact), January 2025: $20M.** [background] — [FTC press release](https://www.ftc.gov/news-events/news/press-releases/2025/01/genshin-impact-game-developer-will-be-banned-selling-lootboxes-teens-under-16-without-parental-consent-pay-20-million-fine)
  - The FTC alleged that loot-box odds and real-money costs were obscured through multiple virtual currencies, and that the company violated COPPA.
  - The order bans selling loot boxes to under-16s without parental consent and requires odds disclosure and real-money price disclosure.
- **FTC v. Age of Learning (ABCmouse), September 2020: $10M**, an edtech precedent. It concerned subscriptions that were hard to cancel and renewal terms that were not disclosed. [background] — [FTC press release](https://www.ftc.gov/news-events/news/press-releases/2020/09/childrens-online-learning-program-abcmouse-pay-10-million-settle-ftc-charges-illegal-marketing-billing-practices)
- **Radesky et al., "Prevalence and Characteristics of Manipulative Design in Mobile Applications Used by Children," JAMA Network Open (2022).** [background] — [JAMA Netw Open](https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2793493)
  - The study coded 135 apps played by 160 children aged 3–5 and found manipulative design in roughly 80% of them.
  - Its four named categories are:
    - **parasocial relationship pressure**: a character urges the child to keep playing or to buy;
    - **fabricated time pressure**;
    - **navigation constraints**: ads or upsells the child cannot easily exit;
    - **lures**: rewards or prompts that encourage longer play or purchases.
  - Apps played by children from lower-socioeconomic-status families showed more manipulative design.
- **5Rights Foundation, "Disrupted Childhood: The Cost of Persuasive Design" (2018).** [background] — [5Rights](https://5rightsfoundation.com/resource/disrupted-childhood-the-cost-of-persuasive-design/)
  - Persuasive features it names: notifications as "summons", variable (random) rewards, endless feeds and infinite scroll, autoplay, streaks and social obligation/reciprocity, and popularity metrics such as likes and follower counts.
  - It argues these exploit children's developmental vulnerabilities.
- **EU DSA Article 28 Guidelines (14 July 2025).** [verified] — [Hunton summary](https://www.hunton.com/privacy-and-cybersecurity-law-blog/european-commission-issues-guidelines-on-the-protection-of-minors); [Commission](https://digital-strategy.ec.europa.eu/en/library/commission-publishes-guidelines-protection-minors)
  - Features that promote excessive use, such as **communication streaks**, should be **off by default**.
  - The guidelines also name indefinite scrolling, notifications timed to regain attention, **countdown timers and "buy now" prompts**, intermediate virtual currencies, and loot boxes.
- **EU Digital Fairness Act proposal (11 November 2026), named addictive-design practices.** It lists autoplay, unprompted notifications, **streak-style engagement incentives**, and features that simulate interpersonal relationships. It would let users **switch off streaks and autoplay**. [verified] — [Osborne Clarke](https://www.osborneclarke.com/insights/proposed-eu-digital-fairness-act-targets-addictive-design-dark-patterns-and-unfair); [gHacks](https://www.ghacks.net/2026/11/11/eu-proposes-digital-fairness-act-to-ban-dark-patterns-and-let-users-turn-off-streaks-and-autoplay/)
- **Google Play Families Policy**, on in-app purchases for child audiences, lists as a violation: "Not providing a distinction between the use of virtual game coins versus real-life money". [verified] — [Google Play Families Policy](https://support.google.com/googleplay/android-developer/answer/9893335)

### Inferences
These EDUVENTURE features map directly onto named patterns:
- **Streaks**: named by the EU guidelines and the DFA proposal.
- **Pet that is sad or neglected if the child does not log in**: Radesky's parasocial pressure, and the DFA's "simulated relationships".
- **Missions with countdown timers**: fabricated time pressure.
- **Push reminders**: summons and notifications that regain attention.
- **Gold or gems shown without a real-money price**: obscured cost.
- **Shop prompts by characters**: parasocial or purchase pressure.

The safe design is the inverse of each: no loss on missing days, no character guilt, no timers on purchases, and real prices always shown. Notifications should be opt-in and parent-controlled.

### Gaps
- Exact percentages and sub-sample figures in Radesky 2022 were not re-fetched; confirm against the paper.
- The 2023 5Rights update ("Disrupted Childhood" second edition) was not checked.

---

## Q2. Loot boxes: legal status, evidence of a gambling link, and whether an educational game should avoid randomized rewards

### Takeaway
Paid randomized rewards are now banned for minors in Brazil (in force 17 March 2026) and in Belgium (since 2018, weakly enforced). They also carry:
- an M rating in Australia (since 22 September 2024);
- PEGI 16+ in Europe (from June 2026);
- mandatory odds disclosure on both Apple and Google;
- an FTC ban without parental consent for under-16s (Genshin order).

The EU Digital Fairness Act proposal (November 2026) would ban paid random rewards for minors EU-wide, but it is not yet law. The research link to problem gambling is consistent but correlational.

**Recommendation:** an educational game for ages 7+ should have **no paid randomized rewards at all**. That includes rewards bought with purchasable gold. Free randomized rewards earned through learning are broadly lawful, but they should be designed to avoid gambling cues.

### Cited Findings
- **Brazil, Law 15.211/2025 ("ECA Digital"), Art. 20.** [verified] — [Mattos Filho](https://www.mattosfilho.com.br/en/unico/brazils-eca-digital/); [Demarest](https://www.demarest.com.br/en/eca-digital-nova-lei-de-protecao-de-criancas-e-adolescentes-no-ambiente-digital/); [PocketGamer.biz](https://www.pocketgamer.biz/brazil-bans-loot-boxes-for-under-18s-in-online-child-safety-measure)
  - It prohibits loot boxes in electronic games aimed at children and adolescents, or likely to be accessed by them.
  - It entered into force on **17 March 2026**.
  - Decree No. 12,880/2026 lists loot boxes among products and services off-limits to minors.
- **Conflicting description of the Brazil rule:** Digital Policy Alert describes a regulated model (no empty boxes, odds disclosure) rather than a ban. Check the statute text. [verified] — [Digital Policy Alert](https://digitalpolicyalert.org/event/33580-bill-on-protection-of-children-and-adolescents-in-digital-environments-including-obligations-for-electronic-games-law-no-15211-enters-into-force)
- **Brazil enforcement:** a Federal District children's court reportedly ordered game developers and app stores to pay more than R$333M in collective damages over paid loot boxes offered to minors. The date is unconfirmed. [verified as reported] — [Unico](https://www.unico.io/releases/navigating-the-digital-eca-compliance-as-a-growth-driver-in-gaming)
- **Belgium:** in 2018 the Belgian Gaming Commission held that paid loot boxes are games of chance under the 1999 Gaming Act, which makes them illegal without a licence. Enforcement is weak: Xiao (2023) found most top-grossing iPhone games in Belgium still sold loot boxes. [background] — [Xiao, "Breaking Ban," Collabra: Psychology 2023](https://doi.org/10.1525/collabra.57641)
- **Netherlands:** in March 2022 the Council of State (Raad van State) overturned the Kansspelautoriteit's €10M fine on EA over FIFA packs, ruling that the packs were not a separate game of chance. The Dutch government has said it would pursue an EU-level ban. No national ban was found as of 2026. [background for the ruling; verified that no ban was found] — [esportslegal.news overview](https://esportslegal.news/2025/12/11/us-uk-and-eu-loot-box-strategies/)
- **UK:** [verified] — [Lewis Silkin](https://www.lewissilkin.com/insights/2026/02/27/new-tough-measures-brought-in-by-the-asa-on-advertising-loot-boxes-in-the-uk-102mknq); [esportslegal.news](https://esportslegal.news/2025/12/11/us-uk-and-eu-loot-box-strategies/)
  - The government declined to bring loot boxes under gambling law and relies on industry self-regulation: the July 2023 Ukie / industry "Principles and Guidance on Paid Loot Boxes". Among other things, these require that under-18s cannot buy paid loot boxes without parental consent or awareness via technical controls, and that probabilities are disclosed.
  - In February 2026 the ASA issued an enforcement notice on ads for games with paid loot boxes, requiring prominent disclosure, with monitoring after a three-month grace period.
- **Australia:** since **22 September 2024**, the National Classification Scheme guidelines rate games with paid loot boxes at least **M** (not recommended under 15), and games with simulated gambling **R18+**. [background] — [Australian Classification](https://www.classification.gov.au/)
- **PEGI (Europe):** an overhaul ("interactive risk categories") rates games with paid loot boxes at least **PEGI 16**, from June 2026. It also adds descriptors for in-game spending and communication features. [verified] — [Osborne Clarke](https://www.osborneclarke.com/insights/games-loot-boxes-get-16-plus-age-rating-europe-under-pegi-overhaul); [Reed Smith](https://www.reedsmith.com/articles/pegi-launches-interactive-risk-categories-overhauls-age-ratings-for-loot-boxes-in-game-spending-and-communication-features/)
- **EU Digital Fairness Act proposal (11 November 2026):** reported to ban paid random rewards for minors and to require probability disclosure and opt-out tools for all users. It is a proposal and not yet law; it would apply about 12 months after entry into force if adopted. [verified] — [FocusGN](https://focusgn.com/eu-digital-fairness-act-loot-boxes-gambling); [gaming.net](https://www.gaming.net/european-commission-proposes-loot-box-and-virtual-currency-rules/)
- **EU DSA Article 28 guidelines (2025):** minors should not face practices leading to excessive spending, loot boxes or gambling-like practices should not be used, and intermediate virtual currencies should be avoided. [verified] — [Hunton](https://www.hunton.com/privacy-and-cybersecurity-law-blog/european-commission-issues-guidelines-on-the-protection-of-minors)
- **Apple, App Store Review Guideline 3.1.1 (verbatim):** "Apps offering 'loot boxes' or other mechanisms that provide randomized virtual items for purchase must disclose the odds of receiving each type of item to customers prior to purchase." [verified] — [Apple Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- **Google Play Payments policy:** games offering randomized virtual items from a purchase must clearly disclose the odds before, and close in time to, the purchase. [background] — [Google Play Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738)
- **US:** the FTC Genshin order (January 2025) bans loot-box sales to under-16s without parental consent. This is a company-specific order, but it signals the FTC's view under Section 5. [background] — [FTC](https://www.ftc.gov/news-events/news/press-releases/2025/01/genshin-impact-game-developer-will-be-banned-selling-lootboxes-teens-under-16-without-parental-consent-pay-20-million-fine)
- **China:** loot-box odds disclosure has been required since 2017 (Ministry of Culture notice). [background; not re-fetched]
- **Evidence on gambling:**
  - Zendle & Cairns (2018, PLOS ONE, n=7,422 adults) found a significant association between loot-box spending and problem-gambling severity. [background] — [PLOS ONE](https://doi.org/10.1371/journal.pone.0206767)
  - Zendle, Meyer & Over (2019, Royal Society Open Science) found a similar link in older adolescents aged 16–18, with a larger effect in adolescents than adults. [background] — [R Soc Open Sci](https://doi.org/10.1098/rsos.190049)
  - Later systematic reviews (for example, the UK Gambling Commission-funded review used by DCMS in its July 2022 response) call the association "robust and consistent" but cannot establish causation. [background]

### Inferences
- **Paid loot boxes would make EDUVENTURE unlawful in Brazil.** They would also push its rating to PEGI 16 and Australian M, which is incompatible with a 7+ audience and with the Apple Kids Category. They would also clash with DSA guidance. Do not ship paid randomized rewards. That includes randomized items bought with gold, if gold can ever be purchased for money.
- **Free randomized rewards** (for example, a random cosmetic from a quest chest earned by learning) are not caught by any of the rules found, since those target purchase. Guidance for them:
  - show what can drop;
  - avoid near-miss animations, slot-machine visuals and spin wheels (an Australian R18+ "simulated gambling" risk);
  - let duplicates convert to something useful;
  - never sell extra "spins".

  Keep earned gold and any purchasable currency strictly separate. If gold is earn-only and cannot be bought, the shop is outside loot-box and virtual-currency spending rules.

### Gaps
- The exact Brazil Art. 20 wording and the decree's scope (ban versus regulation) were not read in primary text.
- Spain's draft loot-box law status was not found.
- Australian classification URLs were not re-fetched.

---

## Q3. US COPPA Rule as amended in 2025 (compliance April 2026)

### Takeaway
The amended COPPA Rule (16 CFR Part 312) was published on 22 April 2025 and became effective on 23 June 2025. **Compliance was required by 22 April 2026, so it is now fully in force.** Its key additions:
- separate verifiable parental consent (VPC) before disclosing children's data to third parties, including for targeted ads;
- a written data-retention policy with no indefinite retention;
- a written information-security programme;
- expanded notices.

The FTC **did not adopt** the proposed restriction on push notifications and engagement prompts, but it said it remains concerned and could act under FTC Act Section 5.

### Cited Findings
- **Dates:** published in the Federal Register on 22 April 2025; effective 23 June 2025; compliance date 22 April 2026, except §312.11(d)(1), (d)(4) and (g), which are safe-harbor provisions. [verified] — [Federal Register](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule); [Toy Association](https://www.toyassociation.org/PressRoom2/News/2026-News/updated-coppa-rule-requirements-take-effect-april-22.aspx); [Davis Polk](https://www.davispolk.com/insights/client-update/ftc-prioritizes-coppa-enforcement-new-compliance-obligations-take-effect)
- **Separate consent:** operators must get a **separate** parental consent to disclose children's personal information to third parties unless the disclosure is integral to the service. The FTC did not prescribe rigid timing or methods. [verified] — [Latham & Watkins](https://www.lw.com/en/insights/2025/05/ftc-publishes-updates-to-coppa-rule); [Wiley](https://sitepilot12.firmseek.com/client/wiley2/www/printpilot-publication-FTC-Adopts-Amended-Childrens-Online-Protection-Act-Rule.pdf)
- **Data retention:** personal information may be kept only as long as reasonably necessary for the specific purpose it was collected for, and a **written data-retention policy** must be published. [verified] — [Latham & Watkins](https://www.lw.com/en/insights/2025/05/ftc-publishes-updates-to-coppa-rule)
- **Security and notices:** a written information-security programme is required, along with expanded direct notice to parents and a more detailed online notice. [verified] — [Davis Polk](https://www.davispolk.com/insights/client-update/ftc-prioritizes-coppa-enforcement-new-compliance-obligations-take-effect); [White & Case](https://www.whitecase.com/insight-alert/unpacking-ftcs-coppa-amendments-what-you-need-know)
- **Push notifications (not adopted):** the FTC did **not** adopt the proposal to stop operators using the "support for internal operations" exception to send push notifications or otherwise prompt engagement without VPC. It cited overbreadth concerns. Its press release said push notifications aimed at keeping kids online remain a concern and could be pursued under Section 5. [verified] — [Wiley](https://sitepilot12.firmseek.com/client/wiley2/www/printpilot-publication-FTC-Adopts-Amended-Childrens-Online-Protection-Act-Rule.pdf); [Jones Day](https://jonesday.com/en/insights/2025/05/ftc-finalizes-amendments-to-coppa--rule)
- **Other changes:** biometric identifiers were added to "personal information"; new approved VPC methods include knowledge-based authentication, facial match to government ID, and "text plus"; and "mixed audience" is formally defined (a child-directed service whose primary audience is not children may age-screen and apply COPPA only to under-13s). [background] — [Federal Register text](https://www.govinfo.gov/content/pkg/FR-2025-04-22/html/2025-05904.htm)
- **Edtech precedent, FTC v. Edmodo (May 2023):** an edtech provider cannot shift COPPA compliance onto schools. It may rely on school authorization only for educational purposes, and may not use children's data for advertising. [background] — [FTC](https://www.ftc.gov/news-events/news/press-releases/2023/05/ftc-says-ed-tech-provider-edmodo-unlawfully-used-childrens-personal-information-advertising-outsourced-compliance-school)

### Inferences
- **EDUVENTURE is "directed to children"** (ages 7+, chibi art, school content), or at least mixed audience. For any US user it must therefore:
  - age-screen neutrally;
  - get VPC before collecting personal information from under-13s, including chat content, persistent IDs beyond internal operations, and voice;
  - get separate VPC before any third-party disclosure (for example, analytics or ad SDKs not integral to the service);
  - publish a retention schedule (for example, delete inactive child accounts after N months);
  - keep a written security programme.
- **Chat:** follow the Epic order and default chat **off** for under-13s, enabled only by a parent. Free-text chat from a child counts as collecting personal information because it can contain PI. Filtered or pre-set phrase chat avoids most of this.
- **Push notifications for under-13s:** not formally banned, but the FTC has flagged them. Make them opt-in, parent-controlled and non-manipulative.

### Gaps
- The exact final text of the §312.2 definitions and the new §312.10 retention wording was not quoted from the primary source.
- No evidence found of FTC enforcement under the amended rule since April 2026.
- The status of US federal KOSA and of state "addictive feed" laws (NY SAFE for Kids Act rules, the California AADC injunction) was not checked this session.

---

## Q4. UK Age Appropriate Design Code (Children's Code) and the Online Safety Act children's codes

### Takeaway
The ICO Children's Code (fully enforced since 2 September 2021) applies to any online service "likely to be accessed" by under-18s in the UK. It has 15 standards. Two of them, **Standard 5 (Detrimental use of data)** and **Standard 13 (Nudge techniques)**, directly limit engagement design.

Ofcom's Protection of Children Codes under the Online Safety Act 2023 have applied since **25 July 2025**. They cover user-to-user services such as games with chat, with **no size exemption**.

### Cited Findings
- **The 15 Children's Code standards:**
  1. Best interests of the child
  2. Data protection impact assessments
  3. Age-appropriate application
  4. Transparency
  5. Detrimental use of data
  6. Policies and community standards
  7. Default settings (high privacy by default)
  8. Data minimisation
  9. Data sharing
  10. Geolocation (off by default)
  11. Parental controls (tell the child when monitored)
  12. Profiling (off by default)
  13. Nudge techniques
  14. Connected toys and devices
  15. Online tools

  [background] — [ICO Children's Code](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/)
- **Standard 5, Detrimental use of data:** "Do not use children's personal data in ways that have been shown to be detrimental to their wellbeing, or that go against industry codes of practice, other regulatory provisions or Government advice." The ICO guidance names features that use personal data to **extend engagement** ("sticky" features such as reward loops, streaks, auto-play and notifications). It asks services to avoid them, or to give children control and build in breaks, and not to use them in ways that encourage excessive use. [background] — [ICO Std 5](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/5-detrimental-use-of-data/)
- **Standard 13, Nudge techniques:** "Do not use nudge techniques to lead or encourage children to provide unnecessary personal data or weaken or turn off their privacy protections." The guidance encourages "pro-privacy" and wellbeing nudges, such as break prompts. [background] — [ICO Std 13](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/13-nudge-techniques/)
- **Ofcom children's codes:** published in final form on 24 April 2025, with duties in force from **25 July 2025**. [background] — [Ofcom: protecting children](https://www.ofcom.org.uk/online-safety/protecting-children)
  - Services likely to be accessed by children had to complete a children's risk assessment by 24 July 2025.
  - Measures include highly effective age assurance where primary priority harmful content is allowed, safer recommender feeds, effective moderation, and user controls (block, mute, decline group-chat invites, disable comments).
  - A named senior person must be accountable for children's safety.
  - Illegal-content duties have applied since 17 March 2025.

### Inferences
- With chat, EDUVENTURE is a "user-to-user service" under the UK OSA. It must do illegal-content and children's risk assessments and keep moderation and reporting tools. Proportionate measures apply even to small services.
- Under the Children's Code:
  - streaks, pet decay and notifications built on personal data must be wellbeing-justified, controllable and **off or soft by default** for children;
  - include break reminders;
  - keep high-privacy defaults;
  - turn profiling and geolocation off;
  - do not use nudges to share data or to open chat.

### Gaps
- The exact Ofcom code measure numbers (for example, the PCU-series) were not fetched.
- Any 2026 Ofcom consultations on additional measures (for example, livestreaming or "addictive design") were not checked.
- The Data (Use and Access) Act 2025 duty on children's "higher protection matters" was not checked.

---

## Q5. EU: DSA Article 28 guidelines (2025) and the Digital Fairness Act proposal

### Takeaway
DSA Article 28(1) requires online platforms accessible to minors to ensure "a high level of privacy, safety, and security." The Commission's 14 July 2025 guidelines are the compliance benchmark. They say:
- streaks and engagement features should be off by default;
- avoid countdown timers, "buy now" prompts and intermediate currencies;
- do not use loot boxes.

**Micro and small enterprises are exempt from Art. 28 (DSA Art. 19)**, but GDPR and consumer law still apply. The Digital Fairness Act was **proposed on 11 November 2026** (COM(2026) 1100 reported). It is not law.

### Cited Findings
- **Status and content of the guidelines:** published 14 July 2025. They are voluntary but used by the Commission as the benchmark for Art. 28(1) compliance. They cover:
  - streaks and excessive-use features off by default;
  - persuasive design (infinite scroll, attention-regaining notifications);
  - countdown timers and "buy now" prompts;
  - age-appropriate transparency of transactions;
  - avoiding intermediate virtual currencies;
  - not using loot boxes or gambling-like practices.

  [verified] — [Hunton](https://www.hunton.com/privacy-and-cybersecurity-law-blog/european-commission-issues-guidelines-on-the-protection-of-minors); [Commission](https://digital-strategy.ec.europa.eu/en/library/commission-publishes-guidelines-protection-minors)
- **Scope exemption:** DSA Art. 19(1) says Section 3 of Chapter III (Arts. 20–28) does not apply to online platforms that qualify as micro or small enterprises (except Art. 24(3)). [background] — [Regulation (EU) 2022/2065](https://eur-lex.europa.eu/eli/reg/2022/2065/oj)
- **Digital Fairness Act proposal (11 November 2026):** [verified] — [Osborne Clarke](https://www.osborneclarke.com/insights/proposed-eu-digital-fairness-act-targets-addictive-design-dark-patterns-and-unfair); [Tech Policy Press](https://techpolicy.press/assessing-the-eu-digital-fairness-act-and-its-promise-of-consumer-protection); [PPC.land](https://ppc.land/eus-digital-fairness-act-would-let-brussels-fine-firms-up-to-6-of-turnover/); [gHacks](https://www.ghacks.net/2026/11/11/eu-proposes-digital-fairness-act-to-ban-dark-patterns-and-let-users-turn-off-streaks-and-autoplay/)
  - It applies to all consumer-facing businesses, not only platforms.
  - It targets addictive design (autoplay, unprompted notifications, streaks, simulated relationships), monetisation and in-game currencies, and paid random rewards for minors.
  - It would let users switch off streaks and autoplay.
  - It is reported as a directly applicable regulation replacing the Unfair Commercial Practices Directive, with Commission fines of up to 6% of turnover.
  - Some reporting describes an outright ban on certain addictive features for minors; the exact scope is unclear.
- **Conflicting date:** one aggregator dated a DFA unveiling to April 2026. The November 2026 sources are consistent with each other. [verified] — see the sources above.

### Inferences
- Even though a small EDUVENTURE would be exempt from DSA Art. 28, the guidelines are the clearest statement of EU expectations. The DFA, if adopted, would bind all sizes; designing to it now avoids a later rebuild.
- Under GDPR Art. 8, parental consent is required below the national digital-consent age (13–16, varying by member state) where consent is the legal basis. [background] — [GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj)

### Gaps
- The DFA's article numbering and the exact minors provisions were not read from the primary text. The legislative timeline (Parliament/Council) is unknown.
- The proposed "EU KIDS Act" mentioned by Osborne Clarke was not researched.

---

## Q6. Malaysia: PDPA amendments, Online Safety Act 2025, MCMC licensing, the under-16 rule, and what they mean for an educational game with chat

### Takeaway
- **PDPA:** the Personal Data Protection Act 2010 applies fully to EDUVENTURE. The 2024 amendments (Act A1727) are **in force in phases**, with the DPO, breach notification and data portability provisions in force from **1 June 2025**. For under-18 users, consent is given by the parent or guardian, the "relevant person" under s.4.
- **Online Safety Act 2025 (Act 866):** in force **1 January 2026**. It binds only **licensed** application service providers and content application service providers. In practice those are social media and messaging services with **8 million or more Malaysian users**, which are deemed licensed under CMA s.46A.
- **Under-16 rule:** the Child Protection Code and Risk Mitigation Code, with the under-16 social-media-account rule, **took effect 1 June 2026** for licensed social media platforms.
- **For EDUVENTURE:** a small educational game is not currently a licensee. The ONSA's duties and the under-16 bar do not apply directly, but the Child Protection Code is the best local benchmark.

### Cited Findings
- **PDPA amendment timeline:** the Amendment Act received royal assent on 9 October 2024 and was gazetted on 17 October 2024. Commencement was phased under a gazette notification of 24 December 2024. [verified] — [Baker McKenzie](https://insightplus.bakermckenzie.com/bm/data-technology/malaysia-personal-data-protection-amendment-act-2024-to-come-into-force); [Rajah & Tann](https://www.rajahtannasia.com/?p=161886)
  - The 1 June 2025 phase covers **DPO appointment, mandatory breach notification and data portability**.
  - An earlier phase covers processor security duties, cross-border transfer changes and higher penalties.
  - **Sources conflict on the first phase:** 1 January 2025 or 1 April 2025 (Tay & Partners on Legal500 versus Baker McKenzie). Verify against the gazette.
- **PDPA details:** [background; not re-fetched] — [JPDP](https://www.pdp.gov.my)
  - Penalties for breaching the Personal Data Protection Principles rose to a fine of up to **RM1,000,000 and/or 3 years' imprisonment**.
  - Data processors became directly bound by the Security Principle.
  - "Biometric data" was added to sensitive personal data.
  - "Data user" was renamed "data controller".
  - The s.129 whitelist was replaced with a general cross-border transfer regime.
- **JPDP guidelines (2025):** [background; not re-fetched — VERIFY] — [JPDP](https://www.pdp.gov.my)
  - Data Breach Notification: notify the Commissioner within **72 hours**, and affected data subjects within **7 days** when significant harm is likely.
  - Appointment of DPO: required where, among other triggers, the controller processes the personal data of **more than 20,000 data subjects**, sensitive data of **more than 10,000**, or carries out regular and systematic monitoring. The DPO must be resident in Malaysia or easily contactable.
  - The 72-hour figure was originally a consultation proposal (PCP 01/2024). [verified as proposal] — [Baker McKenzie](https://insightplus.bakermckenzie.com/bm/data-technology/malaysia-personal-data-protection-amendment-act-2024-to-come-into-force)
- **Minors under the PDPA:** the PDPA has no dedicated children's chapter. The s.4 definition of "relevant person" covers the parent, guardian or person with parental responsibility for a data subject **under 18**, who gives consent and exercises rights on the minor's behalf. [background] — [PDPA 2010 (Act 709), AGC](https://lom.agc.gov.my)
- **Online Safety Act 2025:** [verified] — [Rahmat Lim & Partners](https://www.rahmatlim.com/perspectives/articles/32091/online-safety-in-malaysia-what-you-should-know-about-the-online-safety-act-2025-and-its-subsidiary-legislation); [The Vibes](https://www.thevibes.com/articles/news/117650/online-safety-act-2025-comes-into-force-strengthening-protections-for-children-and-families); [HHQ](https://hhq.com.my/posts/the-online-safety-act-2025-is-finally-here-10-key-takeaways-for-companies/)
  - In force 1 January 2026, defining a "child" as under 18.
  - It applies to licensed ASPs, including those deemed registered under CMA s.46A, and to licensed CASPs. It does not apply to individual users.
  - Internet messaging and social media providers with **8 million or more users** in Malaysia are deemed ASP class licensees from 1 January 2026. MCMC may lower the threshold.
  - **Eight prescribed duties:**
    - mitigate exposure to harmful content;
    - issue user guidelines;
    - enable users to manage their online safety;
    - provide a reporting mechanism;
    - provide user assistance;
    - **protect child users**;
    - make priority harmful content inaccessible;
    - prepare an online safety plan.
  - Penalties are up to **RM10M** for duty breaches and up to **RM1M** for missing prescribed periods.
  - Under the Online Safety (Period) Regulations 2025, reports must be acknowledged within 1 hour and assessed within 12 hours. Priority harmful content (CSAM, financial fraud) must be made inaccessible immediately.
- **MCMC licensing framework:** social media and internet messaging services with 8 million or more Malaysian users must hold an ASP class licence under the CMA from 1 January 2025, with deemed licensing from 1 January 2026. [verified] — [Rahmat Lim](https://www.rahmatlim.com/perspectives/articles/32091/online-safety-in-malaysia-what-you-should-know-about-the-online-safety-act-2025-and-its-subsidiary-legislation); [ISIS Malaysia](https://www.isis.org.my/2026/01/01/malaysia-tightens-grip-on-major-social-media-platforms-will-it-make-the-internet-safer/)
- **Child Protection Code (CPC) and Risk Mitigation Code (RMC):** [verified] — [Skrine](https://www.skrine.com/insights/alerts/may-2026/online-safety-act-2025-child-protection-code-and-r); [Malay Mail](https://www.malaymail.com/news/malaysia/2026/06/01/malaysias-under-16-social-media-rule-starts-today-what-parents-need-to-know/221674); [The Vibes](https://www.thevibes.com/articles/news/123523/landmark-safety-rules-take-effect-as-under-16s-barred-from-social-media-accounts); [AmCham PDF](https://amcham.com.my/wp-content/uploads/9.-Online-Safety-Act-2025-Child-Protection-Code-and-Risk-Mitigation-Code-Published.pdf)
  - MCMC published both on **22 May 2026** under ONSA s.80; they are effective **1 June 2026**.
  - They apply to licensed social media platforms with 8 million or more Malaysian users (for example Facebook, Instagram, TikTok, YouTube).
  - **Requirements:**
    - age verification so that under-16s cannot hold social media accounts;
    - privacy and safety settings for child users age-appropriate and/or **at the highest level by default**;
    - **limit or prohibit direct communication between child users and adult strangers**;
    - parental control features;
    - age-verification data minimised and PDPA-compliant.
- **Under-16 timeline:** announced in November 2025 for 1 January 2026; it slipped, with eKYC (MyKad, passport, MyDigital ID) targeted for Q2 2026, and the under-16 account rule started on 1 June 2026. [verified] — [Lowyat](https://www.lowyat.net/2025/374103/malaysia-to-bar-social-media-accounts-for-under-16s-from-2026/); [Malay Mail Apr 2026](https://www.malaymail.com/amp/news/malaysia/2026/04/29/government-to-enforce-ekyc-checks-ensuring-children-under-16-cannot-hold-social-media-accounts/218123); [TechPolicy.Press](https://www.techpolicy.press/malaysia-to-ban-under16s-from-social-media-but-will-it-work)
- **Source quality:** some aggregator and blog sources claim a broader under-16 ban with mandatory government-ID verification for all online services. This is not corroborated by the law-firm sources. [verified] — see the Skrine and Malay Mail sources above.

### Inferences
- **PDPA duties that bind EDUVENTURE from day one in Malaysia:**
  - parental or guardian consent for under-18 players (PDPA consent via the "relevant person"), which is stricter than COPPA's under-13 line;
  - a bilingual (Malay and English) privacy notice under the Notice and Choice Principle (s.7);
  - security, retention, data-integrity and access principles;
  - breach notification (72 hours to the Commissioner);
  - portability on request;
  - a DPO once thresholds are crossed. An MMORPG with schools could pass 20,000 data subjects quickly.
- **ONSA and the CPC** do not currently reach a sub-8M-user game. Still, adopting the CPC's three core design rules is the safest local benchmark and anticipates any MCMC threshold reduction:
  - highest-privacy defaults for under-18s;
  - no adult-stranger direct messaging with children;
  - parental controls.
- **Chat:** an in-game chat is not a "social media platform" under the under-16 rule as reported. Still:
  - restrict free-text chat for younger users (pre-set phrases or class/school-only chat);
  - provide reporting with fast response (aligned with the Period Regulations: acknowledge within 1 hour);
  - moderate for CSAM and grooming. Criminal law (the Sexual Offences against Children Act 2017, which includes child grooming offences) applies regardless of licensing.
- **Ongoing exposure:** sale of paid currency to Malaysian minors also engages consumer-protection law (Consumer Protection Act 1999) and contract-capacity questions (Contracts Act 1950 s.11: minors lack capacity). These are not researched here.

### Gaps
- The JPDP DPO and breach-notification guideline figures (72 hours / 7 days / 20,000 / 10,000) come from background knowledge and were **not re-verified** this session. Confirm on pdp.gov.my.
- The ONSA section numbers for each duty (beyond s.36(1) undertakings and s.80 codes) were not obtained.
- Whether MCMC has lowered the 8M threshold, or whether any code covers online games, was not found.
- No Malaysian rule specific to loot boxes or games was found. Gambling law (Common Gaming Houses Act 1953, Betting Act 1953) applied to loot boxes is untested.

---

## Q7. App stores: Apple Kids Category (1.3, 5.1.4), loot-box odds (3.1.1), Google Play Families / Teacher Approved, IARC, and age-assurance APIs

### Takeaway
- **Apple Kids Category:** no purchasing opportunities, external links or distractions unless behind a parental gate; no third-party analytics or advertising (narrow exceptions); no personal or device data to third parties.
- **Google Play Families Policy:** no AAID, no location, only approved SDKs, Families Self-Certified ads only and non-personalised, virtual currency clearly distinguished from real money, and social features with parental management and safety reminders.
- **Both stores** require loot-box odds disclosure.
- **Age signals:** both now provide age-range APIs (Apple Declared Age Range; Google Play Age Signals), used for US state app-store accountability laws such as Texas SB 2420.

### Cited Findings
- **Apple 1.3 Kids Category (verbatim extracts):** [verified] — [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
  - "These apps must not include links out of the app, purchasing opportunities, or other distractions to kids unless reserved for a designated area behind a parental gate."
  - "Kids Category apps may not send personally identifiable information or device information to third parties. Apps in the Kids Category should not include third-party analytics or third-party advertising."
  - Limited exception for analytics: allowed if no IDFA or identifiable information is collected.
  - Limited exception for contextual ads: allowed with "human review of ad creatives".
  - Once in the Kids Category, an app must keep meeting these rules even if it later deselects the category.
- **Apple 5.1.4 Kids:** [verified] — [Apple Guidelines](https://developer.apple.com/app-store/review/guidelines/)
  - Apps may ask for birthdate and parental contact "only for the purpose of complying with these statutes".
  - Apps "intended primarily for kids should not include third-party analytics or third-party advertising".
  - Apps with "the ability to chat" from a minor need a privacy policy and must comply with children's privacy laws.
  - The parental gate "is generally not the same as securing parental consent".
  - Guideline 2.3.8 reserves "For Kids" / "For Children" metadata for Kids Category apps.
- **Apple 3.1.1:**
  - Randomized paid items require odds disclosure before purchase.
  - In-app currencies must use Apple in-app purchase.
  - "Any credits or in-game currencies purchased via in-app purchase may not expire."

  [verified] — [Apple Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- **Apple 2.3.6:** answer the age-rating questions honestly, and comply with local rating requirements per territory. [verified] — [Apple Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- **Google Play Families Policy:** [verified] — [Google Play Families Policy](https://support.google.com/googleplay/android-developer/answer/9893335)
  - **Target audience:** declare the target age groups; Google can override them.
  - **Identifiers and permissions:** child-only apps must not transmit AAID, IMEI, MAC and similar identifiers, must not request AD_ID (API 33+), and must not request location.
  - **SDKs:** only SDKs approved for child-directed use. Mixed-audience apps need a **neutral age screen**.
  - **Ads:** only **Families Self-Certified Ads SDKs**, with no interest-based ads or remarketing, and no disruptive formats (unclosable after 5 seconds, interstitials on launch).
  - **IAP:** distinguish virtual coins from real money.
  - **Social features:**
    - an in-app reminder about online safety before children share freeform content;
    - "a method for adults to manage social features for child users";
    - adult verification before children exchange personal information;
    - apps whose main purpose is chatting with strangers must not target children.
  - **Teacher Approved:** opt-in rating, with inclusion not guaranteed.
- **Google Play loot-box odds:** the Payments policy requires disclosure of the odds of randomized purchased items before purchase. [background] — [Google Play Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738)
- **Age-signal APIs:** [verified] — [Mondaq / FKKS](https://www.mondaq.com/unitedstates/telecoms-mobile-cable-communications/1720916/countdown-to-jan-1-2026-mobile-developers-must-adopt-apple-google-apis-to-comply-with-app-store-accountability-acts); [MacRumors](https://www.macrumors.com/2025/11/04/ios-26-2-texas-age-verification-law/); [iClarified June 2026](https://www.iclarified.com/101073/texas-app-store-age-verification-law-takes-effect-for-new-apple-accounts)
  - Apple's Declared Age Range API (plus a Significant Change API and notice of withdrawn parental consent) and Google's Play Age Signals API (beta, limited early access) give age bands: 0–12, 13–15, 16–17 and 18+.
  - **Texas SB 2420 (App Store Accountability Act):** preliminarily enjoined in December 2025; Apple reported the injunction lifted on 3 June 2026, and the requirements now apply to new Texas Apple Accounts. Sources conflict on the timeline; verify.
- **IARC:** Google Play uses the IARC questionnaire, which yields PEGI, ESRB, USK, ClassInd and other ratings by region. Apple runs its own age-rating questionnaire. [background] — [IARC](https://www.globalratings.com/)

### Inferences
- **EDUVENTURE spans 7 to university, so it is mixed audience.** Options:
  - **(a) Apple Kids Category** (age bands 6–8 or 9–11). Purchases and links must go behind a parental gate, and no third-party analytics or ads are allowed. This is hard for an MMORPG with chat and a broad age range.
  - **(b) Not Kids Category** (recommended), with an honest age rating. It still must follow 5.1.4 for minors' data, and cannot use "for kids" in metadata.
- **On Google:** the target audience will include under-13 bands, so the Families Policy applies. Use a neutral age screen for mixed audience, no AAID or location for children, Families-certified SDKs only, and parental management of chat.
- Any purchasable randomized item triggers odds disclosure on both stores **and** the PEGI 16 / Australian M ratings. This is another reason to avoid it entirely.
- Integrate the Declared Age Range / Age Signals APIs to set age-appropriate defaults (chat, notifications, shop).

### Gaps
- Apple's 2025 age-rating overhaul (new 13+, 16+ and 18+ tiers and new questionnaire items on in-app controls and UGC/messaging), and the developer deadline for answering the new questions, were not verified this session. The search did not surface them, so confirm on developer.apple.com/news.
- Teacher Approved criteria (age-appropriateness, enrichment, delight, appropriate ads and IAP) were not fetched.
- The Google Play loot-box text was not re-fetched.

---

## Q8. Ethical engagement frameworks, playtime limits and break reminders (with China as the extreme case)

### Takeaway
The consensus ethical frameworks share one design philosophy: measure success by learning and wellbeing, not time on device. They include the Center for Humane Technology's "Time Well Spent", the ICO's wellbeing nudges, UNICEF and LEGO's RITEC, and 5Rights. In practice that means:
- natural stopping points;
- break reminders;
- user and parent controls over notifications and play time;
- no punishment for absence.

China is the regulatory extreme. Since 30 August 2021, minors may play online games only from 8 to 9 pm on Fridays, weekends and public holidays, with real-name verification and spending caps.

### Cited Findings
- **Center for Humane Technology, "Time Well Spent":** argues products should be designed to respect attention and leave users better off, not maximise time-on-device. [background] — [Center for Humane Technology](https://www.humanetech.com/)
- **5Rights, "Disrupted Childhood":** recommends removing persuasive features (summonses, variable rewards, endless feeds, streaks) from children's services by default. [background] — [5Rights](https://5rightsfoundation.com/resource/disrupted-childhood-the-cost-of-persuasive-design/)
- **ICO guidance (Standard 5):** services should build in breaks and not use engagement features detrimental to wellbeing. [background] — [ICO Std 5](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/5-detrimental-use-of-data/)
- **China:** the NPPA notice of 30 August 2021 limits minors to one hour of online gaming, 8–9 pm on Fridays, Saturdays, Sundays and public holidays, with mandatory real-name registration. It builds on the 2019 rules, which set a curfew and monthly spending caps by age. [background] — [Reuters](https://www.reuters.com/world/china/china-rolls-out-new-rules-minors-online-gaming-xinhua-2021-08-30/)
- **EU DFA proposal:** would give users the right to turn off streaks and autoplay. This is effectively codifying "time well spent" controls. [verified] — [gHacks](https://www.ghacks.net/2026/11/11/eu-proposes-digital-fairness-act-to-ban-dark-patterns-and-let-users-turn-off-streaks-and-autoplay/)

### Inferences
Ethical engagement rules for EDUVENTURE:
- **Streaks:** opt-in or soft ("streak freezes" free and automatic, no loss animation). Easy to turn off. No streak-loss notifications.
- **Virtual pet:** never dies, sickens or shows sadness from absence. It "waits happily". It rewards learning, not logins.
- **Missions:** no countdown timers on purchasable items. Event timers only on free content, with long windows.
- **Notifications:** off by default for under-13s (or under-18s in Malaysia/UK practice), parent-controlled, with no notifications at night or during school hours.
- **Breaks and limits:** break reminder after about 30–45 minutes, optional parent time limits, a session-end summary ("great stopping point").
- **Leaderboards:** class or friend scope, opt-in, based on effort or mastery rather than total time. Avoid public global rank for young children.

### Gaps
- The "Ethical Games" guidelines named in the brief were not located or verified. Possible candidates are the Fair Play Alliance, the Ethical Games Initiative, UNICEF and LEGO's RITEC (2024) and IEEE 2089-2021, but none was confirmed this session.
- Any China updates after 2023 (for example, the 2023 draft spending-limit rules that were withdrawn) were not checked.

---

## Q9. Ethical monetisation models in kids' learning products, and where Prodigy and Duolingo draw criticism

### Takeaway
Defensible models for children's learning products:
- **(1) Cosmetics-only purchases** sold to parents, behind a parental gate, at fixed prices.
- **(2) A parent subscription** with transparent, easy cancellation (cf. the FTC ABCmouse case).
- **(3) Free for students, paid by schools or districts** (licences), with COPPA school-authorization limits (cf. Edmodo).
- **(4) Nonprofit or free** (for example Khan Academy Kids).

The main criticisms:
- **Prodigy:** free core but persistent in-game membership upsells to children, with members visibly getting more.
- **Duolingo:** streak anxiety, guilt notifications, and selling streak protection with gems.

### Cited Findings
- **ABCmouse (Age of Learning):** paid $10M (2020) over hard-to-cancel subscriptions and undisclosed renewal. This is the key precedent for parent subscriptions. [background] — [FTC](https://www.ftc.gov/news-events/news/press-releases/2020/09/childrens-online-learning-program-abcmouse-pay-10-million-settle-ftc-charges-illegal-marketing-billing-practices)
- **Edmodo (2023):** using children's data for ads, and outsourcing COPPA consent to schools, were unlawful. The school-licence model must keep data use strictly educational. [background] — [FTC](https://www.ftc.gov/news-events/news/press-releases/2023/05/ftc-says-ed-tech-provider-edmodo-unlawfully-used-childrens-personal-information-advertising-outsourced-compliance-school)
- **Apple 3.1.1:** purchased in-game currency may not expire. This is relevant if gold is ever sold. [verified] — [Apple Guidelines](https://developer.apple.com/app-store/review/guidelines/)

### Inferences
- **Recommended for EDUVENTURE:**
  - a free core in which all learning content and progression are free;
  - gold is **earn-only** and never sold;
  - optional cosmetic packs or a parent "supporter" subscription, purchased only via a parental gate, shown in real currency and not usable for advantage;
  - school or district licences for teacher dashboards.
- **This avoids:**
  - pay-to-win, which turns learning into a purchase and sets members against non-members (the core Prodigy critique);
  - loot boxes (Q2);
  - currency obfuscation (FTC, DSA, Google);
  - child-directed upsells.

### Gaps
- **Prodigy critique:** the Campaign for a Commercial-Free Childhood (now Fairplay) and allied groups filed an FTC complaint in February 2021 alleging Prodigy manipulates children into urging parents to buy memberships. This is from background knowledge; the primary URL and the outcome were **not verified** this session.
- **Duolingo critiques** (streak anxiety, guilt-tripping "Duo" notifications, paid streak freezes) are widespread in media and UX commentary. No regulator action against Duolingo was found or checked.
- Revenue-model evidence (conversion rates, school-licence pricing) was not researched.

---

## Q10. Consolidated: concrete rules EDUVENTURE must follow at launch (web, Google Play, Apple, Malaysia, then worldwide)

### Takeaway
Hard legal or store requirements, plus the safest-common-denominator design rules derived from Q1–Q9. Legal basis is in brackets. Items marked (design) are best practice drawn from regulator guidance, not hard law, for EDUVENTURE's size.

### Cited Findings
See Q1–Q9 for sources. Each line below references the governing rule.

### Inferences
**Data and consent**
1. Ask for age neutrally at sign-up (no default age, no hint about the "right" answer). Branch defaults by age band: under 13, 13–15, 16–17, 18+. [COPPA mixed audience; Google Families neutral age screen; Apple/Google age APIs]
2. **Malaysia:** parental or guardian consent for all under-18 accounts (PDPA s.4 "relevant person"). **US:** VPC for under-13s, plus **separate** VPC for any non-integral third-party disclosure. **EU:** consent below the GDPR Art. 8 national age where consent is the legal basis.
3. Collect only what is needed. No precise location, no advertising IDs (AAID/IDFA) for children, and no third-party ad or analytics SDKs in child flows (only Families-approved SDKs, or none). [Google Families; Apple 1.3 / 5.1.4; ICO Std 8, 10]
4. Publish a written retention schedule, delete inactive child data, and keep a written security programme. [COPPA 2025 amendments; PDPA Security and Retention Principles]
5. Appoint a DPO when JPDP thresholds are met. Have a breach plan that notifies the Commissioner within 72 hours (verify) and supports data-portability requests. [PDPA Amendment 2024, in force 1 June 2025]
6. Provide a Malay and English privacy notice. [PDPA s.7]

**Monetisation**

7. **No paid randomized rewards of any kind.** [Brazil ECA Digital Art. 20; Belgium; PEGI 16 / Australia M; DSA Art. 28 guidelines; FTC Genshin; DFA proposal]
8. Keep gold **earn-only**. If a premium currency ever exists, show real-money prices, avoid odd bundle sizes, and do not let it expire. [Google Families; DSA guidelines; Apple 3.1.1]
9. Put all purchases and external links behind a parental gate. Purchases are made by parents; no purchase prompts to children. [Apple 1.3; FTC Epic; Radesky]
10. No pay-to-win: purchases are cosmetic only and never speed up learning rewards. (design; Prodigy critique)
11. Subscriptions must be clearly disclosed and cancellable in one step online. [FTC ABCmouse; ROSCA; DFA proposal]

**Engagement mechanics**

12. Streaks: optional, off or soft by default for minors, with no penalty or guilt messaging, and switchable off. [DSA Art. 28 guidelines; DFA proposal; ICO Std 5]
13. Pet: no decay or sadness from absence; no character pleading to play or buy. [Radesky parasocial pressure; DFA "simulated relationships"]
14. No countdown timers or "buy now" urgency tied to purchases. [DSA guidelines; FTC dark patterns]
15. Notifications: opt-in, parent-controlled for minors, with no attention-recapture messages ("Your pet misses you!") and quiet hours. [FTC COPPA statement; ICO Std 5; DSA guidelines]
16. Break reminders, optional parent time limits, natural stopping points; no infinite feeds or autoplay. (design; ICO; 5Rights; DFA)
17. Leaderboards: opt-in, scoped to class or friends, showing nicknames not real names, and based on mastery rather than time or spend. [ICO Std 7 default settings; design]

**Chat and social**

18. Chat **off by default** for minors. Under-13s get only preset phrases or teacher- or class-scoped chat, enabled by a parent. [FTC Epic order; COPPA; Google Families social features; Malaysia CPC benchmark]
19. No direct messaging between adult strangers and child accounts. [Malaysia CPC; Ofcom codes]
20. Profanity and PII filters, block, mute and report tools, fast moderation (acknowledge reports within 1 hour as a benchmark), and CSAM and grooming escalation. [Malaysia ONSA Period Regulations benchmark; UK OSA illegal-content and children's codes]
21. Show an online-safety reminder before free-text sharing, and give parents controls over social features. [Google Families]
22. **UK launch:** complete OSA illegal-content and children's risk assessments, and name an accountable person. [UK OSA 2023; Ofcom codes in force 25 July 2025]

**Store and rating**

23. Answer the IARC and Apple rating questionnaires honestly, disclosing in-game purchases and user interaction. Do not use "for kids" metadata unless in the Kids Category. [Apple 2.3.6 / 2.3.8; Google Families]
24. Decide between Apple Kids Category and a general listing. The Kids Category means no third-party analytics or ads, and everything gated. [Apple 1.3]

**Watch-list (proposed or pending)**
- EU Digital Fairness Act (proposed 11 November 2026).
- Possible MCMC threshold reduction or extension of the CPC beyond social media.
- US state app-store age laws (Texas SB 2420 and similar).
- Federal KOSA (status unverified).

### Gaps
- None of the above has been reviewed by Malaysian, US, UK or EU counsel. The PDPA guideline figures, Brazil Art. 20 scope and Apple's 2025 age-rating tiers need primary-source confirmation before launch.
