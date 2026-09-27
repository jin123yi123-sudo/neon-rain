import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runFrame,RUN_STRIDE} from './animation.js';
test('six distinct strides alternate contact legs and loop without a repeated endpoint',()=>{
  assert.deepEqual(Array.from({length:7},(_,i)=>runFrame(i/6)),[0,1,2,3,4,5,0]);
  assert.equal(runFrame(.5),3);
  assert.deepEqual(Array.from({length:6},(_,i)=>runFrame(i/6,true)),[0,5,4,3,2,1]);
});
test('stride phase follows travelled distance independent of frame rate',()=>{
  const simulate=fps=>{let cycles=0;for(let i=0;i<fps;i++)cycles+=225/fps/RUN_STRIDE;return cycles};
  assert.ok(Math.abs(simulate(30)-simulate(120))<1e-10);
  assert.equal(runFrame(simulate(30)),runFrame(simulate(120)));
});
