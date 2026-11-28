# Warunki migracji i regresji

## Kopie
Gałąź backup/pre-engine-v2 zabezpiecza kod, nie dane graczy. Wyeksportować
postacie z właściwej przeglądarki zgodnie z server/IMPORT.md. Kopie przechowywać
prywatnie poza publicznym GitHubem; sprawdzić możliwość odtworzenia.

## Import
Dane legacy są niezaufane. Import do osobnej bazy testowej; nie przenosić
haseł, hashy, sesji ani lokalnych ról. Zakładać nowe konta serwerowe, a
powiązanie z testowymi postaciami zatwierdzać osobno. Import powinien mieć
tryb podglądu, walidację schematu, raport odrzuceń, stabilne mapowanie ID,
atomowość i odporność na ponowienie. Zweryfikować zawartość przed importem,
nie dopuścić do wprowadzenia arbitralnego złota/przedmiotów na produkcję.
Nie usuwać zapisów źródłowych.

## Kontrakt zgodności
Poniższe zasady są wymaganiami projektowymi, nie potwierdzonym stanem kodu.
- Krytyk: zwykły atak 120%, technika 200%; premia dodawana do mnożnika.
- Unik: przypadki graniczne przy różnicy szybkości 10 000 i 1 000 000;
  porównać z zatwierdzoną regułą i ustalić limit oraz zaokrąglenia.
- Redukcja pancerza: procent od całkowitego pancerza przeciwnika.
- Trening i rozwój duchowy: blokada podczas walki z mobami.
- Boss: maks. 3 udane zabójstwa dziennie, próby bez limitu.
- Ulepszanie jakości: niepowodzenie zużywa koszt, nie zmienia przedmiotu.
- Ulepszenie i wytwarzanie nie przemieszczają przedmiotu w ekwipunku
  wbrew dotychczasowemu zachowaniu.
- Epicka jakość zachowuje czerwone oznaczenie; grafika przedmiotu to osobna cecha.

Przed ekstrakcją każdego modułu: odczytać kod, spisać dokładne reguły,
zbudować fixture i porównać wyniki. Rozbieżności oznaczyć i uzgodnić;
nie zmieniać balansu w ramach refaktoryzacji.
