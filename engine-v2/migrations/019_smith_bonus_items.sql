-- Biała Chi and Znak Mistrza from published legacy catalog mx0fb0vk-necykq.
DO $$
DECLARE old_id uuid; new_id uuid;
BEGIN
 SELECT id INTO STRICT old_id FROM content_revisions WHERE status='published';
 INSERT INTO content_revisions(schema_version,parent_revision_id)
 SELECT schema_version,id FROM content_revisions WHERE id=old_id RETURNING id INTO new_id;
 INSERT INTO content_definitions(revision_id,kind,definition_id,data)
 SELECT new_id,kind,definition_id,data FROM content_definitions WHERE revision_id=old_id;
 INSERT INTO content_definitions(revision_id,kind,definition_id,data) VALUES
 (new_id,'item','smith-chi-1','{"name":"Biała Chi","slot":"chi","stackable":false,"requiredLevel":1,"qualityIds":["common","uncommon","rare","epic","legendary"],"defaultQualityId":"common","base":{"attack":0,"defense":25,"ki":0,"techniqueDamagePct":1,"attackMin":0,"attackMax":0,"techniqueAttack":0,"techniqueAttackMin":0,"techniqueAttackMax":0,"hp":25,"maxHp":0,"health":0},"image":"assets/items/biala-chi.png"}'),
 (new_id,'item','znak-mistrza','{"name":"Znak Mistrza","slot":"symbol","stackable":false,"requiredLevel":1,"qualityIds":["common","uncommon","rare","epic","legendary"],"defaultQualityId":"common","base":{"attack":0,"defense":0,"ki":0},"image":"assets/items/znak-mistrza.png"}')
 ON CONFLICT (revision_id,kind,definition_id) DO NOTHING;
 UPDATE content_revisions SET status='archived' WHERE id=old_id;
 UPDATE content_revisions SET status='published' WHERE id=new_id;
END $$;
