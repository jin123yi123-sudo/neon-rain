import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {validateSave,encodeSave,decodeSave,SAVE_KEY} from './progress.js';

function boot(){
  const elements=new Map(), storage=new Map();
  const element=()=>({style:{},classList:{add(){},remove(){},toggle(){}},textContent:'',innerHTML:'',value:'',addEventListener(){},focus(){},scrollIntoView(){},querySelector(){return null},getContext(){return {}},showModal(){},close(){}});
  const context=vm.createContext({render(){},loadArt(){return Promise.resolve()},console,Math,URL,performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},addEventListener(){},document:{querySelector(s){if(!elements.has(s))elements.set(s,element());return elements.get(s)},querySelectorAll(){return []},addEventListener(){}},localStorage:{setItem(k,v){storage.set(k,v)},getItem(k){return storage.get(k)||null}},location:{hash:'',href:'http://localhost/'},window:{},validateSave,encodeSave,decodeSave,SAVE_KEY});
  const source=readFileSync(new URL('./main.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
  vm.runInContext(source,context);
  return expr=>vm.runInContext(expr,context);
}
test('movement, jump, ladder and directional fire work in simulation',()=>{
  const run=boot();run("reset(0);state='playing';keys.add('d');for(let i=0;i<30;i++)update(1/60);keys.clear()");assert.ok(run('player.x')>180);
  run("keys.add(' ');update(1/60);keys.clear()");assert.ok(run('player.vy')<0);
  run("player.x=ladders[0].x-10;player.y=G-40;player.vy=0;keys.add('w');for(let i=0;i<30;i++)update(1/60);keys.clear()");assert.ok(run('player.y')<370);
  run('bullets=[];fire(-Math.PI/2)');assert.ok(run('bullets[0].vy')<0);assert.ok(Math.abs(run('bullets[0].vx'))<.01);
});
test('enemy damage, drops, health, death and chapter unlocks',()=>{
  const run=boot();run("reset(0);state='playing';enemies[0].hp=1;bullets=[{x:enemies[0].x+10,y:enemies[0].y+10,vx:0,vy:0,life:1,friendly:true}];update(.016)");assert.equal(run('killed'),1);assert.equal(run('drops.length'),1);
  run("player.hp=30;drops=[{x:player.x,y:player.y+20,kind:'heal',life:5,vy:0}];update(.016)");assert.equal(run('player.hp'),60);
  run('player.hp=5;player.inv=0;hitPlayer(10)');assert.equal(run('state'),'dead');
  run("reset(0);state='playing';enemies.at(-1).hp=0;player.x=LENGTH-80;update(.016)");assert.equal(run('state'),'complete');assert.equal(run('unlocked'),1);assert.equal(run('load().unlocked'),1);
});
test('all districts have platforms, ladders, aerial and building enemies',()=>{const run=boot();for(let n=0;n<3;n++){run(`reset(${n})`);assert.equal(run('platforms.length'),9);assert.equal(run('ladders.length'),9);assert.ok(run("enemies.some(e=>e.kind==='room')"));assert.ok(run("enemies.some(e=>e.kind==='drone')"));}});

test('ladder reaches platform, stays stable and allows walking off',()=>{
  const run=boot();run("reset(0);state='playing';enemies=[];player.x=ladders[0].x-10;keys.add('w');for(let i=0;i<180;i++)update(1/120);keys.clear();for(let i=0;i<10;i++)update(1/120)");
  assert.ok(Math.abs(run('player.y+40-platforms[0].y'))<1);assert.equal(run('player.ground'),true);
  run("keys.add('d');for(let i=0;i<30;i++)update(1/120)");assert.ok(run('player.x')>400);
});
test('coyote jump and pre-landing buffered jump are responsive',()=>{
  const run=boot();run("reset(0);state='playing';enemies=[];player.ground=false;player.y=380;player.coyote=.09;keys.add(' ');update(1/120)");assert.ok(run('player.vy')<0);
  run("reset(0);state='playing';enemies=[];player.ground=false;player.coyote=0;player.y=G-44;player.vy=100;keys.add(' ');for(let i=0;i<10;i++)update(1/120)");assert.ok(run('player.vy')<0);
});
test('dash has cooldown and platforms allow deliberate drop-through',()=>{
  const run=boot();run("reset(0);state='playing';enemies=[];keys.add('shift');update(1/120)");assert.ok(run('player.vx')>400);assert.ok(run('player.dashCooldown')>0);
  run("reset(0);state='playing';enemies=[];player.x=platforms[0].x+120;player.y=platforms[0].y-40;player.ground=true;keys.add('s');keys.add(' ');for(let i=0;i<24;i++)update(1/120)");assert.ok(run('player.y+40')>run('platforms[0].y')+10);
});
test('short and held jumps have different heights',()=>{
  const run=boot();const heights=[];for(const held of [false,true]){run("reset(0);state='playing';enemies=[];keys.add(' ');update(1/120)");if(!held)run('keys.clear()');let min=426;for(let i=0;i<70;i++){run('update(1/120)');min=Math.min(min,run('player.y'))}heights.push(min)}assert.ok(heights[1]<heights[0]-20);
});
