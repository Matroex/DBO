// Internal server-only persistence. Never accept outcome or reward from a client.
export async function recordBattle(pool,{characterId,revisionId,mode,outcome,rounds,result}){
 const q=await pool.query('INSERT INTO battle_records(character_id,revision_id,mode,outcome,rounds,result) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',[characterId,revisionId,mode,outcome,rounds,JSON.stringify(result)]);
 return q.rows[0].id;
}
export async function claimBattleReward(pool,{battleId,characterId},grant){
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  const q=await c.query('SELECT * FROM battle_records WHERE id=$1 AND character_id=$2 FOR UPDATE',[battleId,characterId]);
  if(!q.rowCount||q.rows[0].outcome!=='win')throw Error('Battle not eligible');
  const previous=await c.query('SELECT reward FROM battle_reward_claims WHERE battle_id=$1',[battleId]);
  if(previous.rowCount){await c.query('COMMIT');return {reward:previous.rows[0].reward,replayed:true};}
  // grant must perform all mutations using this same transaction.
  const reward=await grant(c,q.rows[0]);
  await c.query('INSERT INTO battle_reward_claims(battle_id,reward) VALUES($1,$2)',[battleId,JSON.stringify(reward)]);
  await c.query('COMMIT');return {reward,replayed:false};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
