import {randomInt} from 'node:crypto';
import {validateCombatRules} from '../../dist/domain/combat.js';
import {validateTechniqueRules} from '../../dist/domain/techniques.js';
import {validateDuelRules,simulateDuel} from '../../dist/domain/duel.js';
import {recordBattle} from './repository.mjs';

// Internal only: participants must be assembled by trusted server code, never HTTP input.
export async function resolveRecordedDuel(pool,{characterId,revisionId,mode,player,enemy},random=()=>randomInt(0,1000000000)/1000000000){
 if(!['story','pvp','tournament','mob','boss','dungeon'].includes(mode))throw Error('Invalid battle mode');
 const q=await pool.query("SELECT definition_id,data FROM content_definitions WHERE revision_id=$1 AND kind='combat_rules' AND definition_id IN ('hit','techniques','duel')",[revisionId]);
 const config=Object.fromEntries(q.rows.map(x=>[x.definition_id,x.data]));
 const result=simulateDuel(validateCombatRules(config.hit),validateTechniqueRules(config.techniques),validateDuelRules(config.duel),player,enemy,['pvp','tournament'].includes(mode)?'pvp':'pvm',random);
 const battleId=await recordBattle(pool,{characterId,revisionId,mode,outcome:result.outcome,rounds:result.rounds,result});
 return {battleId,...result};
}
