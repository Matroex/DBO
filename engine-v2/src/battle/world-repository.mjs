// Internal service only. The caller must authorize the character and construct state from trusted content.
function validateState(s){
 if(!s||typeof s!=='object'||!['running','finished'].includes(s.status)||!Number.isFinite(s.started)||!Number.isFinite(s.processedThrough)||s.processedThrough<s.started||!Array.isArray(s.enemies)||!s.hero)throw Error('Invalid world battle state');
}
export async function startWorldBattle(pool,{characterId,revisionId,encounterId,state}){
 validateState(state);if(state.status!=='running')throw Error('Battle must start running');
 const c=await pool.connect();
 try{await c.query('BEGIN');
 const lock=await c.query('SELECT id FROM characters WHERE id=$1 FOR UPDATE',[characterId]);if(!lock.rowCount)throw Error('Character missing');
 const q=await c.query("INSERT INTO active_world_battles(character_id,revision_id,encounter_id,state) VALUES($1,$2,$3,$4::jsonb) RETURNING *",[characterId,revisionId,encounterId,JSON.stringify(state)]);
 await c.query('COMMIT');return q.rows[0];
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
export async function updateWorldBattle(pool,{characterId,battleId},advance){
 const c=await pool.connect();
 try{await c.query('BEGIN');
 const lock=await c.query('SELECT id FROM characters WHERE id=$1 FOR UPDATE',[characterId]);if(!lock.rowCount)throw Error('Character missing');
 const q=await c.query('SELECT * FROM active_world_battles WHERE id=$1 AND character_id=$2 FOR UPDATE',[battleId,characterId]);const row=q.rows[0];if(!row)throw Error('Battle missing');
 if(row.status==='finished'){await c.query('COMMIT');return row;}
 // The callback may debit inventory and grant rewards using this same transaction.
 const state=await advance(c,structuredClone(row.state),row);validateState(state);
 if(state.started!==row.state.started||state.processedThrough<row.state.processedThrough)throw Error('Invalid battle clock transition');
 const saved=await c.query('UPDATE active_world_battles SET state=$2::jsonb,status=$3,version=version+1,updated_at=now() WHERE id=$1 RETURNING *',[battleId,JSON.stringify(state),state.status]);
 await c.query('COMMIT');return saved.rows[0];
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
export async function findRunningWorldBattle(c,characterId){
 const q=await c.query("SELECT * FROM active_world_battles WHERE character_id=$1 AND status='running'",[characterId]);return q.rows[0]??null;
}
