-- Legacy world drops have no sale price; custom encounter drops are also unsellable.
DO $$
DECLARE old_id uuid; new_id uuid;
BEGIN
 SELECT id INTO STRICT old_id FROM content_revisions WHERE status='published';
 INSERT INTO content_revisions(schema_version,parent_revision_id) SELECT schema_version,id FROM content_revisions WHERE id=old_id RETURNING id INTO new_id;
 INSERT INTO content_definitions(revision_id,kind,definition_id,data)
 SELECT new_id,kind,definition_id,CASE WHEN kind='item' AND definition_id IN ('high-tower-chest','reinforcement-plans','addition-chip','small-dragon-balls','red-ribbon-badge','quest-turtle-stone','dragon-radar','pierscien-ojca','zen-bean-red','zen-bean-blue','dragon-ball-dust','smith-ore','ruda-kowalstwa','guardian-chest','skrzynia-lesnego-wojownika','smith-stroj','smith-quality-common','smith-ki') THEN data || '{"sell":0,"sellable":false}'::jsonb ELSE data END FROM content_definitions WHERE revision_id=old_id;
 UPDATE content_revisions SET status='archived' WHERE id=old_id;
 UPDATE content_revisions SET status='published' WHERE id=new_id;
END $$;
