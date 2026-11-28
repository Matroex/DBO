import test from 'node:test';
import assert from 'node:assert/strict';
import {hashPassword,verifyPassword,newSession,sessionHash} from '../src/auth/credentials.mjs';
test('salted password hashes and verification',async()=>{
 const a=await hashPassword('test-password'),b=await hashPassword('test-password');
 assert.notEqual(a,b);assert.equal(await verifyPassword('test-password',a),true);
 assert.equal(await verifyPassword('wrong-password',a),false);
 assert.equal(await verifyPassword('test-password','bad'),false);
 await assert.rejects(hashPassword('short'));
});
test('session tokens are random and stored as hashes',()=>{
 const a=newSession(),b=newSession();assert.notEqual(a.token,b.token);
 assert.equal(sessionHash(a.token),a.hash);assert.notEqual(a.token,a.hash);
 assert.throws(()=>sessionHash('bad'));
});
