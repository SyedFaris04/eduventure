# Teach your pet and pet adventures — design (small project)

Date: 19 Nov 2026. Owner chose it (research feature 14: the protégé effect and Finch-style adventures) and approved
the database change.

**Teach your pet.** For about 1 in 5 multiple-choice or true/false battle questions, when the player has a pet, the
server picks a *uniformly random* option as the pet's guess ("Comel thinks it's B — is Comel right?"). A random guess
carries no information about the answer. After the player answers: right and the pet was wrong → "You taught Comel!"
and +2 pet points (inside the daily 30-point answer cap); both right → "You both got it!"; player wrong → the existing
cheer. Pure rules `pet_guess_pick(type, options, roll, pick)` and `pet_taught(guess, answer, correct)` are tested.

**Pet adventures.** Every third first-time lesson completion (counted since the last adventure) sends the pet to explore
a random island for 6 hours (`pet_adventures`). When it is back, Home shows "Comel is back!"; opening the souvenir
reveals a Malaysian fun fact (never one already collected, when possible) and gives +10 pet points. Collected facts are
listed on the pet page. The pet still follows the hero while "away" (the adventure is a story, never an absence), and a
late claim costs nothing.

**Fun facts.** `content/pet-facts.json`, 20 kid-friendly facts in English and Malay, seeded by the migration; they need a
reviewer like the questions.

**Non-goals.** Pet hints in battle, adventure choices, timers that punish, notifications.
