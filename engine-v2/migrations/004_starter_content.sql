DO $$
DECLARE r uuid;
BEGIN
 INSERT INTO content_revisions(schema_version) VALUES(1) RETURNING id INTO r;
 INSERT INTO content_definitions(revision_id,kind,definition_id,data) VALUES
 (r,'starter_rules','default','{"stats":{"strength":4,"speed":5,"endurance":6,"intelligence":2,"ki":2},"level":1,"slots":5,"maxSlots":10,"slotCost":50}'),
 (r,'race','saiyan','{"name":"Saiyan"}'),
 (r,'race','ziemianin','{"name":"Ziemianin"}'),
 (r,'race','demon-mrozu','{"name":"Demon Mrozu"}'),
 (r,'race','nameczanin','{"name":"Nameczanin"}'),
 (r,'race','majin','{"name":"Majin"}');
 UPDATE content_revisions SET status='published' WHERE id=r;
END $$;
ALTER TABLE characters ADD COLUMN creation_revision_id uuid REFERENCES content_revisions(id);
