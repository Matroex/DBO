# Import postaci testowych DBOidle

W aktualnej instalacji gry podmień `index.html` i `js/app.js`. Otwórz grę w tym samym miejscu i profilu przeglądarki, w którym są zapisy. W **GM → Eksport postaci testowych** pobierz `DBOidle_Postacie_Testowe.json`. Dane dotyczą wszystkich postaci zapisanych w tej przeglądarce.

Z katalogu, do którego rozpakowano paczkę, uruchom:

```sh
python3 server/import_test_saves.py DBOidle_Postacie_Testowe.json dboidle-test.sqlite
```

Import zapisuje postacie w tabeli testowej i zachowuje ich właścicieli, katalog oraz dostępne dane postępów. Ponowny import identycznego pliku pomija zapisane postacie. Konflikt przerywa cały import. Eksport nie zawiera lokalnych haseł ani sesji. Konta do logowania serwerowego będą zakładane osobno w etapie podłączania serwera.
