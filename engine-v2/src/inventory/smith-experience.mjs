import {smithProfessionExperience,smithProfessionProgress} from '../../dist/domain/smith-profession.js';

// Caller owns the transaction and passes an authorized, server-resolved paid attempt.
// Commit its item, wallet and material changes in the same transaction as this award.
export async function recordSmithExperience(db,{characterId,operationId,kind,tier,success}){
 const {rowCount}=await db.query('SELECT id FROM characters WHERE id=$1 FOR UPDATE',[characterId]);
 if(!rowCount)throw Error('Character missing');
 const {rows:[previous]}=await db.query(
  'SELECT kind,tier,success,gained,total_after FROM smith_experience_awards WHERE character_id=$1 AND operation_id=$2',
  [characterId,operationId]);
 if(previous){
  if(previous.kind!==kind||Number(previous.tier)!==tier||previous.success!==success)throw Error('Smith experience operation conflict');
  return {gained:previous.gained,progress:smithProfessionProgress(previous.total_after),replayed:true};
 }
 const {rows:[state]}=await db.query('SELECT experience FROM character_smith_progress WHERE character_id=$1',[characterId]);
 const result=smithProfessionExperience(state?.experience??0,{kind,tier,success});
 if(result.gained){
  await db.query(
   'INSERT INTO character_smith_progress(character_id,experience) VALUES($1,$2) ON CONFLICT(character_id) DO UPDATE SET experience=EXCLUDED.experience',
   [characterId,result.progress.total]);
 }
 await db.query('INSERT INTO smith_experience_awards(character_id,operation_id,kind,tier,success,gained,total_after) VALUES($1,$2,$3,$4,$5,$6,$7)',
  [characterId,operationId,kind,tier,success,result.gained,result.progress.total]);
 return {...result,replayed:false};
}
