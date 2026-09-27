import {ART, sprite, runningSprite,combatSprite,environmentSprite} from './assets.js';
import {runFrame} from './animation.js';
import {BOSS_NAMES} from './level-design.js';

const W=960, H=540, G=466;
const noise = n => {const value=Math.sin(n*127.1+31.7)*43758.5453;return value-Math.floor(value)};
function box(ctx,x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h)}
function label(ctx,s,x,y,size=12,color='#dbeee9',align='left'){
  ctx.font=`${size}px 'Space Grotesk', 'Noto Sans SC', sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(s,x,y);ctx.textAlign='left';
}
function glow(ctx,x,y,r,color){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)}
export function render(ctx, game){
  const {level,camera,time,state,player,enemies,bullets,particles,drops,platforms,ladders,obstacles,hazards,water,explosions,activeEncounter,score,killed,total,length,mouse,flash}=game;
  ctx.imageSmoothingEnabled=false;
  box(ctx,0,0,W,H,'#09121c');
  const bg=ART[['market','underground','rooftop'][level]];
  if(bg){
    const tileWidth=1152, tileHeight=tileWidth*bg.naturalHeight/bg.naturalWidth;
    const groundRatio=[.795,.691,.720][level];
    const y=G-tileHeight*groundRatio;
    const offset=camera;
    for(let i=Math.floor(offset/tileWidth);i<=Math.ceil((offset+W)/tileWidth);i++){
      ctx.drawImage(bg,i*tileWidth-offset,y,tileWidth,tileHeight);
    }
    // A second, softly focused atmospheric strip gives the skyline subtle depth.
    ctx.save();ctx.globalAlpha=.13;ctx.filter='blur(2px)';
    ctx.drawImage(bg,0,0,bg.naturalWidth,bg.naturalHeight*.25,-camera*.02,0,W+90,115);
    ctx.restore();
  }
  // One weathered tag on a market shutter, anchored to the world behind props.
  if(level===0&&ART['gamevado-graffiti']){
    ctx.save();ctx.globalAlpha=.62;
    ctx.drawImage(ART['gamevado-graffiti'],948-camera,380,78,30);
    ctx.restore();
  }
  for(const p of platforms){
    if(p.x-camera>W+100||p.x+p.w-camera<0)continue;
    if(p.kind==='awning')environmentSprite(ctx,2,p.x-camera,p.y-8,p.w,52);
    else if(p.kind==='cornice')environmentSprite(ctx,3,p.x-camera,p.y-30,p.w,80);
    else sprite(ctx,10,p.x-camera,p.y-32,p.w,48);
  }
  for(const pool of water){const x=pool.x-camera;box(ctx,x,pool.surface,pool.w,pool.bottom-pool.surface,'#081d29');environmentSprite(ctx,4,x+pool.w-45,pool.surface+5,46,64);label(ctx,'深水 / W 上浮',x+pool.w/2,pool.surface-18,9,'#8bcfd5','center')}
  for(const e of enemies)if(e.kind==='sewer')environmentSprite(ctx,e.emerge>0?1:0,e.spawnX-camera-15,G-(e.emerge>0?15:5),57,e.emerge>0?23:12);
  for(const l of ladders){
    if(l.x-camera>W+40||l.x-camera<-40)continue;
    // The generated ladder is stretched only along its intended climbing axis.
    sprite(ctx,9,l.x-camera-12,l.y,25,l.bottom-l.y);
  }
  for(const o of obstacles){if(o.hp<=0||o.x-camera>W+100||o.x+o.w-camera<0)continue;combatSprite(ctx,o.kind==='crate'?7:11,o.x-camera,o.y,o.w,o.h);if(o.kind==='crate'&&o.hp<o.maxHp){box(ctx,o.x-camera,o.y-5,o.w*o.hp/o.maxHp,2,'#ffcc88')}}
  for(const h of hazards){
    const x=h.x-camera;box(ctx,x,h.y,h.w,4,h.warning?'#ffc568':'#588789');
    if(h.kind==='electric')environmentSprite(ctx,5,x+h.w-23,G-70,40,69);
    if(h.warning){glow(ctx,x+h.w/2,G-20,45,h.on?'#6dffd899':'#ffbb5533');label(ctx,h.kind==='steam'?'高压蒸汽':'高压危险 · 跳过',x+h.w/2,G-80,9,'#ffd091','center')}
    if(h.on){ctx.strokeStyle='#8effd4';for(let j=0;j<7;j++){ctx.beginPath();ctx.moveTo(x+j*h.w/7,G);ctx.lineTo(x+j*h.w/7+Math.sin(time*22+j)*8,G-(h.kind==='electric'?13:49));ctx.stroke()}}
  }
  if(activeEncounter){for(const x of [activeEncounter.left,activeEncounter.right]){box(ctx,x-camera,180,3,G-180,'#ff526f77');glow(ctx,x-camera,350,40,'#fa507533')}label(ctx,`封锁战 / ${activeEncounter.name} · 清除本区敌人`,W/2,98,11,'#ffd2a7','center')}
  const exit=length-65-camera;
  if(exit<W+100){glow(ctx,exit,G-50,85,'#b0ffb94d');sprite(ctx,13,exit-15,G-75,30,69);label(ctx,enemies.at(-1).hp>0?'击败守卫':'前往信标 →',exit,G-93,11,'#baffd1','center')}
  for(const e of enemies){
    if(e.hp<=0||e.x-camera<-120||e.x-camera>W+120)continue;
    if(e.kind==='sewer'&&!e.active)continue;
    const cell={street:4,sewer:5,room:4,drone:7,boss:6}[e.kind];
    const height=e.kind==='boss'?[91,102,94][e.bossType]:e.kind==='drone'?41:e.kind==='turret'?39:57;
    const width=e.kind==='boss'?[139,146,159][e.bossType]:e.kind==='drone'?61:e.kind==='turret'?53:49;
    const bob=e.kind==='drone'?0:Math.abs(Math.sin(time*6+e.x))*.8;
    ctx.save();if(e.kind==='sewer'){ctx.beginPath();ctx.rect(e.x-camera-40,0,120,G);ctx.clip()}if(e.hurt>0)ctx.filter='brightness(2)';
    const extra={shield:2,rusher:3,grenadier:4,sniper:5,turret:6,boss:8+e.bossType}[e.kind];
    if(extra!==undefined)combatSprite(ctx,extra,e.x-camera+(e.w-width)/2,e.y+e.h-height+bob,width,height,e.face<0);
    else sprite(ctx,cell,e.x-camera+(e.w-width)/2,e.y+e.h-height+bob,width,height,e.face<0);
    ctx.restore();
    if(e.kind==='boss'||e.hurt>0){box(ctx,e.x-camera-4,e.y-21,e.w+8,3,'#07111f');box(ctx,e.x-camera-4,e.y-21,(e.w+8)*e.hp/e.maxHp,3,'#ff719d')}
    if(e.kind==='boss')label(ctx,BOSS_NAMES[e.bossType],e.x-camera+e.w/2,e.y-30,10,'#ffc4d7','center');
    if(e.warning)label(ctx,e.warning,e.x-camera+e.w/2,e.y-44,9,'#ffd18d','center');
    if(e.kind==='sniper'&&e.cool<.55){ctx.strokeStyle='#ff607788';ctx.setLineDash([5,6]);ctx.beginPath();ctx.moveTo(e.x-camera+12,e.y+15);ctx.lineTo(player.x-camera+10,player.y+player.h/2);ctx.stroke();ctx.setLineDash([])}
    if(e.kind==='shield'&&e.guard)glow(ctx,e.x-camera+e.w/2+e.face*16,e.y+24,25,'#77eaff44');
    if(e.kind==='boss'&&e.bossType===1&&e.coreOpen)glow(ctx,e.x-camera+e.w/2,e.y+30,45,'#a0ff8580');
    if(e.cool<.3&&e.active)glow(ctx,e.x-camera+e.w/2,e.y+16,17,'#fa688b44');
  }
  for(const d of drops){const y=d.y+Math.sin(time*4)*3;glow(ctx,d.x-camera+9,y+9,25,'#8cffca44');sprite(ctx,{heal:12,shield:13,spread:14,rapid:15}[d.kind],d.x-camera-3,y-3,25,25)}
  if(!(player.inv>0&&Math.floor(time*15)%2===0)){
    const running=Math.abs(player.vx)>20&&player.ground&&!player.climbing&&player.dashTime<=0;
    const cell=!player.ground&&!player.climbing?3:0;
    ctx.save();if(player.dashTime>0){ctx.globalAlpha=.28;sprite(ctx,cell,player.x-camera-22-player.face*20,player.y-16,52,59,player.face<0);ctx.globalAlpha=1}
    ctx.shadowColor='#6ef5dc';ctx.shadowBlur=4;
    if(player.prone)combatSprite(ctx,Math.abs(player.vx)>5?Math.floor(time*7)%2:0,player.x-camera-21,player.y-4,65,23,player.face<0);
    else if(running)runningSprite(ctx,runFrame(player.anim,player.vx*player.face<0),player.x-camera+10,player.y+40,player.face<0);
    else sprite(ctx,cell,player.x-camera-16,player.y-16,52,59,player.face<0);
    ctx.restore();
    if(player.shield>0){ctx.strokeStyle='#7fffd580';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(player.x-camera+10,player.y+20,25,34,0,0,Math.PI*2);ctx.stroke()}
  }
  for(const pool of water){const x=pool.x-camera;box(ctx,x,pool.surface,pool.w,pool.bottom-pool.surface,'#276e844d');ctx.strokeStyle='#83cfdfb0';ctx.beginPath();for(let j=0;j<=pool.w;j+=5){const y=pool.surface+Math.sin(time*3+j*.09)*1.6;if(j===0)ctx.moveTo(x+j,y);else ctx.lineTo(x+j,y)}ctx.stroke()}
  for(const b of bullets){ctx.strokeStyle=b.friendly?'#cbffe6':b.grenade?'#ffc66d':'#ff6d96';ctx.lineWidth=b.friendly?2:b.wave?9:3;ctx.beginPath();ctx.moveTo(b.x-camera,b.y);ctx.lineTo(b.x-camera-b.vx*.011,b.y-b.vy*.011);ctx.stroke();glow(ctx,b.x-camera,b.y,b.grenade?16:8,b.friendly?'#aaffdf44':'#ff668c44');if(b.grenade){const landingX=b.x+b.vx*Math.max(0,b.life);ctx.strokeStyle='#ffb25888';ctx.beginPath();ctx.ellipse(landingX-camera,G-4,b.radius||55,5,0,0,Math.PI*2);ctx.stroke()}}
  for(const e of explosions){glow(ctx,e.x-camera,e.y,e.r,`rgba(255,155,75,${e.life*2})`);ctx.strokeStyle='#ffcc9a';ctx.beginPath();ctx.arc(e.x-camera,e.y,e.r*(1-e.life/.3),0,Math.PI*2);ctx.stroke()}
  for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.maxLife);box(ctx,p.x-camera,p.y,p.size,p.size,p.c)}ctx.globalAlpha=1;
  if(level!==1){
    ctx.save();ctx.filter='blur(1.7px)';
    for(let i=0;i<2;i++){const x=((time*(i?122:-158)+i*650)%(W+450)+W+450)%(W+450)-250;sprite(ctx,8,x,G+19+i*20,220,77,i===0)}
    ctx.restore();
  }
  // Post effects are simulated, not substitute illustrations.
  ctx.strokeStyle=level===1?'#9fffe715':'#bbdcf42a';ctx.lineWidth=.7;ctx.beginPath();
  for(let i=0;i<(level===1?28:100);i++){const x=((noise(i+7)*W-time*75)%W+W)%W,y=(noise(i+107)*H+time*(200+noise(i)*180))%H;ctx.moveTo(x,y);ctx.lineTo(x-4,y+10)}ctx.stroke();
  const vig=ctx.createRadialGradient(W/2,H/2,180,W/2,H/2,620);vig.addColorStop(0,'transparent');vig.addColorStop(1,'#02081588');ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);
  if(state==='story'&&ART.story){ctx.drawImage(ART.story,0,0,W,H);box(ctx,0,0,W,H,'#07131a18')}
  if(['playing','paused','dead','complete'].includes(state)){
    box(ctx,22,19,211,63,'#07131be0');label(ctx,'ARAN / 阿岚',35,39,11,'#baffd9');
    box(ctx,35,49,150,5,'#39414b');box(ctx,35,49,player.hp*1.5,5,'#b5ffd8');label(ctx,`${player.hp} HP`,196,55,9);
    const weapon={normal:'标准步枪',spread:'散射模块',rapid:'速射模块'}[player.weapon];
    label(ctx,player.wasSubmerged?'缺氧！W 上浮 / 离水恢复':`${weapon}${player.power>0?' '+Math.ceil(player.power)+'s':''}  / 护盾 ${player.shield}`,35,71,9,player.wasSubmerged?'#ffb77e':'#a4b9c1');
    box(ctx,W-225,19,203,63,'#07131be0');label(ctx,`SCORE ${String(score).padStart(6,'0')}`,W-36,40,14,'#e6eddc','right');
    label(ctx,`守卫 ${killed}/${total}  ·  ${Math.round(player.x/length*100)}%`,W-36,59,10,'#afc7c6','right');
    label(ctx,player.dashCooldown>0?'冲刺冷却':'SHIFT 冲刺就绪',W-36,73,8,'#98b0b1','right');
    box(ctx,315,27,330,2,'#ffffff25');box(ctx,315,27,330*player.x/length,2,'#bdffd6');
    const boss=enemies.find(e=>e.kind==='boss'&&e.hp>0&&e.active);if(boss){box(ctx,305,45,350,5,'#192233');box(ctx,305,45,350*boss.hp/boss.maxHp,5,boss.phase===2?'#ff5f82':'#d795be');label(ctx,`${BOSS_NAMES[boss.bossType]} / PHASE ${boss.phase}`,480,65,10,'#ffd6da','center')}
    if(state==='playing'&&player.x<260)label(ctx,'A/D 移动 · 空格跳跃 · C 趴下 / 匍匐 · SHIFT 冲刺',W/2,116,12,'#d5eee4','center');
    if(state==='playing'&&mouse.active){ctx.strokeStyle='#c8ffe2';ctx.lineWidth=1;ctx.beginPath();ctx.arc(mouse.x,mouse.y,6,0,Math.PI*2);ctx.moveTo(mouse.x-11,mouse.y);ctx.lineTo(mouse.x-4,mouse.y);ctx.moveTo(mouse.x+4,mouse.y);ctx.lineTo(mouse.x+11,mouse.y);ctx.moveTo(mouse.x,mouse.y-11);ctx.lineTo(mouse.x,mouse.y-4);ctx.moveTo(mouse.x,mouse.y+4);ctx.lineTo(mouse.x,mouse.y+11);ctx.stroke()}
  }
  if(flash>0)box(ctx,0,0,W,H,`rgba(255,80,130,${flash})`);
}

