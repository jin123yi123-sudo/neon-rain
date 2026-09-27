import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildLevel} from './level-design.js';
import {setProne,playerHitbox,pointInside,shieldBlocks,stepEnemy,stepWater,resolveObstacles} from './combat.js';

const player=()=>({x:100,y:426,w:20,h:40,hp:100,ground:true,climbing:false,vx:0,vy:0});
test('prone preserves feet, avoids chest-height bullets and cannot stand through low ceilings',()=>{
  const p=player();setProne(p,true,[]);assert.equal(p.y+p.h,466);assert.equal(p.h,17);
  assert.equal(pointInside(110,436,playerHitbox(p)),false);assert.equal(pointInside(110,457,playerHitbox(p)),true);
  setProne(p,false,[{x:90,y:400,w:70,h:45,hp:Infinity}]);assert.equal(p.prone,true);
  setProne(p,false,[]);assert.equal(p.h,40);assert.equal(p.y,426);
});
test('cover blocks movement, supports landings and shield has a vulnerable back',()=>{
  const p=player(),crate={x:140,y:424,w:60,h:42,hp:8};p.x=125;p.vx=490;resolveObstacles(p,118,426,[crate]);assert.equal(p.x,120);
  p.x=150;p.y=390;p.vy=80;resolveObstacles(p,150,380,[crate]);assert.equal(p.y+p.h,424);
  const e={kind:'shield',guard:1,face:-1,y:420};assert.equal(shieldBlocks(e,{vx:760,y:440}),true);assert.equal(shieldBlocks(e,{vx:-760,y:440}),false);
});
test('manhole enemy stays hidden until approached and completes a visible emergence',()=>{
  const e={kind:'sewer',x:800,y:428,w:24,h:38,hp:4,cool:1,hurt:0},p=player(),bullets=[];
  stepEnemy(e,{player:p,bullets,ground:466,level:1,time:0},.1);assert.equal(e.active,false);assert.equal(e.emerged,undefined);
  p.x=600;stepEnemy(e,{player:p,bullets,ground:466,level:1,time:0},.1);assert.ok(e.y>428);assert.equal(bullets.length,0);
  for(let i=0;i<90;i++)stepEnemy(e,{player:p,bullets,ground:466,level:1,time:i/120},1/120);assert.equal(e.emerged,true);assert.equal(e.y,428);
});
test('only fully submerged head loses health; recovery cannot create net health',()=>{
  const water=[{x:50,w:200,surface:455,bottom:528}],p=player();
  for(let i=0;i<360;i++)stepWater(p,water,1/120);assert.equal(p.hp,100);
  p.y=488;for(let i=0;i<480;i++)stepWater(p,water,1/120);const hurt=p.hp;assert.ok(hurt<100);
  p.y=426;stepWater(p,water,1/120);assert.ok(p.hp>hurt);assert.ok(p.hp<100);const healed=p.hp;
  for(let i=0;i<60;i++)stepWater(p,water,1/120);assert.equal(p.hp,healed);
});
test('all three bosses have distinct patterns and enter an intensified second phase',()=>{
  const signatures=[];
  for(let type=0;type<3;type++){
    const p={...player(),x:3650},bullets=[],e={kind:'boss',bossType:type,x:3900,y:type===2?180:390,w:110,h:70,hp:60,maxHp:60,cool:0,hurt:0,age:0};
    for(let i=0;i<840;i++)stepEnemy(e,{player:p,bullets,ground:466,level:type,time:i/120},1/120);
    signatures.push({wave:bullets.some(b=>b.wave),bomb:bullets.some(b=>b.grenade),vertical:bullets.some(b=>b.grenade&&b.vx===0),flat:bullets.some(b=>b.vy===0)});
    e.hp=29;stepEnemy(e,{player:p,bullets,ground:466,level:type,time:8},1/120);assert.equal(e.phase,2);
  }
  assert.deepEqual(signatures,[{wave:false,bomb:false,vertical:false,flat:true},{wave:true,bomb:true,vertical:false,flat:true},{wave:false,bomb:true,vertical:true,flat:false}]);
});
test('jump chains have reachable rises and underground water is confined to explicit pools',()=>{
  for(let level=0;level<3;level++){
    const d=buildLevel(level),chain=d.platforms.filter(p=>p.kind);
    assert.ok(chain.length>=9);assert.equal(d.encounters.length,4);assert.equal(d.enemies.at(-1).bossType,level);
    for(const base of [170,1320,2340]){const steps=chain.filter(p=>p.x>=base&&p.x<=base+205);for(let i=1;i<steps.length;i++)assert.ok(steps[i-1].y-steps[i].y<=60)}
    assert.equal(d.water.length,level===1?2:0);
  }
});
