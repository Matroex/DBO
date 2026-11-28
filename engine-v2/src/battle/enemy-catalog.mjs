// Read only from an immutable content revision. Story step authorization is separate.
export async function loadStoryEnemy(client,revisionId,enemyId){
 const q=await client.query("SELECT data FROM content_definitions WHERE revision_id=$1 AND kind='enemy' AND definition_id=$2",[revisionId,enemyId]);
 const e=q.rows[0]?.data;
 if(!e||e.mode!=='story'||typeof e.name!=='string'||typeof e.questId!=='string'||!Number.isSafeInteger(e.stepIndex)||e.stepIndex<0)throw Error('Unknown story enemy');
 for(const k of ['level','strength','speed','endurance','intelligence','ki','attack','defense','hp','maxKi']){
  if(typeof e[k]!=='number'||!Number.isFinite(e[k])||e[k]<0)throw Error('Invalid enemy stat '+k);
 }
 if(!Number.isSafeInteger(e.level)||e.level<1||e.hp<=0)throw Error('Invalid enemy level or HP');
 return e;
}
