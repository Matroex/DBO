CREATE TABLE boss_victories (
 battle_id uuid PRIMARY KEY REFERENCES battle_records(id),
 character_id uuid NOT NULL REFERENCES characters(id),
 boss_id text NOT NULL,
 victory_day date NOT NULL
);
CREATE INDEX boss_victories_daily_idx ON boss_victories(character_id,boss_id,victory_day);
DO $$
DECLARE old_id uuid; new_id uuid;
BEGIN
 SELECT id INTO STRICT old_id FROM content_revisions WHERE status='published';
 INSERT INTO content_revisions(schema_version,parent_revision_id) SELECT schema_version,id FROM content_revisions WHERE id=old_id RETURNING id INTO new_id;
 INSERT INTO content_definitions(revision_id,kind,definition_id,data) SELECT new_id,kind,definition_id,data FROM content_definitions WHERE revision_id=old_id;
 INSERT INTO content_definitions(revision_id,kind,definition_id,data) VALUES
 (new_id,'enemy','forestedge:boss','{"mode":"boss","mapId":"forestEdge","name":"Strażnik Lasu","level":500,"stats":{"race":"Ziemianin","strength":20000,"speed":25000,"endurance":50000,"intelligence":10000,"ki":20000,"attack":2000,"defense":30000,"hp":100000},"gold":50000,"exp":50000,"drops":[{"itemId":"guardian-chest","quantity":1,"chancePct":100}],"special":{"firstHalfHpAttackMultiplier":3,"healAmount":2000,"healIntervalMs":3000}}'::jsonb),
 (new_id,'enemy','centralforest:boss','{"mode":"boss","mapId":"centralForest","name":"Leśny Wojownik (Boss)","level":120,"stats":{"strength":800,"speed":900,"endurance":700,"intelligence":450,"ki":100,"baseAttack":250,"baseDefense":150,"attack":650,"defense":220,"hp":6000},"gold":1000,"exp":10000,"drops":[{"itemId":"skrzynia-lesnego-wojownika","quantity":1,"chancePct":100}]}'::jsonb),
 (new_id,'combat_rules','boss_daily','{"maxWins":3,"timeZone":"Europe/Warsaw"}'::jsonb);
 UPDATE content_revisions SET status='archived' WHERE id=old_id;
 UPDATE content_revisions SET status='published' WHERE id=new_id;
END $$;
