import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mountTouch,stickVector} from './touch.js';
function harness(search='?mode=mobile'){
  function element(key){return {dataset:{touchKey:key},listeners:{},style:{setProperty(){}},classList:{toggle(){},add(){},remove(){}},setAttribute(){},setPointerCapture(){},getBoundingClientRect(){return {left:0,top:0,width:110,height:110}},addEventListener(n,fn){this.listeners[n]=fn},emit(n,id,x=55,y=55){this.listeners[n]?.({pointerId:id,clientX:x,clientY:y,preventDefault(){}})}}}
  const elements=new Map(),jump=element(' '),dash=element('shift'),events={};let state='playing',pauses=0;
  const root={body:element(),querySelector(s){if(!elements.has(s))elements.set(s,element());return elements.get(s)},querySelectorAll(s){return s==='[data-touch-key]'?[jump,dash]:[]},addEventListener(n,fn){events[n]=fn}};
  const host={location:{search},innerWidth:844,innerHeight:390,matchMedia:()=>({matches:true}),addEventListener(n,fn){events[n]=fn}};
  const touch={keys:new Set(),firing:false,angle:0};
  const controls=mountTouch({touch,root,host,getState:()=>state,getFace:()=>1,pause(){pauses++;state='paused'}});
  return {touch,controls,host,events,jump,dash,move:root.querySelector('#move-stick'),aim:root.querySelector('#aim-stick'),state:s=>state=s,pauses:()=>pauses};
}
test('stick deadzone and clamping preserve diagonal aiming',()=>{assert.equal(stickVector(2,3,40).aiming,false);const v=stickVector(100,-100,40);assert.ok(Math.abs(Math.hypot(v.x,v.y)-40)<.001);assert.equal(v.dx,1);assert.equal(v.dy,-1);assert.equal(v.angle,-Math.PI/4)});
test('independent fingers can move, aim and jump without releasing other controls',()=>{
  const h=harness();h.move.emit('pointerdown',1);h.move.emit('pointermove',1,100,55);h.aim.emit('pointerdown',2);h.aim.emit('pointermove',2,90,20);h.jump.emit('pointerdown',3);
  assert.ok(h.touch.keys.has('d'));assert.ok(h.touch.keys.has(' '));assert.equal(h.touch.firing,true);assert.equal(h.touch.angle,-Math.PI/4);
  h.jump.emit('pointerup',3);assert.equal(h.touch.keys.has(' '),false);assert.equal(h.touch.firing,true);assert.ok(h.touch.keys.has('d'));
  h.aim.emit('pointercancel',2);assert.equal(h.touch.firing,false);assert.ok(h.touch.keys.has('d'));
  h.move.emit('lostpointercapture',1);assert.equal(h.touch.keys.size,0);
});
test('pause, rotation and focus loss release held touch controls',()=>{
  const h=harness();h.aim.emit('pointerdown',1);h.events.blur();assert.equal(h.touch.firing,false);
  h.move.emit('pointerdown',2);h.move.emit('pointermove',2,100,55);h.host.innerHeight=844;h.host.innerWidth=390;h.events.resize();assert.equal(h.touch.keys.size,0);assert.equal(h.pauses(),1);
  h.state('playing');h.aim.emit('pointerdown',3);h.controls.sync('dead');assert.equal(h.touch.firing,false);
});
test('desktop override disables touch mode even on a touch device',()=>{assert.equal(harness('?mode=desktop').controls.enabled,false)});
