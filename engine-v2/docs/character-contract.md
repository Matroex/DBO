# Character compatibility audit
Legacy js/character-slots.js and js/creator.js at 19f44c3:
- Default five slots, maximum ten, additional slot costs 50 Zeni from a character owned by the account.
- Name uniqueness is case insensitive within account, not global. Migration 002 corrects the initial schema without editing migration 001.
- Initial level 1; strength 4, speed 5, endurance 6, intelligence 2, ki 2.
- Five races: Saiyan, Ziemianin, Demon Mrozu, Nameczanin, Majin.
- Name minimum three characters; childCode is retained. Do not infer its gameplay meaning.
- Slot purchase, initial inventory and all remaining starter values require further extraction before enabling production creation.
- Account row lock required for concurrent creation and slot purchases; validate limit inside transaction.
- Server-side sessions must not trust legacy sessionStorage or GM name lists.
