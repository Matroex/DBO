DO $$
DECLARE old_id uuid; new_id uuid;
BEGIN
 SELECT id INTO STRICT old_id FROM content_revisions WHERE status='published';
 INSERT INTO content_revisions(schema_version,parent_revision_id) SELECT schema_version,id FROM content_revisions WHERE id=old_id RETURNING id INTO new_id;
 INSERT INTO content_definitions(revision_id,kind,definition_id,data) SELECT new_id,kind,definition_id,data FROM content_definitions WHERE revision_id=old_id;
 INSERT INTO content_definitions(revision_id,kind,definition_id,data) VALUES(new_id,'combat_rules','mob_xp','{"qualityBase":[50,100,150],"highDifference":10,"highMultiplier":1.2,"positiveMultiplier":1.1,"equalMultiplier":1,"lowDifference":-5,"lowMultiplier":0.01,"negativeStep":0.1,"spiritFactor":20,"doubleMultiplier":2}');
 UPDATE content_revisions SET status='archived' WHERE id=old_id;
 UPDATE content_revisions SET status='published' WHERE id=new_id;
END $$;
