ALTER TABLE upgrade_attempts ADD COLUMN kind text NOT NULL DEFAULT 'upgrade' CHECK(kind IN ('upgrade','quality'));

DO $$
DECLARE old_id uuid; new_id uuid;
BEGIN
 SELECT id INTO STRICT old_id FROM content_revisions WHERE status='published';
 INSERT INTO content_revisions(schema_version,parent_revision_id)
 SELECT schema_version,id FROM content_revisions WHERE id=old_id RETURNING id INTO new_id;
 INSERT INTO content_definitions(revision_id,kind,definition_id,data)
 SELECT new_id,kind,definition_id,data FROM content_definitions WHERE revision_id=old_id;
 INSERT INTO content_definitions(revision_id,kind,definition_id,data)
 SELECT new_id,'item',id,jsonb_build_object(
   'name',name,'slot','materiał','stackable',true,'requiredLevel',1,
   'qualityIds',jsonb_build_array('common'),'defaultQualityId','common',
   'base','{"attack":0,"defense":0,"ki":0}'::jsonb,'image','assets/items/'||id||'.png')
 FROM (VALUES
  ('smith-upgrade-1','Substancja Wynosząca'),
  ('smith-upgrade-2','Części zamienne'),
  ('smith-quality-common','Moduł Zwykły'),
  ('smith-quality-rare','Moduł Rzadki'),
  ('smith-quality-epic','Moduł Epicki'),
  ('smith-quality-legendary','Moduł Legendarny')
 ) AS materials(id,name)
 ON CONFLICT (revision_id,kind,definition_id) DO NOTHING;
 UPDATE content_revisions SET status='archived' WHERE id=old_id;
 UPDATE content_revisions SET status='published' WHERE id=new_id;
END $$;
