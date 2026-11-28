// Caller owns the transaction. Only a server-recorded boss win may consume a slot.
// The server must attach the trusted catalog ID to result.enemyId when recording a boss fight.
export async function registerBossVictory(c,{characterId,battleId}){
 const locked=await c.query('SELECT id FROM characters WHERE id=$1 FOR UPDATE',[characterId]);
 if(!locked.rowCount)throw Error('Character missing');
 const q=await c.query("SELECT * FROM battle_records WHERE id=$1 AND character_id=$2 AND mode='boss' AND outcome='win'",[battleId,characterId]);
 const battle=q.rows[0];if(!battle)throw Error('Not a boss victory');
 const bossId=battle.result.enemyId;
 const config=await c.query("SELECT definition_id,data FROM content_definitions WHERE revision_id=$1 AND ((kind='enemy' AND definition_id=$2) OR (kind='combat_rules' AND definition_id='boss_daily'))",[battle.revision_id,bossId]);
 const defs=Object.fromEntries(config.rows.map(x=>[x.definition_id,x.data]));
 const rules=defs.boss_daily;
 if(defs[bossId]?.mode!=='boss'||!Number.isSafeInteger(rules?.maxWins)||rules.maxWins<1||typeof rules.timeZone!=='string')throw Error('Invalid boss rules');
 const prior=await c.query('SELECT battle_id FROM boss_victories WHERE battle_id=$1',[battleId]);
 if(prior.rowCount)return {replayed:true};
 const day=(await c.query('SELECT ($1::timestamptz AT TIME ZONE $2)::date::text AS day',[battle.created_at,rules.timeZone])).rows[0].day;
 const used=Number((await c.query('SELECT count(*) FROM boss_victories WHERE character_id=$1 AND boss_id=$2 AND victory_day=$3',[characterId,bossId,day])).rows[0].count);
 if(used>=rules.maxWins)throw Error('Daily boss victory limit');
 await c.query('INSERT INTO boss_victories(battle_id,character_id,boss_id,victory_day) VALUES($1,$2,$3,$4)',[battleId,characterId,bossId,day]);
 return {replayed:false,used:used+1,limit:rules.maxWins};
}
