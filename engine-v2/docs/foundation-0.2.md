# Foundation 0.2 — development scaffold
Node.js 22+, TypeScript 5.8.3. From engine-v2: npm install, npm test, npm start.
GET http://127.0.0.1:3000/api/v1/health reports process liveness only.
GET /api/v1/modules lists planned domain modules, not implemented features.
The server binds loopback only. No player data or authentication is exposed.
For local PostgreSQL, copy .env.example to .env, set a unique password,
then docker compose up -d. The database is not yet connected to the API.
No production schema or migrations are applied. Next: review account and
character schema, implement migration runner, real sessions and persistence.
Legacy game and main deployment are untouched. Do not merge or deploy yet.
