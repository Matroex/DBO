CREATE TABLE smith_experience_awards (
 character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
 operation_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('craft','quality')),
 tier bigint NOT NULL CHECK((kind='craft' AND tier BETWEEN 1 AND 9007199254740991) OR (kind='quality' AND tier BETWEEN 0 AND 3)),
 success boolean NOT NULL,
 gained integer NOT NULL CHECK(gained BETWEEN 0 AND 4350),
 total_after integer NOT NULL CHECK(total_after BETWEEN gained AND 4350),
 PRIMARY KEY(character_id,operation_id)
);
