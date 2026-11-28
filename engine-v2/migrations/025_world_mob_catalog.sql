DO $$
DECLARE old_id uuid; new_id uuid;
BEGIN
 SELECT id INTO STRICT old_id FROM content_revisions WHERE status='published';
 INSERT INTO content_revisions(schema_version,parent_revision_id) SELECT schema_version,id FROM content_revisions WHERE id=old_id RETURNING id INTO new_id;
 INSERT INTO content_definitions(revision_id,kind,definition_id,data) SELECT new_id,kind,definition_id,data FROM content_definitions WHERE revision_id=old_id;
 INSERT INTO content_definitions(revision_id,kind,definition_id,data) VALUES
 (new_id,'enemy','forest:mob:0','{"mode":"mob","mapId":"forest","variant":1,"name":"Dzikie zwierzę","level":5}'::jsonb),
 (new_id,'enemy','forest:mob:1','{"mode":"mob","mapId":"forest","variant":2,"name":"Dzikie zwierzę (Silny)","level":8}'::jsonb),
 (new_id,'enemy','forest:mob:2','{"mode":"mob","mapId":"forest","variant":3,"name":"Dzikie zwierzę (Super)","level":13}'::jsonb),
 (new_id,'enemy','mountain:mob:0','{"mode":"mob","mapId":"mountain","variant":1,"name":"Zamachowiec Góry","level":20}'::jsonb),
 (new_id,'enemy','mountain:mob:1','{"mode":"mob","mapId":"mountain","variant":2,"name":"Zamachowiec Góry (Silny)","level":25}'::jsonb),
 (new_id,'enemy','mountain:mob:2','{"mode":"mob","mapId":"mountain","variant":3,"name":"Zamachowiec Góry (Super)","level":30}'::jsonb),
 (new_id,'enemy','hightowerforest:mob:0','{"mode":"mob","mapId":"highTowerForest","variant":1,"name":"Wojownik Czerwonej Wstęgi","level":50}'::jsonb),
 (new_id,'enemy','hightowerforest:mob:1','{"mode":"mob","mapId":"highTowerForest","variant":2,"name":"Wojownik Czerwonej Wstęgi (Silny)","level":60}'::jsonb),
 (new_id,'enemy','hightowerforest:mob:2','{"mode":"mob","mapId":"highTowerForest","variant":3,"name":"Wojownik Czerwonej Wstęgi (Super)","level":80}'::jsonb),
 (new_id,'enemy','mountainlake:mob:0','{"mode":"mob","mapId":"mountainLake","variant":1,"name":"Wojownik gór","level":55}'::jsonb),
 (new_id,'enemy','mountainlake:mob:1','{"mode":"mob","mapId":"mountainLake","variant":2,"name":"Wojownik gór (Silny)","level":65}'::jsonb),
 (new_id,'enemy','mountainlake:mob:2','{"mode":"mob","mapId":"mountainLake","variant":3,"name":"Wojownik gór (Super)","level":85}'::jsonb),
 (new_id,'enemy','mountaintown:mob:0','{"mode":"mob","mapId":"mountainTown","variant":1,"name":"Strażnik ruin","level":85}'::jsonb),
 (new_id,'enemy','mountaintown:mob:1','{"mode":"mob","mapId":"mountainTown","variant":2,"name":"Strażnik ruin (Silny)","level":90}'::jsonb),
 (new_id,'enemy','mountaintown:mob:2','{"mode":"mob","mapId":"mountainTown","variant":3,"name":"Strażnik ruin (Super)","level":95}'::jsonb),
 (new_id,'enemy','armybase:mob:0','{"mode":"mob","mapId":"armyBase","variant":1,"name":"Najemnik Czerwonej Wstęgi","level":100}'::jsonb),
 (new_id,'enemy','armybase:mob:1','{"mode":"mob","mapId":"armyBase","variant":2,"name":"Najemnik Czerwonej Wstęgi (Silny)","level":110}'::jsonb),
 (new_id,'enemy','armybase:mob:2','{"mode":"mob","mapId":"armyBase","variant":3,"name":"Najemnik Czerwonej Wstęgi (Super)","level":120}'::jsonb),
 (new_id,'enemy','centralforest:mob:0','{"mode":"mob","mapId":"centralForest","variant":1,"name":"Leśny Wojownik","level":30}'::jsonb),
 (new_id,'enemy','centralforest:mob:1','{"mode":"mob","mapId":"centralForest","variant":2,"name":"Leśny Wojownik (Silny)","level":36}'::jsonb),
 (new_id,'enemy','centralforest:mob:2','{"mode":"mob","mapId":"centralForest","variant":3,"name":"Leśny Wojownik (Super)","level":41}'::jsonb),
 (new_id,'enemy','centralsector:mob:0','{"mode":"mob","mapId":"centralSector","variant":1,"name":"Opryszek","level":120}'::jsonb),
 (new_id,'enemy','centralsector:mob:1','{"mode":"mob","mapId":"centralSector","variant":2,"name":"Opryszek (Silny)","level":140}'::jsonb),
 (new_id,'enemy','centralsector:mob:2','{"mode":"mob","mapId":"centralSector","variant":3,"name":"Opryszek (Super)","level":160}'::jsonb),
 (new_id,'enemy','banditland:mob:0','{"mode":"mob","mapId":"banditLand","variant":1,"name":"Bandycka szumowina","level":125}'::jsonb),
 (new_id,'enemy','banditland:mob:1','{"mode":"mob","mapId":"banditLand","variant":2,"name":"Bandycka szumowina (Silna)","level":145}'::jsonb),
 (new_id,'enemy','banditland:mob:2','{"mode":"mob","mapId":"banditLand","variant":3,"name":"Bandycka szumowina (Super)","level":165}'::jsonb),
 (new_id,'enemy','laguna:mob:0','{"mode":"mob","mapId":"laguna","variant":1,"name":"Kukła Treningowa","level":1}'::jsonb),
 (new_id,'enemy','island:mob:0','{"mode":"mob","mapId":"island","variant":1,"name":"Uczeń Mistrza","level":3}'::jsonb),
 (new_id,'enemy','nowa-mapa-3:mob:0','{"mode":"mob","mapId":"nowa-mapa-3","variant":1,"name":"Leśny smok","level":100}'::jsonb),
 (new_id,'enemy','nowa-mapa-3:mob:1','{"mode":"mob","mapId":"nowa-mapa-3","variant":2,"name":"Leśny smok (Silny)","level":105}'::jsonb),
 (new_id,'enemy','nowa-mapa-3:mob:2','{"mode":"mob","mapId":"nowa-mapa-3","variant":3,"name":"Leśny smok (Super)","level":110}'::jsonb),
 (new_id,'enemy','nowa-mapa-4:mob:0','{"mode":"mob","mapId":"nowa-mapa-4","variant":1,"name":"Wędrowny Smoczek","level":130}'::jsonb),
 (new_id,'enemy','nowa-mapa-4:mob:1','{"mode":"mob","mapId":"nowa-mapa-4","variant":2,"name":"Wędrowny Smoczek (Silny)","level":135}'::jsonb),
 (new_id,'enemy','nowa-mapa-4:mob:2','{"mode":"mob","mapId":"nowa-mapa-4","variant":3,"name":"Wędrowny Smoczek (Super)","level":140}'::jsonb),
 (new_id,'enemy','nowa-mapa-6:mob:0','{"mode":"mob","mapId":"nowa-mapa-6","variant":1,"name":"Lodowa Imitacja","level":135}'::jsonb),
 (new_id,'enemy','nowa-mapa-6:mob:1','{"mode":"mob","mapId":"nowa-mapa-6","variant":2,"name":"Lodowa Imitacja (Silny)","level":140}'::jsonb),
 (new_id,'enemy','nowa-mapa-6:mob:2','{"mode":"mob","mapId":"nowa-mapa-6","variant":3,"name":"Lodowa Imitacja (Super)","level":145}'::jsonb),
 (new_id,'enemy','nowa-mapa-7:mob:0','{"mode":"mob","mapId":"nowa-mapa-7","variant":1,"name":"Iluzja","level":140}'::jsonb),
 (new_id,'enemy','nowa-mapa-7:mob:1','{"mode":"mob","mapId":"nowa-mapa-7","variant":2,"name":"Iluzja (Silny)","level":145}'::jsonb),
 (new_id,'enemy','nowa-mapa-7:mob:2','{"mode":"mob","mapId":"nowa-mapa-7","variant":3,"name":"Iluzja (Super)","level":150}'::jsonb),
 (new_id,'combat_rules','world_mob_stats','{"strengthPerLevel":4,"lagunaStrengthPerLevel":0,"speedPerLevel":2,"endurancePerLevel":3,"attackPerStrength":0.5,"defensePerEndurance":0.1,"hpPerLevel":5,"hpBonusThreshold":100,"hpBonus":5000,"goldPerLevel":5}'::jsonb);
 UPDATE content_revisions SET status='archived' WHERE id=old_id;
 UPDATE content_revisions SET status='published' WHERE id=new_id;
END $$;
