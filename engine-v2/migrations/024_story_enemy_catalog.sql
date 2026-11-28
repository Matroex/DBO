-- Exact published editor story opponents; no balancing changes.
DO $$
DECLARE old_id uuid; new_id uuid;
BEGIN
 SELECT id INTO STRICT old_id FROM content_revisions WHERE status='published';
 INSERT INTO content_revisions(schema_version,parent_revision_id) SELECT schema_version,id FROM content_revisions WHERE id=old_id RETURNING id INTO new_id;
 INSERT INTO content_definitions(revision_id,kind,definition_id,data) SELECT new_id,kind,definition_id,data FROM content_definitions WHERE revision_id=old_id;
 INSERT INTO content_definitions(revision_id,kind,definition_id,data) VALUES
 (new_id,'enemy','pierwsza-podroz-kontynuacja:step:1','{"name":"Generał żółty","race":"Człowiek","art":"","level":100,"strength":1000,"speed":1000,"endurance":1000,"intelligence":400,"ki":0,"attack":500,"defense":500,"hp":2000,"maxKi":0,"mode":"story","questId":"pierwsza-podroz-kontynuacja","stepIndex":1,"mapId":"armyBase"}'::jsonb),
 (new_id,'enemy','pierwsza-podroz-kontynuacja:step:2','{"name":"Generał Czerwony","race":"Człowiek","art":"","level":50,"strength":100,"speed":100,"endurance":100,"intelligence":10,"ki":0,"attack":10,"defense":10,"hp":200,"maxKi":0,"mode":"story","questId":"pierwsza-podroz-kontynuacja","stepIndex":2,"mapId":"armyBase"}'::jsonb),
 (new_id,'enemy','pierwsza-podroz-kontynuacja:step:3','{"name":"Generał Czarny","race":"Człowiek","art":"","level":50,"strength":200,"speed":200,"endurance":200,"intelligence":300,"ki":0,"attack":200,"defense":200,"hp":500,"maxKi":0,"mode":"story","questId":"pierwsza-podroz-kontynuacja","stepIndex":3,"mapId":"armyBase"}'::jsonb),
 (new_id,'enemy','pierwsza-podroz-kontynuacja:step:4','{"name":"Generał Czarny w maszynie","race":"Człowiek","art":"","level":130,"strength":2000,"speed":1500,"endurance":3000,"intelligence":300,"ki":0,"attack":600,"defense":2000,"hp":3000,"maxKi":10,"mode":"story","questId":"pierwsza-podroz-kontynuacja","stepIndex":4,"mapId":"armyBase"}'::jsonb),
 (new_id,'enemy','pierwsza-podroz-kontynuacja:step:7','{"name":"Groźnie wyglądający mężczyzna","race":"Człowiek","art":"","level":110,"strength":1600,"speed":2000,"endurance":2000,"intelligence":500,"ki":200,"attack":600,"defense":1700,"hp":4000,"maxKi":100,"mode":"story","questId":"pierwsza-podroz-kontynuacja","stepIndex":7,"mapId":"centralSector"}'::jsonb),
 (new_id,'enemy','pierwsza-podroz-kontynuacja:step:11','{"name":"Niedobitki Armii","race":"Człowiek","art":"","level":150,"strength":2500,"speed":2500,"endurance":3000,"intelligence":400,"ki":0,"attack":800,"defense":2000,"hp":4000,"maxKi":100,"mode":"story","questId":"pierwsza-podroz-kontynuacja","stepIndex":11,"mapId":"banditLand"}'::jsonb),
 (new_id,'enemy','nowy-quest-2:step:2','{"name":"Wojownik","race":"Człowiek","art":"","level":100,"strength":1200,"speed":1000,"endurance":3000,"intelligence":800,"ki":1000,"attack":400,"defense":3000,"hp":4000,"maxKi":2000,"mode":"story","questId":"nowy-quest-2","stepIndex":2,"mapId":"armyBase"}'::jsonb),
 (new_id,'enemy','nowy-quest-4:step:5','{"name":"Pamput","race":"Człowiek","art":"","level":40,"strength":200,"speed":200,"endurance":300,"intelligence":100,"ki":0,"attack":50,"defense":50,"hp":1000,"maxKi":0,"mode":"story","questId":"nowy-quest-4","stepIndex":5,"mapId":"nowa-mapa-5"}'::jsonb),
 (new_id,'enemy','nowy-quest-4:step:6','{"name":"Krilan","race":"Człowiek","art":"","level":110,"strength":2000,"speed":2000,"endurance":3000,"intelligence":1500,"ki":1000,"attack":1000,"defense":4000,"hp":8000,"maxKi":4000,"mode":"story","questId":"nowy-quest-4","stepIndex":6,"mapId":"nowa-mapa-5"}'::jsonb),
 (new_id,'enemy','nowy-quest-4:step:7','{"name":"TenShin","race":"Człowiek","art":"","level":150,"strength":4000,"speed":4000,"endurance":8000,"intelligence":6000,"ki":8000,"attack":3500,"defense":10000,"hp":15000,"maxKi":500,"mode":"story","questId":"nowy-quest-4","stepIndex":7,"mapId":"nowa-mapa-5"}'::jsonb);
 UPDATE content_revisions SET status='archived' WHERE id=old_id;
 UPDATE content_revisions SET status='published' WHERE id=new_id;
END $$;
