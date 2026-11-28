CREATE TABLE battle_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 character_id uuid NOT NULL REFERENCES characters(id),
 revision_id uuid NOT NULL REFERENCES content_revisions(id),
 mode text NOT NULL CHECK(mode IN ('story','pvp','tournament','mob','boss','dungeon')),
 outcome text NOT NULL CHECK(outcome IN ('win','loss','draw')),
 rounds integer NOT NULL CHECK(rounds>=0),
 result jsonb NOT NULL CHECK(jsonb_typeof(result)='object'),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX battle_records_character_idx ON battle_records(character_id,created_at DESC);
CREATE TABLE battle_reward_claims (
 battle_id uuid PRIMARY KEY REFERENCES battle_records(id),
 reward jsonb NOT NULL CHECK(jsonb_typeof(reward)='object'),
 claimed_at timestamptz NOT NULL DEFAULT now()
);
