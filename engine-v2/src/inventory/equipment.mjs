// Internal helpers; all mutations require a caller-owned transaction.
async function lock(c,id){
 const q=await c.query('SELECT level,race_id FROM characters WHERE id=$1 FOR UPDATE',[id]);
 if(!q.rowCount)throw Error('Character missing');return q.rows[0];
}
function key(set,slot){
 if(!['main','pvp'].includes(set)||typeof slot!=='string'||! /^[a-zA-Z0-9_-]{1,64}$/.test(slot))throw Error('Invalid equipment slot');
 return set+':'+slot;
}
export async function equipItem(c,{characterId,itemId,revisionId,set,slot}){
 const character=await lock(c,characterId),destination=key(set,slot);
 const q=await c.query("SELECT i.quantity,d.data FROM inventory_items i JOIN content_definitions d ON d.revision_id=$3 AND d.kind='item' AND d.definition_id=i.definition_id WHERE i.id=$1 AND i.character_id=$2 AND i.bag_slot IS NOT NULL FOR UPDATE OF i",[itemId,characterId,revisionId]);
 if(!q.rowCount)throw Error('Item not available');
 const d=q.rows[0].data;
 if(d.slot!==slot||d.stackable!==false||BigInt(q.rows[0].quantity)!==1n)throw Error('Wrong equipment slot');
 const required=d.requiredLevel??1;
 if(!Number.isSafeInteger(required)||required<1||character.level<required)throw Error('Required level');
 if(d.requiredRace&&d.requiredRace!==character.race_id)throw Error('Required race');
 const occupied=await c.query('SELECT id FROM inventory_items WHERE character_id=$1 AND equipment_slot=$2',[characterId,destination]);
 if(occupied.rowCount)throw Error('Equipment slot occupied');
 await c.query('UPDATE inventory_items SET bag_slot=NULL,equipment_slot=$2 WHERE id=$1',[itemId,destination]);
}
export async function unequipItem(c,{characterId,set,slot,capacity}){
 if(!Number.isSafeInteger(capacity)||capacity<1||capacity>100000)throw Error('Invalid bag capacity');
 await lock(c,characterId);
 const q=await c.query('SELECT id FROM inventory_items WHERE character_id=$1 AND equipment_slot=$2 FOR UPDATE',[characterId,key(set,slot)]);
 if(!q.rowCount)throw Error('Equipment slot empty');
 const used=new Set((await c.query('SELECT bag_slot FROM inventory_items WHERE character_id=$1 AND bag_slot IS NOT NULL',[characterId])).rows.map(x=>x.bag_slot));
 let free=0;while(free<capacity&&used.has(free))free++;
 if(free===capacity)throw Error('Inventory full');
 await c.query('UPDATE inventory_items SET equipment_slot=NULL,bag_slot=$2 WHERE id=$1',[q.rows[0].id,free]);
 return {id:q.rows[0].id,bagSlot:free};
}
