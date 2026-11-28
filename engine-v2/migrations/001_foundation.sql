CREATE TABLE accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 login text NOT NULL CHECK (length(login) BETWEEN 3 AND 64),
 password_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX accounts_login_unique ON accounts (lower(login));
CREATE TABLE account_roles (
 account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
 role text NOT NULL CHECK (role IN ('player','gm','admin')),
 PRIMARY KEY(account_id,role)
);
CREATE TABLE sessions (
 token_hash text PRIMARY KEY,
 account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_account_idx ON sessions(account_id);
CREATE TABLE content_revisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 revision bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 schema_version integer NOT NULL CHECK(schema_version>0),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE content_definitions (
 revision_id uuid REFERENCES content_revisions(id),
 kind text NOT NULL,
 definition_id text NOT NULL,
 data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'),
 PRIMARY KEY(revision_id,kind,definition_id)
);
CREATE TABLE characters (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 account_id uuid NOT NULL REFERENCES accounts(id),
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 64),
 race_id text NOT NULL,
 slot integer NOT NULL CHECK(slot>=0),
 level integer NOT NULL DEFAULT 1 CHECK(level>=1),
 experience numeric(40,0) NOT NULL DEFAULT 0 CHECK(experience>=0),
 state_version bigint NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(account_id,slot)
);
CREATE UNIQUE INDEX characters_name_unique ON characters(lower(name));
CREATE TABLE character_stats (
 character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
 stat_id text NOT NULL,
 value numeric(40,8) NOT NULL,
 PRIMARY KEY(character_id,stat_id)
);
CREATE TABLE inventory_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
 definition_id text NOT NULL,
 quality_id text NOT NULL,
 upgrade_level integer NOT NULL DEFAULT 0 CHECK(upgrade_level>=0),
 quantity bigint NOT NULL DEFAULT 1 CHECK(quantity>0),
 bag_slot integer CHECK(bag_slot>=0),
 equipment_slot text,
 attributes jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(attributes)='object'),
 CHECK(bag_slot IS NULL OR equipment_slot IS NULL),
 UNIQUE(character_id,bag_slot),
 UNIQUE(character_id,equipment_slot)
);
CREATE TABLE wallets (
 character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
 currency_id text NOT NULL,
 balance numeric(40,0) NOT NULL DEFAULT 0 CHECK(balance>=0),
 PRIMARY KEY(character_id,currency_id)
);
CREATE TABLE wallet_ledger (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 character_id uuid NOT NULL,
 currency_id text NOT NULL,
 delta numeric(40,0) NOT NULL CHECK(delta<>0),
 operation_id uuid NOT NULL,
 reason text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(character_id,currency_id) REFERENCES wallets(character_id,currency_id),
 UNIQUE(character_id,currency_id,operation_id)
);
CREATE TABLE quest_progress (
 character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
 quest_id text NOT NULL,
 revision_id uuid REFERENCES content_revisions(id),
 state jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(state)='object'),
 PRIMARY KEY(character_id,quest_id)
);
CREATE TABLE character_skills (
 character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
 skill_id text NOT NULL,
 level integer NOT NULL CHECK(level>=0),
 PRIMARY KEY(character_id,skill_id)
);
CREATE TABLE training_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
 revision_id uuid REFERENCES content_revisions(id),
 kind text NOT NULL,
 starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL CHECK(ends_at>=starts_at),
 status text NOT NULL CHECK(status IN ('active','completed','cancelled')),
 parameters jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(parameters)='object')
);
CREATE UNIQUE INDEX training_one_active ON training_jobs(character_id) WHERE status='active';
CREATE TABLE admin_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_id uuid NOT NULL REFERENCES accounts(id),
 action text NOT NULL,
 target_id text,
 details jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(details)='object'),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE idempotency_keys (
 account_id uuid REFERENCES accounts(id),
 key text NOT NULL,
 request_hash text NOT NULL,
 response jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(account_id,key)
);
