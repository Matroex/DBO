DO $$
DECLARE old_id uuid; new_id uuid;
BEGIN
 SELECT id INTO STRICT old_id FROM content_revisions WHERE status='published';
 INSERT INTO content_revisions(schema_version,parent_revision_id) SELECT schema_version,id FROM content_revisions WHERE id=old_id RETURNING id INTO new_id;
 INSERT INTO content_definitions(revision_id,kind,definition_id,data)
 SELECT new_id,kind,definition_id,CASE WHEN kind='race' THEN data || jsonb_build_object('creationEnabled',definition_id IN ('saiyan','ziemianin')) ELSE data END FROM content_definitions WHERE revision_id=old_id;
 UPDATE content_revisions SET status='archived' WHERE id=old_id;
 UPDATE content_revisions SET status='published' WHERE id=new_id;
END $$;
