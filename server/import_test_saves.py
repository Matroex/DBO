import argparse
import json
import sqlite3
from pathlib import Path

PREFIXES = set(json.loads(Path(__file__).with_name("save-prefixes.json").read_text()))


def json_text(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def validate(bundle):
    if not isinstance(bundle, dict) or bundle.get("format") != "dboidle-test-export-v1":
        raise ValueError("Nieobsługiwany format eksportu.")
    accounts = bundle["accounts"]
    catalog = bundle["catalog"]
    if not isinstance(accounts, list) or not accounts or not isinstance(catalog, list):
        raise ValueError("Eksport musi zawierać konta z postaciami oraz katalog.")
    ids, logins, item_ids = set(), set(), set()
    for item in catalog:
        item_id = item["id"]
        if not isinstance(item_id, str) or not item_id or item_id in item_ids:
            raise ValueError("Nieprawidłowy lub powtórzony identyfikator przedmiotu.")
        item_ids.add(item_id)
    for account in accounts:
        login = account["login"]
        if not isinstance(login, str) or not login.strip() or login.casefold() in logins:
            raise ValueError("Nieprawidłowa lub powtórzona nazwa konta.")
        logins.add(login.casefold())
        if not isinstance(account["characters"], list) or not account["characters"]:
            raise ValueError("Konto bez postaci.")
        for record in account["characters"]:
            character, save = record["character"], record["save"]
            char_id = character["id"]
            if not isinstance(char_id, str) or not char_id or char_id in ids:
                raise ValueError("Nieprawidłowy lub powtórzony identyfikator postaci.")
            if not isinstance(character["name"], str) or not character["name"].strip():
                raise ValueError("Postać bez nazwy.")
            if not isinstance(save, dict) or not all(
                key in PREFIXES and isinstance(value, str) for key, value in save.items()
            ):
                raise ValueError("Nieprawidłowe dane zapisu postaci.")
            ids.add(char_id)
    return accounts, catalog


def import_bundle(database, bundle):
    accounts, catalog = validate(bundle)
    with sqlite3.connect(database) as db:
        db.execute("PRAGMA foreign_keys = ON")
        db.execute("BEGIN")
        db.execute("""CREATE TABLE IF NOT EXISTS test_accounts (
            login TEXT PRIMARY KEY COLLATE NOCASE
        )""")
        db.execute("""CREATE TABLE IF NOT EXISTS test_characters (
            id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES test_accounts(login),
            name TEXT NOT NULL, character_json TEXT NOT NULL, save_json TEXT NOT NULL
        )""")
        db.execute("""CREATE TABLE IF NOT EXISTS test_item_catalog (
            id TEXT PRIMARY KEY, definition_json TEXT NOT NULL
        )""")
        created = 0
        for account in accounts:
            login = account["login"]
            db.execute("INSERT OR IGNORE INTO test_accounts VALUES (?)", (login,))
            for record in account["characters"]:
                character = record["character"]
                row = (character["id"], login, character["name"],
                       json_text(character), json_text(record["save"]))
                existing = db.execute(
                    "SELECT * FROM test_characters WHERE id = ?", (row[0],)
                ).fetchone()
                if existing is None:
                    db.execute("INSERT INTO test_characters VALUES (?, ?, ?, ?, ?)", row)
                    created += 1
                elif existing != row:
                    raise ValueError(f"Konflikt istniejącego zapisu postaci: {row[0]}")
        for item in catalog:
            row = item["id"], json_text(item)
            existing = db.execute(
                "SELECT * FROM test_item_catalog WHERE id = ?", (row[0],)
            ).fetchone()
            if existing is None:
                db.execute("INSERT INTO test_item_catalog VALUES (?, ?)", row)
            elif existing != row:
                raise ValueError(f"Konflikt istniejącej definicji przedmiotu: {row[0]}")
    return created


def main():
    parser = argparse.ArgumentParser(description="Import postaci testowych DBOidle do SQLite.")
    parser.add_argument("export", type=Path, help="Plik JSON wyeksportowany z gry")
    parser.add_argument("database", type=Path, help="Ścieżka do bazy SQLite")
    args = parser.parse_args()
    try:
        bundle = json.loads(args.export.read_text(encoding="utf-8"))
        count = import_bundle(args.database, bundle)
    except (OSError, ValueError, TypeError, KeyError, sqlite3.Error) as error:
        parser.exit(1, f"Import nieudany. {error}\n")
    print(f"Nowe postacie testowe: {count}")


if __name__ == "__main__":
    main()
