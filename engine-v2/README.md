# DBOidle Engine 2.0 — Foundation 0.1

Status: przygotowanie i audyt; nie jest to jeszcze serwer gry.
Punkt odniesienia: 19f44c3bd615fe5a22bac68591cf30d616d462ee.
Gałąź produkcyjna: main. Gałąź zabezpieczająca: backup/pre-engine-v2.
Kod legacy pozostaje nienaruszony.

## Uruchomienie audytu
W głównym katalogu repozytorium, z Node.js 22 lub nowszym:
```sh
node engine-v2/tools/audit-storage.mjs
node --test engine-v2/tools/audit-storage.test.mjs
```
Raport wykrywa literalne klucze dboidle w źródłach JS i porównuje
kandydatów z listą server/save-prefixes.json. Jest heurystyczny:
nie rozpoznaje wszystkich kluczy dynamicznych ani ich semantyki, a brak na liście
nie dowodzi utraty danych. Nie odczytuje danych graczy, haseł ani sesji.

## Kolejność prac
1. Zidentyfikować aktywne pliki, wszystkie formaty zapisu oraz istniejące wzory.
2. Ustalić zachowanie referencyjne i testy regresji, w tym znane niezgodności.
3. Zatwierdzić model danych, migracje oraz kontrakt API.
4. Zaimplementować modułowy backend i pierwszy pionowy przepływ: konto → postać → zapis.
5. Przenieść mechaniki etapami, porównując wyniki ze starym silnikiem.
6. Dopiero potem włączyć synchronizację, handel i PvP online.
7. Przeprowadzić testy odzyskiwania kopii, obciążenia i bezpieczeństwa przed publikacją.

Dokumenty: [audyt](docs/baseline.md), [architektura](docs/architecture.md),
[warunki migracji](docs/migration.md). Żadna zmiana w zachowaniu produkcji
nie jest częścią tego commitu.
