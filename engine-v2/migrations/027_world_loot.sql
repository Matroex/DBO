DO $$
DECLARE old_id uuid; new_id uuid;
BEGIN
 SELECT id INTO STRICT old_id FROM content_revisions WHERE status='published';
 INSERT INTO content_revisions(schema_version,parent_revision_id) SELECT schema_version,id FROM content_revisions WHERE id=old_id RETURNING id INTO new_id;
 INSERT INTO content_definitions(revision_id,kind,definition_id,data) SELECT new_id,kind,definition_id,data FROM content_definitions WHERE revision_id=old_id;
 INSERT INTO content_definitions(revision_id,kind,definition_id,data) VALUES
 (new_id,'loot_table','world_common','{"rows":[{"itemId":"zen-bean-red","quantity":1,"chancePct":1},{"itemId":"zen-bean-blue","quantity":1,"chancePct":1},{"itemId":"dragon-ball-dust","quantity":1,"chancePct":1}]}'::jsonb),
 (new_id,'loot_table','world_forest','{"rows":[{"itemId":"quest-turtle-stone","quantity":1,"chancePct":1},{"itemId":"small-dragon-balls","quantity":1,"chancePct":1}]}'::jsonb),
 (new_id,'loot_table','world_central_warrior','{"rows":[{"itemId":"smith-ore","quantity":1,"chancePct":1,"smithBonus":true},{"itemId":"quest-turtle-stone","quantity":1,"chancePct":1},{"itemId":"small-dragon-balls","quantity":1,"chancePct":1}]}'::jsonb),
 (new_id,'loot_table','world_mountain_lake','{"rows":[{"itemId":"small-dragon-balls","quantity":1,"chancePct":1},{"itemId":"quest-turtle-stone","quantity":1,"chancePct":1},{"itemId":"dragon-radar","quantity":1,"chancePct":1}]}'::jsonb),
 (new_id,'loot_table','world_red_ribbon','{"rows":[{"itemId":"small-dragon-balls","quantity":1,"chancePct":1},{"itemId":"red-ribbon-badge","quantity":1,"chancePct":1}]}'::jsonb),
 (new_id,'loot_table','world_hidden','{"rows":[{"itemId":"reinforcement-plans","quantity":1,"chancePct":0.001},{"itemId":"addition-chip","quantity":1,"chancePct":0.001}],"minimumPlayerLevel":100}'::jsonb),
 (new_id,'loot_table','world_dungeon','{"rows":[{"itemId":"dragon-ball-dust","quantity":1,"chancePct":1},{"itemId":"smith-stroj","quantity":1,"chancePct":1},{"itemId":"dragon-radar","quantity":1,"chancePct":1},{"itemId":"quest-turtle-stone","quantity":1,"chancePct":1},{"itemId":"small-dragon-balls","quantity":1,"chancePct":1},{"itemId":"smith-quality-common","quantity":1,"chancePct":1},{"itemId":"smith-ore","quantity":1,"chancePct":1},{"itemId":"smith-ki","quantity":1,"chancePct":1}]}'::jsonb);
 UPDATE content_revisions SET status='archived' WHERE id=old_id;
 UPDATE content_revisions SET status='published' WHERE id=new_id;
END $$;
