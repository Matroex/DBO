CREATE TABLE active_world_battles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 character_id uuid NOT NULL REFERENCES characters(id),
 revision_id uuid NOT NULL REFERENCES content_revisions(id),
 encounter_id text NOT NULL,
 state jsonb NOT NULL CHECK (jsonb_typeof(state)='object'),
 status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','finished')),
 version bigint NOT NULL DEFAULT 0 CHECK (version>=0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX active_world_battles_one_running ON active_world_battles(character_id) WHERE status='running';
CREATE INDEX active_world_battles_character_history ON active_world_battles(character_id,created_at DESC);
