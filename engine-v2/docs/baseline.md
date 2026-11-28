# Audyt wstępny — 2026-11-28
Źródło: commit 19f44c3bd615fe5a22bac68591cf30d616d462ee.

| Obszar | Pliki | Obserwacja |
|---|---|---|
| Główna logika | js/app.js | 113 odwołań tekstowych do localStorage; statystyki, trening, walka, ekwipunek, kowalstwo |
| Świat | js/world.js | 82 odwołania do localStorage; Canvas, zadania, bossowie, poruszanie |
| Walka fabularna | js/story-combat.js | Osobne wzory walki; wymagane porównanie z walką zwykłą i PvP |
| Konta | js/auth.js, js/character-slots.js, js/characters.js | Lokalna rejestracja i wybór postaci; nie stanowią bezpiecznego uwierzytelniania |
| GM | js/gm-access.js, js/gm-*.js | Lokalne sprawdzenie sesji i nazwy konta; wymaga uprawnień serwerowych |
| Zawartość | js/gm-content.js, js/world-data.js, data/gm-world-published.json | Istniejące dane i kreatory należy zachować; część reguł nadal w JS |
| Handel i gildie | js/market.js, js/guild.js, js/local-post.js | Stan lokalny; nie traktować jako wspólnej gospodarki |
| Import | server/IMPORT.md, server/import_test_saves.py, server/save-prefixes.json | Import do SQLite dla testów; brak pełnego serwera |
| Publikacja | .github/workflows/pages.yml | GitHub Pages automatycznie publikuje main |

W repozytorium są też starsze pliki w katalogu głównym (np. app.js, world.js).
Nie usuwać ani nie modyfikować przed ustaleniem odwołań wszystkich stron HTML.

## Ryzyka do weryfikacji
- Lista eksportu server/save-prefixes.json nie zawiera m.in. dboidle_high_tower_journey_v1_,
  dboidle_high_tower_entry_day_v1_, dboidle_high_tower_limit_v1_,
  dboidle_high_tower_pending_v1_, dboidle_town_journey_v1_, dboidle_town_treasures_v1_,
  dboidle_gm_quest_v1_, dboidle_gm_pickup_v1_ oraz dboidle_north_journey_v1_.
  Sprawdzić także faktyczny eksport w js/app.js, zakres kluczy i przykładowe zapisy.
  Nie zakładać, że każdy klucz jest trwałym postępem postaci.
- Wzór dodgeChance w js/story-combat.js przełącza tryb przy szybkości atakującego
  >= 1 000 000, nie przy różnicy szybkości. Porównać wszystkie implementacje z
  zatwierdzoną regułą przed przeniesieniem; żadnej cichej korekty balansu.
- Wersje danych map i questów wymagają walidacji relacji i stabilnych identyfikatorów.
- Lokalne zapisy można zmodyfikować; nie importować ich bez weryfikacji do ekonomii produkcyjnej.
- Liczba odwołań do localStorage to wskazówka, nie liczba niezależnych zapisów.
- Nie wykonano jeszcze pełnego audytu wszystkich mechanik ani testów w przeglądarce.

## Kryteria zakończenia audytu
Mapa aktywnych zależności, kompletna klasyfikacja kluczy zapisu (w tym dynamicznych),
zestaw referencyjnych przypadków dla każdej mechaniki, udokumentowane rozbieżności,
zatwierdzony sposób migracji oraz test eksport → import → porównanie postaci.
