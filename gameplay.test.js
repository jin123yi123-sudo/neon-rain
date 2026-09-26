import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {validateSave,encodeSave,decodeSave,SAVE_KEY} from './progress.js';

function boot(){
  const elements=new Map(), storage=new Map();
  const element=()=>({style:{},classList:{add(){},remove(){},toggle(){}},textContent:'',innerHTML:'',value:'',addEventListener(){},focus(){},querySelector(){return null},getContext(){return {}},showModal(){},close(){}});
  const context=vm.createContext({console,Math,URL,performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},addEventListener(){},document:{querySelector(s){if(!elements.has(s))elements.set(s,element());return elements.get(s)},querySelectorAll(){return []},addEventListener(){}},localStorage:{setItem(k,v){storage.set(k,v)},getItem(k){return storage.get(k)||null}},location:{hash:'',href:'http://localhost/'},window:{},validateSave,encodeSave,decodeSave,SAVE_KEY});
  const source=readFileSync(new URL('./game.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/,'');
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
