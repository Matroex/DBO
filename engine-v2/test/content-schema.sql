BEGIN;
DO $$
DECLARE r uuid; rejected boolean:=false;
BEGIN
 UPDATE content_revisions SET status='archived' WHERE status='published';
 INSERT INTO content_revisions(schema_version) VALUES(1) RETURNING id INTO r;
 INSERT INTO content_definitions VALUES(r,'quest','test','{}');
 UPDATE content_revisions SET status='published' WHERE id=r;
 BEGIN
 UPDATE content_definitions SET data='{"changed":true}' WHERE revision_id=r;
 EXCEPTION WHEN raise_exception THEN rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'Published definition editable'; END IF;
 UPDATE content_revisions SET status='archived' WHERE id=r;
 UPDATE content_revisions SET status='published' WHERE id=r;
END $$;
ROLLBACK;
