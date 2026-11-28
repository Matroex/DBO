DROP INDEX characters_name_unique;
CREATE UNIQUE INDEX characters_account_name_unique ON characters(account_id,lower(name));
ALTER TABLE accounts ADD COLUMN character_limit integer NOT NULL DEFAULT 5 CHECK(character_limit BETWEEN 5 AND 10);
ALTER TABLE characters ADD COLUMN child_code text NOT NULL DEFAULT '';
ALTER TABLE characters ADD CONSTRAINT character_slot_max CHECK(slot<10);
