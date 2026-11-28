# Architektura — decyzje początkowe

## Kierunek
Modularny monolit, jeden proces aplikacji na start. TypeScript + Node.js,
PostgreSQL, REST /api/v1, później WebSocket dla zdarzeń online.
To decyzja projektowa, nie wdrożenie. Wybór bibliotek i wersji zależności
nastąpi po zweryfikowaniu wymaganej platformy hostingu.

## Granice
- client: zachować HTML/CSS/Canvas; wysyła zamiary i renderuje wyniki.
- domain: czyste reguły walki, statystyk, przedmiotów, treningu, kowalstwa, zadań;
  kontrolowany zegar i źródło losowości do testów, bez DOM i localStorage.
- application: przypadki użycia i transakcje, autoryzacja, idempotencja.
- infrastructure: PostgreSQL, migracje, sesje, kolejki i logowanie.
- content: wersjonowane definicje map, przedmiotów, NPC, questów, receptur i tabel dropu.
- admin: edycja zawartości i zarządzanie postaciami, oddzielne uprawnienia i audyt.

## Kontrakty
Serwer jest źródłem prawdy. Klient nie przesyła wyliczonej nagrody ani wyniku walki.
Operacje ekonomiczne są atomowe, odporne na ponowienie i walidują właściciela.
Identyfikatory definicji są stabilne i niezależne od nazwy; instancja przedmiotu
ma własny identyfikator. Nie używać pozycji w tablicy jako identyfikatora.
Każdy zapis i publikacja mają wersję schematu. Trwająca walka lub trening
przypina odpowiednią wersję reguł; politykę zmian w toku należy doprecyzować.
Zawartość: szkic → walidacja → środowisko testowe → publikacja → historia wersji.
Cofnięcie zawartości nie może automatycznie odwracać transakcji graczy.
Nie wykonywać arbitralnego kodu wpisanego w kreatorze; stosować zdefiniowane efekty.

## Proponowany model danych (koncept, nie gotowe DDL)
accounts, sessions, roles, characters, character_stats, inventory_items,
equipment_slots, wallets, wallet_ledger, quest_progress, training_jobs,
combat_runs, guilds, guild_members, content_revisions, admin_audit,
idempotency_keys. Relacje, ograniczenia, indeksy i migracje wymagają
osobnego projektu. Dane instancji i definicje zawartości są rozdzielone.

## Pierwszy pionowy przekrój
Zarejestruj konto testowe → zaloguj → utwórz postać → odczytaj ją po ponownym
zalogowaniu. Testy: izolacja kont, duplikat nazwy, nieautoryzowany dostęp,
trwałość zapisu, migracja schematu. Potem przenoszenie mechanik.
Nie uruchamiać publicznego backendu przed testami i konfiguracją sekretów.
