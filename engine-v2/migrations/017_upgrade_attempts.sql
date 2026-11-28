CREATE TABLE upgrade_attempts (
 character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
 operation_id uuid NOT NULL,
 item_id uuid NOT NULL,
 revision_id uuid NOT NULL REFERENCES content_revisions(id),
 result jsonb NOT NULL CHECK(jsonb_typeof(result)='object'),
 PRIMARY KEY(character_id,operation_id)
);
