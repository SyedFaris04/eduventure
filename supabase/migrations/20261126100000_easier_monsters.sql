-- Normal monsters fall to about three right answers (owner, 2026-11-26; decision #51). A right answer does
-- round((12 + 4 × difficulty) × combo bonus) damage (20261119090000_teach_your_pet.sql): at the usual difficulty 2–3,
-- three right answers in a row do 66–79. Health 55 / 60 / 65 by tier means three answers for most questions, two when
-- the questions are very hard and four when they are very easy. Defeat rewards (xp_reward, gold_reward) are unchanged;
-- bosses live in their own table and are not touched. Battles already under way keep the health they started with.
update public.monsters set max_hp = case
  when id in ('sproutling', 'hornbill', 'cubelet', 'bugsy', 'wordworm') then 55
  when id in ('pebblewing', 'tapir', 'hexowl', 'bytebot', 'alphabat') then 60
  when id in ('dinobud', 'pangolin', 'pisnake', 'loopy', 'commaleon') then 65
  else max_hp
end;
