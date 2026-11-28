import {gainExperience,validateExperienceRules} from '../../dist/domain/progression.js';
// Must run inside caller's transaction; amount is trusted server-calculated XP.
export async function grantExperience(client,characterId,revisionId,amount){
 const q=await client.query('SELECT level,experience FROM characters WHERE id=$1 FOR UPDATE',[characterId]);
 if(!q.rowCount)throw Error('Character missing');
 const config=await client.query("SELECT data FROM content_definitions WHERE revision_id=$1 AND kind='combat_rules' AND definition_id='experience'",[revisionId]);
 if(!config.rowCount)throw Error('Experience rules missing');
 const rules=validateExperienceRules(config.rows[0].data);
 const next=gainExperience(rules,q.rows[0].level,BigInt(q.rows[0].experience),BigInt(amount));
 await client.query('UPDATE characters SET level=$2,experience=$3,state_version=state_version+1 WHERE id=$1',[characterId,next.level,next.experience.toString()]);
 return {level:next.level,experience:next.experience.toString(),accepted:next.accepted.toString()};
}
