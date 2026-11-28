CREATE TABLE character_smith_progress (
 character_id uuid PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
 experience integer NOT NULL DEFAULT 0 CHECK(experience BETWEEN 0 AND 4350)
);
