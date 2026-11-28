CREATE TABLE craft_attempts (
 character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
 operation_id uuid NOT NULL,
 revision_id uuid NOT NULL REFERENCES content_revisions(id),
 recipe_id text NOT NULL,
 status text NOT NULL CHECK(status IN ('pending','failed','claimed','discarded')),
 result jsonb NOT NULL CHECK(jsonb_typeof(result)='object'),
 delivered_item_id uuid,
 CHECK((status='claimed')=(delivered_item_id IS NOT NULL)),
 PRIMARY KEY(character_id,operation_id)
);
CREATE UNIQUE INDEX craft_one_pending ON craft_attempts(character_id) WHERE status='pending';

-- Default recipes and items from the published legacy catalog mx0fb0vk-necykq.
DO $$
DECLARE old_id uuid; new_id uuid;
BEGIN
 SELECT id INTO STRICT old_id FROM content_revisions WHERE status='published';
 INSERT INTO content_revisions(schema_version,parent_revision_id)
 SELECT schema_version,id FROM content_revisions WHERE id=old_id RETURNING id INTO new_id;
 INSERT INTO content_definitions(revision_id,kind,definition_id,data)
 SELECT new_id,kind,definition_id,data FROM content_definitions WHERE revision_id=old_id;
 INSERT INTO content_definitions(revision_id,kind,definition_id,data)
 SELECT new_id,'item',seed.id,seed.data FROM (VALUES
 ('czarna-chi','{"name":"Czarna Chi","slot":"chi","requiredLevel":1,"stackable":false,"qualityIds":["common","uncommon","rare","epic","legendary"],"defaultQualityId":"common","base":{"attack":0,"attackMin":5,"attackMax":5,"techniqueAttack":0,"techniqueAttackMin":5,"techniqueAttackMax":5,"defense":0,"hp":0,"maxHp":0,"health":0,"ki":0},"image":"assets/items/czarna-chi.png"}'::jsonb),
 ('smith-chi','{"name":"Odłamek Energii CHI","slot":"materiał","requiredLevel":1,"stackable":true,"qualityIds":["common"],"defaultQualityId":"common","base":{"attack":0,"defense":0,"ki":0},"image":"assets/items/smith-chi.png"}'::jsonb),
 ('smith-chi-1','{"name":"Biała Chi","slot":"chi","requiredLevel":1,"stackable":false,"qualityIds":["common","uncommon","rare","epic","legendary"],"defaultQualityId":"common","base":{"attack":0,"defense":25,"ki":0,"techniqueDamagePct":1,"attackMin":0,"attackMax":0,"techniqueAttack":0,"techniqueAttackMin":0,"techniqueAttackMax":0,"hp":25,"maxHp":0,"health":0},"image":"assets/items/biala-chi.png"}'::jsonb),
 ('smith-esencja','{"name":"Kryształ Esencji","slot":"materiał","requiredLevel":1,"stackable":true,"qualityIds":["common"],"defaultQualityId":"common","base":{"attack":0,"defense":0,"ki":0},"image":"assets/items/smith-esencja.png"}'::jsonb),
 ('smith-esencja-1','{"name":"Biała Esencja","slot":"esencja","requiredLevel":1,"stackable":false,"qualityIds":["common","uncommon","rare","epic","legendary"],"defaultQualityId":"common","base":{"attack":0,"defense":0,"ki":0,"hp":20,"maxHp":0,"health":0},"image":"assets/items/biala-esencja.png"}'::jsonb),
 ('smith-ki','{"name":"Skondensowane KI","slot":"materiał","requiredLevel":1,"stackable":true,"qualityIds":["common"],"defaultQualityId":"common","base":{"attack":0,"defense":0,"ki":0},"image":"assets/items/smith-ki.png"}'::jsonb),
 ('smith-ore','{"name":"Ruda kowalstwa","slot":"materiał","requiredLevel":1,"stackable":true,"qualityIds":["common"],"defaultQualityId":"common","base":{"attack":0,"defense":0,"ki":0},"image":"assets/items/ruda-kowalstwa.png"}'::jsonb),
 ('smith-scouter','{"name":"Układ Scoutera","slot":"materiał","requiredLevel":1,"stackable":true,"qualityIds":["common"],"defaultQualityId":"common","base":{"attack":0,"defense":0,"ki":0},"image":"assets/items/smith-scouter.png"}'::jsonb),
 ('smith-scouter-1','{"name":"Biały Scouter","slot":"scouter","requiredLevel":1,"stackable":false,"qualityIds":["common","uncommon","rare","epic","legendary"],"defaultQualityId":"common","base":{"attack":0,"defense":0,"ki":0,"critChance":1,"monsterDamageReductionPct":1},"image":"assets/items/bialy-scouter.png"}'::jsonb),
 ('smith-stroj','{"name":"Włókno Treningowe","slot":"materiał","requiredLevel":1,"stackable":true,"qualityIds":["common"],"defaultQualityId":"common","base":{"attack":0,"defense":0,"ki":0},"image":"assets/items/smith-stroj.png"}'::jsonb),
 ('smith-symbol','{"name":"Fragment Symbolu","slot":"materiał","requiredLevel":1,"stackable":true,"qualityIds":["common"],"defaultQualityId":"common","base":{"attack":0,"defense":0,"ki":0},"image":"assets/items/smith-symbol.png"}'::jsonb),
 ('stroj-001','{"name":"Strój treningowy szkoły żółwia","slot":"stroj","requiredLevel":1,"stackable":false,"qualityIds":["common","uncommon","rare","epic","legendary"],"defaultQualityId":"common","base":{"attack":0,"defense":0,"ki":0,"trainingBaseBonusPercent":1},"image":"assets/items/stroj-treningowy-szkoly-zolwia.png"}'::jsonb),
 ('znak-bossa','{"name":"Znak Bossa","slot":"symbol","requiredLevel":1,"stackable":false,"qualityIds":["common","uncommon","rare","epic","legendary"],"defaultQualityId":"common","base":{"attack":0,"defense":0,"ki":0},"image":"assets/items/znak-bossa.png"}'::jsonb),
 ('znak-mistrza','{"name":"Znak Mistrza","slot":"symbol","requiredLevel":1,"stackable":false,"qualityIds":["common","uncommon","rare","epic","legendary"],"defaultQualityId":"common","base":{"attack":0,"defense":0,"ki":0},"image":"assets/items/znak-mistrza.png"}'::jsonb),
 ('znak-sily','{"name":"Znak Siły","slot":"symbol","requiredLevel":1,"stackable":false,"qualityIds":["common","uncommon","rare","epic","legendary"],"defaultQualityId":"common","base":{"attack":0,"defense":0,"ki":0},"image":"assets/items/znak-sily.png"}'::jsonb),
 ('znak-walki','{"name":"Znak Walki","slot":"symbol","requiredLevel":1,"stackable":false,"qualityIds":["common","uncommon","rare","epic","legendary"],"defaultQualityId":"common","base":{"attack":0,"defense":0,"ki":0},"image":"assets/items/znak-walki.png"}'::jsonb),
 ('znak-wojownika','{"name":"Znak Wojownika","slot":"symbol","requiredLevel":1,"stackable":false,"qualityIds":["common","uncommon","rare","epic","legendary"],"defaultQualityId":"common","base":{"attack":0,"defense":0,"ki":0},"image":"assets/items/znak-wojownika.png"}'::jsonb)
 ) AS seed(id,data)
 ON CONFLICT (revision_id,kind,definition_id) DO NOTHING;
 INSERT INTO content_definitions(revision_id,kind,definition_id,data)
 VALUES (new_id,'recipe','smith-crafting','{"chi":{"name":"Chi","level":1,"gold":10000,"chance":90,"outputs":["smith-chi-1","czarna-chi"],"materials":[{"id":"smith-chi","count":1},{"id":"smith-ki","count":1},{"id":"smith-ore","count":1}]},"symbol":{"name":"Znak","level":1,"gold":10000,"chance":90,"outputs":["znak-sily","znak-walki","znak-bossa","znak-wojownika","znak-mistrza"],"materials":[{"id":"smith-symbol","count":1},{"id":"smith-ki","count":1},{"id":"smith-ore","count":1}]},"stroj":{"name":"Strój treningowy","level":1,"gold":10000,"chance":90,"outputs":["stroj-001"],"materials":[{"id":"smith-stroj","count":1},{"id":"smith-ki","count":1},{"id":"smith-ore","count":1}]},"esencja":{"name":"Esencja","level":1,"gold":10000,"chance":90,"outputs":["smith-esencja-1"],"materials":[{"id":"smith-esencja","count":1},{"id":"smith-ki","count":1},{"id":"smith-ore","count":1}]},"scouter":{"name":"Scouter","level":1,"gold":10000,"chance":90,"outputs":["smith-scouter-1"],"materials":[{"id":"smith-scouter","count":1},{"id":"smith-ki","count":1},{"id":"smith-ore","count":1}]}}')
 ON CONFLICT (revision_id,kind,definition_id) DO NOTHING;
 UPDATE content_revisions SET status='archived' WHERE id=old_id;
 UPDATE content_revisions SET status='published' WHERE id=new_id;
END $$;
