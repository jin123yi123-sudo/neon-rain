import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateSave,encodeSave,decodeSave} from './progress.js';
test('shared progress survives encoding',()=>{const save={version:1,level:1,unlocked:2,score:5200};assert.deepEqual(decodeSave(encodeSave(save)),save)});
test('untrusted progress cannot unlock invalid levels or inject score',()=>{for(const value of [null,{}, {version:1,level:3,unlocked:3,score:0},{version:1,level:2,unlocked:0,score:0},{version:1,level:0,unlocked:0,score:Infinity},{version:1,level:0,unlocked:0,score:-10}])assert.throws(()=>validateSave(value));assert.throws(()=>decodeSave('garbage'))});
