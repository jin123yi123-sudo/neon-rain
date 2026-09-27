export function playerHitbox(player){return {x:player.prone?player.x-10:player.x,y:player.y,w:player.prone?40:20,h:player.h}}
export function overlaps(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
export function pointInside(x,y,box){return x>=box.x&&x<=box.x+box.w&&y>=box.y&&y<=box.y+box.h}
export function setProne(player,wants,obstacles){
  const feet=player.y+player.h;
  if(wants&&player.ground&&!player.climbing){player.prone=true;player.h=17;player.y=feet-17}
  else if(player.prone){
    const standing={x:player.x,y:feet-40,w:20,h:40};
    if(!obstacles.some(o=>o.hp>0&&overlaps(standing,o))){player.prone=false;player.h=40;player.y=feet-40}
  }
}
export function resolveObstacles(player,oldX,oldY,obstacles){
  for(const o of obstacles){
    if(o.hp<=0||!overlaps({x:player.x,y:player.y,w:20,h:player.h},o))continue;
    if(oldY+player.h<=o.y+2&&player.vy>=0){player.y=o.y-player.h;player.vy=0;player.ground=true}
    else if(oldY>=o.y+o.h-2&&player.vy<0){player.y=o.y+o.h;player.vy=0}
    else{player.x=oldX+20<=o.x+2?o.x-20:oldX>=o.x+o.w-2?o.x+o.w:oldX;player.vx=0}
  }
}
export function shieldBlocks(enemy,bullet){
  return enemy.kind==='shield'&&enemy.guard>0&&bullet.vx*enemy.face<0&&bullet.y>enemy.y+7;
}

export function waterAt(x,water){return water.find(w=>x>w.x&&x<w.x+w.w)}
export function stepWater(player,water,dt){
  const pool=waterAt(player.x+10,water);
  const submerged=!!pool&&player.y-12>pool.surface;
  if(submerged){
    player.waterTime=(player.waterTime||0)+dt;
    if(player.waterTime>1){player.drownClock=(player.drownClock||0)+dt;if(player.drownClock>=.5){player.drownClock-=.5;const damage=Math.min(4,player.hp);player.hp-=damage;player.waterDebt=(player.waterDebt||0)+damage;}}
  }else{
    if(player.wasSubmerged&&player.hp>0){const heal=Math.min(8,Math.floor((player.waterDebt||0)*.5));player.hp=Math.min(100,player.hp+heal);player.waterDebt=0;}
    player.waterTime=0;player.drownClock=0;
  }
  player.wasSubmerged=submerged;player.inWater=!!pool&&player.y+player.h>pool.surface;
  return submerged;
}

function shot(bullets,x,y,vx,vy,extra={}){bullets.push({x,y,vx,vy,life:5,friendly:false,damage:14,...extra})}
function aimed(e,p,bullets,speed=240,spread=[0]){
  const x=e.x+e.w/2,y=e.y+e.h*.45,angle=Math.atan2(p.y+p.h*.45-y,p.x+10-x);
  for(const a of spread)shot(bullets,x,y,Math.cos(angle+a)*speed,Math.sin(angle+a)*speed);
}
function horizontal(e,p,bullets,count=1){for(let i=0;i<count;i++)shot(bullets,e.x+e.w/2,e.y+14+i*7,Math.sign(p.x-e.x)*270,0)}
export function stepEnemy(e,world,dt){
  const {player:p,bullets,time,ground}=world;
  e.hurt=Math.max(0,e.hurt-dt);e.face=p.x<e.x?-1:1;e.active=Math.abs(e.x-p.x)<690;
  if(e.kind==='sewer'){
    if(!e.emerged&&Math.abs(e.x-p.x)>250){e.active=false;return}
    e.emerge=Math.min(1,(e.emerge||0)+dt*1.5);e.y=ground-e.h*e.emerge;
    if(e.emerge<1){e.warning='井盖异动';return}e.emerged=true;
  }
  if(!e.active)return;
  e.age=(e.age||0)+dt;
  e.cool-=dt;
  if(e.kind==='boss'){stepBoss(e,world,dt);return}
  if(e.kind==='drone'){e.y=e.base+Math.sin(time*2+e.x*.01)*24;e.x+=e.face*dt*32}
  if(e.kind==='street'||e.kind==='sewer')e.x+=e.face*dt*(e.kind==='sewer'?48:24);
  if(e.kind==='shield'){e.guard=e.age%3.2<2.05?1:0;e.x+=e.face*dt*(e.guard?24:0)}
  if(e.kind==='rusher'){
    const phase=e.age%2.5;e.charging=phase>.7&&phase<1.3;
    e.x+=e.face*dt*(e.charging?245:32);e.warning=phase<.7?'突袭预警':'';return;
  }
  e.warning=e.cool<.55?({sniper:'狙击锁定',grenadier:'榴弹预警',turret:'连射预警'}[e.kind]||''):'';
  if(e.cool>0)return;
  if(e.kind==='grenadier'){
    shot(bullets,e.x+12,e.y+8,(p.x-e.x)/1.05,-265,{gravity:510,grenade:true,life:1.05,damage:24,radius:66});e.cool=3;
  }else if(e.kind==='sniper'){
    aimed(e,p,bullets,480);e.cool=2.8;
  }else if(e.kind==='turret'){
    horizontal(e,p,bullets,2);e.cool=e.burst<2?.18:2.2;e.burst=(e.burst+1)%3;
  }else if(e.kind==='shield'){
    if(!e.guard)horizontal(e,p,bullets);e.cool=.7;
  }else{
    if(e.kind==='street')horizontal(e,p,bullets);else aimed(e,p,bullets,210+world.level*20,e.kind==='drone'?[-.07,.07]:[0]);
    e.cool=1.5+(e.kind==='drone'?.6:0);
  }
}

function stepBoss(e,world,dt){
  const {player:p,bullets,time,ground}=world;
  const phase=e.hp<=e.maxHp*.5?2:1;e.phase=phase;
  const t=e.age%(phase===2?5.4:6.6);const newCycle=t<(e.previousT??0);e.previousT=t;
  if(newCycle)e.attackIndex=(e.attackIndex||0)+1;
  if(e.bossType===0){
    e.warning=t<.85?'平射扫街 · 趴下':t>3&&t<3.8?'装甲冲撞 · 跳跃':'';
    if(t>=.85&&t<2.7&&e.cool<=0){
      shot(bullets,e.x+e.w/2,ground-30,e.face*(phase===2?330:280),0,{damage:18});e.cool=phase===2?.16:.25;
    }
    if(t>3.8&&t<4.6)e.x+=e.face*(phase===2?260:190)*dt;
    if(t>=4.8&&e.cool<=0){aimed(e,p,bullets,230,[-.2,0,.2]);e.cool=.85}
    e.x=Math.max(3580,Math.min(4040,e.x));
  }else if(e.bossType===1){
    e.warning=t<.8?'压力冲击 · 跳跃':t>2.7&&t<3.6?'腐蚀榴弹 · 离开标记':'';
    e.coreOpen=t>1.8&&t<3.6;
    if(t>=.8&&t<1.6&&e.cool<=0){
      shot(bullets,e.x,ground-10,-290,0,{wave:true,damage:22});e.cool=phase===2?.26:.42;
    }
    if(t>=3.6&&e.cool<=0){for(const offset of phase===2?[-85,0,85]:[0])shot(bullets,e.x+e.w/2,e.y,(p.x+offset-e.x)/1.1,-290,{gravity:520,grenade:true,life:1.1,radius:60,damage:24});e.cool=1.2}
    e.x+=Math.sin(time)*dt*18;
  }else{
    e.x=3850+Math.sin(e.age*.7)*155;e.y=170+Math.sin(e.age*1.3)*52;
    e.warning=t<.8?'扇形弹幕 · 寻找空隙':t>2.7&&t<3.6?'垂直轰炸 · 持续移动':'';
    if(t>=.8&&t<2.7&&e.cool<=0){aimed(e,p,bullets,phase===2?260:210,phase===2?[-.45,-.225,0,.225,.45]:[-.3,0,.3]);e.cool=.8}
    if(t>=3.6&&e.cool<=0){for(const offset of phase===2?[-65,0,65]:[-40,40])shot(bullets,p.x+offset,70,0,155,{gravity:190,grenade:true,life:2,radius:48,damage:23});e.cool=.95}
  }
}
