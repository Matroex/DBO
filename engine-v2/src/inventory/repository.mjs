// Internal helpers. Caller must authorize character and own the transaction.
async function lockCharacter(c,id){
 const q=await c.query('SELECT id FROM characters WHERE id=$1 FOR UPDATE',[id]);
 if(!q.rowCount)throw Error('Character missing');
}
export async function listInventory(c,characterId){
 return (await c.query('SELECT id,definition_id,quality_id,upgrade_level,quantity,bag_slot,equipment_slot,attributes FROM inventory_items WHERE character_id=$1 ORDER BY bag_slot NULLS LAST,equipment_slot,id',[characterId])).rows;
}
export async function grantItem(c,{characterId,revisionId,definitionId,qualityId,quantity=1,capacity}){
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>1000000||!Number.isSafeInteger(capacity)||capacity<1||capacity>100000)throw Error('Invalid inventory grant');
 await lockCharacter(c,characterId);
 const def=await c.query("SELECT data FROM content_definitions WHERE revision_id=$1 AND kind='item' AND definition_id=$2",[revisionId,definitionId]);
 if(!def.rowCount)throw Error('Unknown item');
 const d=def.rows[0].data;
 if(!Array.isArray(d.qualityIds)||!d.qualityIds.includes(qualityId)||typeof d.stackable!=='boolean')throw Error('Invalid item definition or quality');
 const used=new Set((await c.query('SELECT bag_slot FROM inventory_items WHERE character_id=$1 AND bag_slot IS NOT NULL',[characterId])).rows.map(x=>x.bag_slot));
 const slots=[];const count=d.stackable?1:quantity;
 for(let i=0;i<capacity&&slots.length<count;i++)if(!used.has(i))slots.push(i);
 if(slots.length!==count)throw Error('Inventory full');
 const result=[];
 for(const slot of slots){
 const q=await c.query('INSERT INTO inventory_items(character_id,definition_id,quality_id,quantity,bag_slot) VALUES($1,$2,$3,$4,$5) RETURNING id,bag_slot,quantity',[characterId,definitionId,qualityId,d.stackable?quantity:1,slot]);
 result.push(q.rows[0]);
 }
 return result;
}
export async function moveBagItem(c,{characterId,itemId,destination,capacity}){
 if(!Number.isSafeInteger(capacity)||capacity<1||capacity>100000||!Number.isSafeInteger(destination)||destination<0||destination>=capacity)throw Error('Invalid bag slot');
 await lockCharacter(c,characterId);
 const q=await c.query('SELECT bag_slot FROM inventory_items WHERE id=$1 AND character_id=$2 AND bag_slot IS NOT NULL FOR UPDATE',[itemId,characterId]);
 if(!q.rowCount)throw Error('Item not in bag');
 const source=q.rows[0].bag_slot;if(source===destination)return;
 const other=await c.query('SELECT id FROM inventory_items WHERE character_id=$1 AND bag_slot=$2 FOR UPDATE',[characterId,destination]);
 if(other.rowCount){
 await c.query('UPDATE inventory_items SET bag_slot=NULL WHERE id=$1',[itemId]);
 await c.query('UPDATE inventory_items SET bag_slot=$2 WHERE id=$1',[other.rows[0].id,source]);
 }
 await c.query('UPDATE inventory_items SET bag_slot=$2 WHERE id=$1',[itemId,destination]);
}
