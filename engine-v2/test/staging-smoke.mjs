import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';

const base=process.argv[2]??'http://127.0.0.1:3000';
const suffix=randomBytes(6).toString('hex');
const password=randomBytes(18).toString('base64url');
async function request(path,{body,token,status=200}={}){
 const headers=token?{Authorization:'Bearer '+token}:{};
 if(body)headers['Content-Type']='application/json';
 const response=await fetch(new URL(path,base),{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined});
 assert.equal(response.status,status,path);
 return response.json();
}
const player=async(index,raceId)=>{
 const login='smoke_'+suffix+'_'+index;
 const credentials={login,password};
 await request('/api/v1/auth/register',{body:credentials,status:201});
 const {token}=await request('/api/v1/auth/login',{body:credentials});
 const {id}=await request('/api/v1/characters',{token,body:{name:'Smoke '+suffix+' '+index,raceId},status:201});
 return {token,id};
};
await request('/api/v1/ready');
const [first,second]=await Promise.all([player(1,'saiyan'),player(2,'ziemianin')]);
const path=player=>'/api/v1/characters/'+player.id+'/inventory';
await Promise.all([
 request(path(first),{token:first.token}),
 request(path(second),{token:second.token}),
 request(path(first),{token:second.token,status:404}),
 request(path(second),{token:first.token,status:404})
]);
const crafting=await request('/api/v1/characters/'+first.id+'/crafting',{token:first.token});
assert.equal(crafting.recipes.length,5);
assert.equal((await fetch(new URL('/smith',base))).status,200);
