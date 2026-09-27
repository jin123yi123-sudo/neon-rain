import {ART, sprite, runningSprite} from './assets.js';
import {runFrame} from './animation.js';

const W=960, H=540, G=466;
const noise = n => {const value=Math.sin(n*127.1+31.7)*43758.5453;return value-Math.floor(value)};
function box(ctx,x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h)}
function label(ctx,s,x,y,size=12,color='#dbeee9',align='left'){
  ctx.font=`${size}px 'Space Grotesk', 'Noto Sans SC', sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(s,x,y);ctx.textAlign='left';
}
function glow(ctx,x,y,r,color){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)}
export function render(ctx, game){
  const {level,camera,time,state,player,enemies,bullets,particles,drops,platforms,ladders,score,killed,total,length,mouse,flash}=game;
  ctx.imageSmoothingEnabled=false;
  box(ctx,0,0,W,H,'#09121c');
  const bg=ART[['market','underground','rooftop'][level]];
  if(bg){
    const tileWidth=1152, tileHeight=tileWidth*bg.naturalHeight/bg.naturalWidth;
    const groundRatio=[.795,.691,.720][level];
    const y=G-tileHeight*groundRatio;
    const offset=camera*.86;
    for(let i=Math.floor(offset/tileWidth);i<=Math.ceil((offset+W)/tileWidth);i++){
      ctx.drawImage(bg,i*tileWidth-offset,y,tileWidth,tileHeight);
    }
    // A second, softly focused atmospheric strip gives the skyline subtle depth.
    ctx.save();ctx.globalAlpha=.13;ctx.filter='blur(2px)';
    ctx.drawImage(bg,0,0,bg.naturalWidth,bg.naturalHeight*.25,-camera*.02,0,W+90,115);
    ctx.restore();
  }
  for(const p of platforms){
    if(p.x-camera>W+100||p.x+p.w-camera<0)continue;
    sprite(ctx,10,p.x-camera,p.y-32,p.w,48);
  }
  for(const l of ladders){
    if(l.x-camera>W+40||l.x-camera<-40)continue;
    // The generated ladder is stretched only along its intended climbing axis.
    sprite(ctx,9,l.x-camera-12,l.y,25,l.bottom-l.y);
  }
  const exit=length-65-camera;
  if(exit<W+100){glow(ctx,exit,G-50,85,'#b0ffb94d');sprite(ctx,13,exit-15,G-75,30,69);label(ctx,enemies.at(-1).hp>0?'击败守卫':'前往信标 →',exit,G-93,11,'#baffd1','center')}
  for(const e of enemies){
    if(e.hp<=0||e.x-camera<-120||e.x-camera>W+120)continue;
    if(e.kind==='sewer'&&!e.active)continue;
    const cell={street:4,sewer:5,room:4,drone:7,boss:6}[e.kind];
    const height=e.kind==='boss'?90:e.kind==='drone'?41:57;
    const width=e.kind==='boss'?95:e.kind==='drone'?61:49;
    const bob=e.kind==='drone'?0:Math.abs(Math.sin(time*6+e.x))*.8;
    ctx.save();if(e.hurt>0)ctx.filter='brightness(2)';
    sprite(ctx,cell,e.x-camera+(e.w-width)/2,e.y+e.h-height+bob,width,height,player.x<e.x);
    ctx.restore();
    if(e.kind==='boss'||e.hurt>0){box(ctx,e.x-camera-4,e.y-21,e.w+8,3,'#07111f');box(ctx,e.x-camera-4,e.y-21,(e.w+8)*e.hp/e.maxHp,3,'#ff719d')}
    if(e.kind==='boss')label(ctx,'WARDEN / 区域守卫',e.x-camera+e.w/2,e.y-30,9,'#ffc4d7','center');
    if(e.cool<.3&&e.active)glow(ctx,e.x-camera+e.w/2,e.y+16,17,'#fa688b44');
  }
  for(const d of drops){const y=d.y+Math.sin(time*4)*3;glow(ctx,d.x-camera+9,y+9,25,'#8cffca44');sprite(ctx,{heal:12,shield:13,spread:14,rapid:15}[d.kind],d.x-camera-3,y-3,25,25)}
  if(!(player.inv>0&&Math.floor(time*15)%2===0)){
    const running=Math.abs(player.vx)>20&&player.ground&&!player.climbing&&player.dashTime<=0;
    const cell=!player.ground&&!player.climbing?3:0;
    ctx.save();if(player.dashTime>0){ctx.globalAlpha=.28;sprite(ctx,cell,player.x-camera-22-player.face*20,player.y-16,52,59,player.face<0);ctx.globalAlpha=1}
    ctx.shadowColor='#6ef5dc';ctx.shadowBlur=4;
    if(running)runningSprite(ctx,runFrame(player.anim,player.vx*player.face<0),player.x-camera+10,player.y+40,player.face<0);
    else sprite(ctx,cell,player.x-camera-16,player.y-16,52,59,player.face<0);
    ctx.restore();
    if(player.shield>0){ctx.strokeStyle='#7fffd580';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(player.x-camera+10,player.y+20,25,34,0,0,Math.PI*2);ctx.stroke()}
  }
  for(const b of bullets){ctx.strokeStyle=b.friendly?'#cbffe6':'#ff6d96';ctx.lineWidth=b.friendly?2:3;ctx.beginPath();ctx.moveTo(b.x-camera,b.y);ctx.lineTo(b.x-camera-b.vx*.011,b.y-b.vy*.011);ctx.stroke();glow(ctx,b.x-camera,b.y,8,b.friendly?'#aaffdf44':'#ff668c44')}
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
    label(ctx,`${weapon}${player.power>0?' '+Math.ceil(player.power)+'s':''}  / 护盾 ${player.shield}`,35,71,9,'#a4b9c1');
    box(ctx,W-225,19,203,63,'#07131be0');label(ctx,`SCORE ${String(score).padStart(6,'0')}`,W-36,40,14,'#e6eddc','right');
    label(ctx,`守卫 ${killed}/${total}  ·  ${Math.round(player.x/length*100)}%`,W-36,59,10,'#afc7c6','right');
    label(ctx,player.dashCooldown>0?'冲刺冷却':'SHIFT 冲刺就绪',W-36,73,8,'#98b0b1','right');
    box(ctx,315,27,330,2,'#ffffff25');box(ctx,315,27,330*player.x/length,2,'#bdffd6');
    if(state==='playing'&&player.x<260)label(ctx,'A/D 移动  ·  空格跳跃  ·  按住鼠标射击  ·  SHIFT 冲刺',W/2,116,12,'#d5eee4','center');
    if(state==='playing'&&mouse.active){ctx.strokeStyle='#c8ffe2';ctx.lineWidth=1;ctx.beginPath();ctx.arc(mouse.x,mouse.y,6,0,Math.PI*2);ctx.moveTo(mouse.x-11,mouse.y);ctx.lineTo(mouse.x-4,mouse.y);ctx.moveTo(mouse.x+4,mouse.y);ctx.lineTo(mouse.x+11,mouse.y);ctx.moveTo(mouse.x,mouse.y-11);ctx.lineTo(mouse.x,mouse.y-4);ctx.moveTo(mouse.x,mouse.y+4);ctx.lineTo(mouse.x,mouse.y+11);ctx.stroke()}
  }
  if(flash>0)box(ctx,0,0,W,H,`rgba(255,80,130,${flash})`);
}
