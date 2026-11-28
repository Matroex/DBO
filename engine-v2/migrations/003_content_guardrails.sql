CREATE UNIQUE INDEX content_one_published ON content_revisions ((status)) WHERE status='published';
ALTER TABLE content_revisions ADD COLUMN published_at timestamptz;
ALTER TABLE content_revisions ADD COLUMN parent_revision_id uuid REFERENCES content_revisions(id);
CREATE FUNCTION protect_content_definition() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; revision_status text;
BEGIN
 IF TG_OP='UPDATE' AND NEW.revision_id<>OLD.revision_id THEN RAISE EXCEPTION 'Cannot move definition'; END IF;
 IF TG_OP='DELETE' THEN target:=OLD.revision_id; ELSE target:=NEW.revision_id; END IF;
 SELECT status INTO revision_status FROM content_revisions WHERE id=target FOR UPDATE;
 IF revision_status IS DISTINCT FROM 'draft' THEN RAISE EXCEPTION 'Only draft definitions are editable'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER content_definition_guard BEFORE INSERT OR UPDATE OR DELETE ON content_definitions FOR EACH ROW EXECUTE FUNCTION protect_content_definition();
CREATE FUNCTION protect_content_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.status<>'draft' THEN RAISE EXCEPTION 'Cannot delete published history'; END IF;
  RETURN OLD;
 END IF;
 IF OLD.status<>'draft' THEN
  IF NEW.status NOT IN ('published','archived') OR NEW.schema_version<>OLD.schema_version OR NEW.parent_revision_id IS DISTINCT FROM OLD.parent_revision_id OR NEW.published_at IS DISTINCT FROM OLD.published_at OR NEW.id<>OLD.id OR NEW.revision<>OLD.revision OR NEW.created_at<>OLD.created_at THEN
   RAISE EXCEPTION 'Cannot rewrite published history';
  END IF;
 END IF;
 IF OLD.status='draft' AND NEW.status='published' THEN NEW.published_at:=now(); END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER content_revision_guard BEFORE UPDATE OR DELETE ON content_revisions FOR EACH ROW EXECUTE FUNCTION protect_content_revision();
