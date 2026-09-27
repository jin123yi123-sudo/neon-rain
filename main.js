import {mountTouch} from './touch.js';
import {SAVE_KEY,validateSave,encodeSave,decodeSave} from './progress.js';
import {loadArt} from './assets.js';
import {render} from './renderer.js';
import {RUN_STRIDE} from './animation.js';
import {buildLevel,ENEMY_STATS,BOSS_NAMES} from './level-design.js';
import {playerHitbox,pointInside,setProne,resolveObstacles,shieldBlocks,stepEnemy,waterAt,stepWater} from './combat.js';

const $=s=>document.querySelector(s),canvas=$('#game'),ctx=canvas.getContext('2d');
const W=960,H=540,G=466,LENGTH=4200,STEP=1/120,keys=new Set();
const touch={keys:new Set(),firing:false,angle:0};
let touchControls;
const pressed=key=>keys.has(key)||touch.keys.has(key);
const levels=[
  {name:'雨巷夜市',speaker:'老陈 / 修理铺',story:['「阿岚，听得到吗？」老陈把最后一枚电芯塞进你的掌心。','企业切断了街区供电。面馆老板还守着那锅热汤，诊所里还有人等着。','穿过夜市，击败东侧守卫。把电芯带到中继塔——他们的灯，就靠你了。']},
  {name:'地下暗流',speaker:'老陈 / 无线电',story:['地上的招牌熄灭了，地下的机器却还在轰鸣。','「不是故障。他们把整条街的电，都送进了自己的中继塔。」','循着绿色检修灯前进。外梯能避开地面火力，小心从管道里冒出的守卫。']},
  {name:'天际防线',speaker:'阿岚 / 最后一程',story:['走出检修口，雨水又落在你的目镜上。远处中继塔的灯从未熄灭。','「老陈，等我回来，你那台旧收音机……该修好了吧？」耳机里传来一声笑。','击败重装守卫，把电芯接入信标。今晚，这座城该为自己亮一次灯。']},
];
let state='loading',level=0,unlocked=0,score=0,camera=0,time=0,killed=0,total=0,shot=0;
let player,enemies=[],bullets=[],particles=[],drops=[],platforms=[],ladders=[];
let obstacles=[],hazards=[],water=[],encounters=[],explosions=[],activeEncounter=null;
let storyStep=0,muted=true,audio,shake=0,flash=0,jumpBuffer=0,artReady=false,checkpointScore=0;
let mouse={x:600,y:260,down:false,active:false},input={jumpHeld:false,dash:false};
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const approach=(value,target,amount)=>value<target?Math.min(target,value+amount):Math.max(target,value-amount);
const rand=n=>{const v=Math.sin(n*127.1+31.7)*43758.5453;return v-Math.floor(v)};

function beep(f=220,len=.06){
  if(muted)return;
  try{audio??=new AudioContext();audio.resume();const o=audio.createOscillator(),gain=audio.createGain();o.type='triangle';o.frequency.setValueAtTime(f,audio.currentTime);o.frequency.exponentialRampToValueAtTime(f/2,audio.currentTime+len);gain.gain.setValueAtTime(.035,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+len);o.connect(gain).connect(audio.destination);o.start();o.stop(audio.currentTime+len)}catch{}
}
function toast(message){$('#toast').textContent=message;$('#toast').style.opacity=1;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.opacity=0,3200)}
function load(){try{return validateSave(JSON.parse(localStorage.getItem(SAVE_KEY)))}catch{return null}}
function save(quiet=false){
  const value={version:1,level,unlocked,score};
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(value));if(!quiet)toast('进度已保存 · 从本区域起点继续')}catch{toast('本地存储不可用，可复制分享存档码')}
  return value;
}
function reset(n){
  level=n;camera=0;killed=0;shot=0;shake=0;flash=0;jumpBuffer=0;checkpointScore=score;
  keys.clear();touchControls?.release();mouse.down=false;input.jumpHeld=false;input.dash=false;
  bullets=[];particles=[];drops=[];enemies=[];explosions=[];activeEncounter=null;
  player={x:90,y:G-40,w:20,h:40,prone:false,vx:0,vy:0,hp:100,shield:0,inv:0,weapon:'normal',power:0,face:1,ground:true,climbing:false,coyote:.12,anim:0,dashTime:0,dashCooldown:0,dropThrough:0};
  const design=buildLevel(level,G);
  ({platforms,ladders,obstacles,hazards,water,encounters}=design);
  for(const e of design.enemies){addEnemy(e.x,e.y,e.kind,(ENEMY_STATS[e.kind]?.hp||[58,72,88][level])+level);Object.assign(enemies.at(-1),{group:e.group,bossType:e.bossType,spawnX:e.x})}
  total=enemies.length;$('#district').textContent=`0${n+1} · ${levels[n].name}`;
  document.querySelectorAll('[data-level]').forEach((button,i)=>{button.classList.toggle('selected',i===n);const icon=button.querySelector('i');if(icon)icon.textContent=i<=unlocked?'↗':'◇'});
}
function addEnemy(x,y,kind,hp){const stats=ENEMY_STATS[kind];enemies.push({x,y,w:stats?.w||[104,112,125][level],h:stats?.h||[66,78,60][level],hp,maxHp:hp,kind,cool:1.8+rand(x),base:y,active:false,hurt:0,age:0,face:-1,guard:0,burst:0,phase:1})}
function overlay(title,body,button,kicker='NEON RAIN / FIELD TRANSMISSION'){
  $('#overlay').classList.remove('hidden');$('#overlay').classList.toggle('story',state==='story');
  $('#overlay-title').textContent=title;$('#overlay-text').textContent=body;$('#start').innerHTML=`${button} <span>→</span>`;$('#overlay-kicker').textContent=kicker;$('#continue').style.display='none';
}
function chapter(n){if(!artReady)return;reset(n);state='story';storyStep=0;showStory();$('.game-shell').scrollIntoView({behavior:'smooth',block:'center'})}
function showStory(){overlay(levels[level].name,levels[level].story[storyStep],storyStep===2?'开始行动':'继续对话',`${levels[level].speaker} · ${storyStep+1} / 3`);$('#continue').style.display='block';$('#continue').textContent='跳过剧情'}
function play(){state='playing';keys.clear();touchControls?.release();mouse.down=false;$('#overlay').classList.add('hidden');canvas.focus()}
function retry(){score=checkpointScore;reset(level);play()}
function pause(){touchControls?.release();if(state==='playing'){state='paused';mouse.down=false;keys.clear();overlay('雨中稍歇','街区会等你。准备好了，就继续向前。','继续行动')}else if(state==='paused')play()}
function burst(x,y,color,count=10){for(let i=0;i<count;i++){const life=.2+Math.random()*.3;particles.push({x,y,vx:(Math.random()-.5)*160,vy:(Math.random()-.7)*160,life,maxLife:life,c:color,size:1+Math.random()*2})}if(particles.length>220)particles.splice(0,particles.length-220)}
function hitPlayer(damage){
  if(player.inv>0||state!=='playing')return;
  const absorbed=Math.min(player.shield,damage);player.shield-=absorbed;player.hp=Math.max(0,player.hp-(damage-absorbed));
  player.inv=.65;shake=3.5;flash=.12;beep(90,.12);
  if(player.hp<=0){state='dead';mouse.down=false;overlay('信号中断','电芯还在。深呼吸，再走一次这条街。','重试本区域')}
}
function fire(angle){
  const angles=player.weapon==='spread'?[-.17,0,.17]:[0];
  const originY=player.y+(player.prone?7:15),reach=player.prone?31:24;
  for(const offset of angles)bullets.push({x:player.x+10+Math.cos(angle)*reach,y:originY+Math.sin(angle)*reach,vx:Math.cos(angle+offset)*760,vy:Math.sin(angle+offset)*760,life:1.45,friendly:true});
  burst(player.x+10+Math.cos(angle)*(reach+4),originY+Math.sin(angle)*(reach+4),'#f4edbc',3);beep(430,.045);
}
function update(dt){
  if(state!=='playing')return;
  player.inv=Math.max(0,player.inv-dt);shot-=dt;player.power-=dt;player.dashCooldown=Math.max(0,player.dashCooldown-dt);player.dropThrough=Math.max(0,player.dropThrough-dt);
  if(player.power<=0)player.weapon='normal';
  const dx=(pressed('d')||pressed('arrowright')?1:0)-(pressed('a')||pressed('arrowleft')?1:0);
  const dy=(pressed('s')||pressed('arrowdown')?1:0)-(pressed('w')||pressed('arrowup')?1:0);
  if(dx)player.face=dx;
  setProne(player,pressed('c'),obstacles);
  const jumpHeld=pressed(' ');
  if(jumpHeld&&!input.jumpHeld)jumpBuffer=.14;
  input.jumpHeld=jumpHeld;jumpBuffer=Math.max(0,jumpBuffer-dt);
  player.coyote=player.ground?.12:Math.max(0,player.coyote-dt);
  const ladder=!player.prone&&ladders.find(l=>Math.abs(player.x+10-l.x)<25&&player.y+player.h>=l.y-5&&player.y<=G-38&&(player.y+player.h>l.y+2||dy>0||player.climbing));
  if(ladder&&dy!==0){player.climbing=true;player.vy=0}
  if(!ladder||dx!==0)player.climbing=false;
  if(player.climbing&&ladder){
    player.x=approach(player.x,ladder.x-10,450*dt);player.vx=0;player.vy=dy*160;player.ground=false;
    if(dy<0&&player.y+40<=ladder.y+5){player.y=ladder.y-40;player.vy=0;player.ground=true;player.climbing=false}
  }else{
    player.vx=approach(player.vx,dx*(player.prone?65:player.inWater?130:225),(dx?2100:2600)*dt);
    player.vy+=(player.inWater?470:900)*dt;
    if(player.inWater&&dy<0){player.vy=approach(player.vy,-155,1100*dt);player.prone=false;player.h=40}
  }
  if(jumpBuffer>0&&!player.prone&&(player.coyote>0||player.climbing)){
    if(dy>0&&player.ground&&player.y<G-41){player.dropThrough=.2;player.y+=4;player.vy=40}
    else{player.vy=-390;beep(200,.065)}
    player.ground=false;player.climbing=false;player.coyote=0;jumpBuffer=0;
  }
  if(!jumpHeld&&player.vy<-175&&!player.climbing)player.vy=approach(player.vy,-175,1500*dt);
  if(pressed('shift')&&!input.dash&&!player.prone&&player.dashCooldown<=0){player.dashTime=.14;player.dashCooldown=.85;player.inv=Math.max(player.inv,.16);player.climbing=false;beep(330,.08)}
  input.dash=pressed('shift');
  if(player.dashTime>0){player.dashTime-=dt;player.vx=player.face*490;player.vy=0}
  const oldY=player.y,oldX=player.x;player.x=clamp(player.x+player.vx*dt,0,LENGTH-25);player.y+=player.vy*dt;player.ground=false;
  const oldPool=waterAt(oldX+10,water);
  if(oldPool&&!waterAt(player.x+10,water)&&player.y+player.h>G+3)player.x=oldX;
  const floor=waterAt(player.x+10,water)?.bottom||G;
  if(player.y+player.h>=floor){player.y=floor-player.h;player.vy=0;player.ground=true;player.climbing=false}
  if(!player.climbing&&player.vy>=0&&player.dropThrough<=0){
    for(const platform of platforms)if(oldY+player.h<=platform.y+2&&player.y+player.h>=platform.y&&player.x+20>platform.x&&player.x<platform.x+platform.w){player.y=platform.y-player.h;player.vy=0;player.ground=true}
  }
  resolveObstacles(player,oldX,oldY,obstacles);
  player.y=Math.max(25,player.y);
  if(player.ground&&!player.climbing&&player.dashTime<=0)player.anim+=Math.abs(player.vx)*dt/RUN_STRIDE;
  if((mouse.down||touch.firing||pressed('j'))&&shot<=0){
    const angle=touch.firing?touch.angle:mouse.down?Math.atan2(mouse.y-player.y-(player.prone?7:15),mouse.x+camera-player.x-10):player.prone?(player.face>0?0:Math.PI):Math.atan2(dy,dx||(!dy?player.face:0));
    if(mouse.down||touch.firing)player.face=Math.cos(angle)>=0?1:-1;
    fire(angle);shot=player.weapon==='rapid'?.075:.155;
  }
  const target=clamp(player.x-W*.36+player.vx*.14,0,LENGTH-W);
  camera+=(target-camera)*(1-Math.exp(-9*dt));
  for(const zone of encounters){
    if(!zone.cleared&&player.x>=zone.trigger&&(!activeEncounter||activeEncounter===zone)){zone.active=true;activeEncounter=zone;}
    if(zone.active){
      if(enemies.some(e=>e.group===zone.group&&e.hp>0)){player.x=clamp(player.x,zone.left,zone.right-20)}
      else{zone.cleared=true;zone.active=false;activeEncounter=null;toast('封锁解除 · '+zone.name);drops.push({x:zone.right-70,y:G-20,kind:'heal',life:45,vy:0})}
    }
  }
  for(const enemy of enemies){
    if(enemy.hp<=0)continue;
    const ex=enemy.x,ey=enemy.y;
    stepEnemy(enemy,{player,bullets,time,ground:G,level},dt);
    if(['street','sewer','shield','rusher','grenadier'].includes(enemy.kind)){
      const body={...enemy,vy:0,vx:enemy.x-ex,ground:true};resolveObstacles(body,ex,ey,obstacles);enemy.x=body.x;
    }
    if(enemy.active&&(enemy.kind!=='sewer'||enemy.emerged)&&player.x+20>enemy.x&&player.x<enemy.x+enemy.w&&player.y+player.h>enemy.y&&player.y<enemy.y+enemy.h)hitPlayer(enemy.kind==='rusher'?22:18);
  }
  for(const h of hazards){const phase=(time+h.offset)%h.cycle;h.warning=h.alwaysOn||phase>h.cycle-1.8;h.on=h.alwaysOn||phase>h.cycle-.85;if(h.on&&player.x+20>h.x&&player.x<h.x+h.w&&player.y+player.h>G-(h.kind==='electric'?14:55))hitPlayer(20)}
  const beforeWaterHp=player.hp;stepWater(player,water,dt);if(player.hp>beforeWaterHp)toast(`恢复呼吸 +${player.hp-beforeWaterHp} HP`);
  if(player.hp<=0&&state==='playing'){state='dead';mouse.down=false;overlay('呼吸中断','积水淹过了目镜。下次试试上方平台，或按 W 向水面游。','重试本区域')}
  for(const blast of explosions)blast.life-=dt;explosions=explosions.filter(e=>e.life>0);
  for(const bullet of bullets){
    if(bullet.gravity)bullet.vy+=bullet.gravity*dt;
    bullet.x+=bullet.vx*dt;bullet.y+=bullet.vy*dt;bullet.life-=dt;
    if(bullet.grenade&&(bullet.life<=0||bullet.y>=G-5)){
      const radius=bullet.radius||55;explosions.push({x:bullet.x,y:Math.min(bullet.y,G-12),r:radius,life:.3});
      if(Math.hypot(bullet.x-player.x-10,Math.min(bullet.y,G-12)-player.y-player.h/2)<radius)hitPlayer(bullet.damage);bullet.life=0;burst(bullet.x,Math.min(bullet.y,G-12),'#ffb77f',20);continue;
    }
    const cover=!bullet.grenade&&!bullet.wave&&obstacles.find(o=>o.hp>0&&pointInside(bullet.x,bullet.y,o));
    if(cover){if(bullet.friendly)cover.hp--;bullet.life=0;burst(bullet.x,bullet.y,'#dda379',3);continue}
    if(bullet.friendly){
      for(const enemy of enemies){
        if(enemy.kind==='sewer'&&!enemy.emerged&&!(enemy.emerge>0))continue;
        if(enemy.hp<=0||bullet.x<enemy.x-5||bullet.x>enemy.x+enemy.w+5||bullet.y<enemy.y-5||bullet.y>enemy.y+enemy.h+5)continue;
        bullet.life=0;
        if(shieldBlocks(enemy,bullet)){burst(bullet.x,bullet.y,'#81eaff',3);break}
        const damage=enemy.kind==='boss'&&enemy.bossType===1?(enemy.coreOpen?2:.5):1;
        enemy.hp-=damage;enemy.hurt=.1;burst(bullet.x,bullet.y,'#ffc085',4);
        if(enemy.hp<=0){killed++;score+=enemy.kind==='boss'?2000:100;burst(enemy.x,enemy.y+15,'#ff749d',18);drops.push({x:enemy.x+8,y:enemy.y,kind:['heal','spread','rapid','shield'][killed%4],life:30,vy:-90});beep(120,.11)}
        break;
      }
    }else if(!bullet.grenade&&pointInside(bullet.x,bullet.y,playerHitbox(player))){hitPlayer(bullet.damage||14);bullet.life=0}
  }
  bullets=bullets.filter(b=>b.life>0&&b.y>0&&b.y<H);
  for(const drop of drops){
    drop.life-=dt;drop.vy+=440*dt;const old=drop.y;drop.y=Math.min(G-19,drop.y+drop.vy*dt);
    for(const p of platforms)if(drop.vy>=0&&old+18<=p.y+2&&drop.y+18>=p.y&&drop.x>=p.x&&drop.x<=p.x+p.w){drop.y=p.y-18;drop.vy=0}
    const distance=Math.hypot(drop.x-player.x-10,drop.y-player.y-player.h/2);
    if(distance<85){drop.x+=(player.x+10-drop.x)*dt*7;drop.y+=(player.y+player.h/2-drop.y)*dt*7}
    if(distance<35){
      if(drop.kind==='heal')player.hp=Math.min(100,player.hp+30);
      if(drop.kind==='shield')player.shield=40;
      if(['spread','rapid'].includes(drop.kind)){player.weapon=drop.kind;player.power=18}
      drop.life=0;toast({heal:'医疗包 +30 HP',shield:'护盾已激活',spread:'散射模块 · 18 秒',rapid:'速射模块 · 18 秒'}[drop.kind]);beep(660,.1);
    }
  }
  drops=drops.filter(d=>d.life>0);
  for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=180*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);
  if(state==='playing'&&player.x>LENGTH-100&&enemies.at(-1).hp<=0){
    state='complete';mouse.down=false;unlocked=Math.max(unlocked,Math.min(2,level+1));save(true);
    overlay(level===2?'万家灯火':'区域突破',level===2?'电流重新流过街区。面馆的招牌亮起，窗边有人向你挥手。耳机里传来老陈的声音：「汤还热着，回来吧。」':'「收到了，你的信号很清楚。」老陈的声音再次响起。城市的另一侧，还有人在等你。',level===2?'重返夜市':'进入下一区域');
  }
}

let last=performance.now(),accumulator=0,lastStatus='';
function loop(now){
  touchControls?.sync(state);
  const elapsed=Math.min(.05,(now-last)/1000);last=now;
  if(state==='playing'){accumulator+=elapsed;while(accumulator>=STEP){time+=STEP;update(STEP);accumulator-=STEP}}else{accumulator=0;if(state!=='paused')time+=elapsed}
  shake=Math.max(0,shake-elapsed*20);flash=Math.max(0,flash-elapsed);
  ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
  render(ctx,{level,camera,time,state,player,enemies,bullets,particles,drops,platforms,ladders,obstacles,hazards,water,explosions,activeEncounter,score,killed,total,length:LENGTH,mouse,flash,touchMode:touchControls?.enabled});ctx.restore();
  if(lastStatus!==state){lastStatus=state;$('#status').textContent=state==='playing'?'LOCAL SESSION / IN ACTION':state==='paused'?'LOCAL SESSION / PAUSED':'LOCAL SESSION / READY'}
  requestAnimationFrame(loop);
}
function loseFocus(){touchControls?.release();keys.clear();mouse.down=false;input.jumpHeld=false;if(state==='playing')pause()}
addEventListener('keydown',event=>{
  if(event.target.matches('textarea,input')||$('#guide').open)return;
  const key=event.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key))event.preventDefault();keys.add(key);
  if(key==='escape'&&!event.repeat)pause();if(key==='r'&&state==='dead')retry();
});
addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
addEventListener('blur',loseFocus);document.addEventListener('visibilitychange',()=>{if(document.hidden)loseFocus()});
function pointer(event){if(event.pointerType==='touch')return;const bounds=canvas.getBoundingClientRect();mouse.x=(event.clientX-bounds.left)*W/bounds.width;mouse.y=(event.clientY-bounds.top)*H/bounds.height;mouse.active=true}
canvas.addEventListener('pointermove',pointer);canvas.addEventListener('pointerdown',event=>{if(event.pointerType!=='touch'&&event.button===0&&state==='playing'){pointer(event);mouse.down=true;canvas.focus()}});
addEventListener('pointerup',()=>mouse.down=false);addEventListener('pointercancel',()=>mouse.down=false);canvas.addEventListener('contextmenu',event=>event.preventDefault());
$('#start').onclick=()=>{
  if(state==='menu')chapter(0);
  else if(state==='story'){if(++storyStep<3)showStory();else play()}
  else if(state==='paused')play();else if(state==='dead')retry();else if(state==='complete')chapter(level===2?0:level+1);
};
$('#continue').onclick=()=>{if(state==='story'){play();return}const saved=load();if(saved){unlocked=saved.unlocked;score=saved.score;chapter(saved.level)}else toast('暂无存档，开始新的旅程吧')};
$('#save').onclick=()=>{if(state==='menu'||state==='loading'){toast('进入街区后可保存进度');return}save()};
$('#sound').onclick=()=>{muted=!muted;$('#sound').textContent=`声音 ${muted?'OFF':'ON'}`;beep(500)};
$('#help').onclick=()=>{if(state==='playing')pause();$('#guide').showModal()};$('#close-guide').onclick=()=>$('#guide').close();
$('#share').onclick=async()=>{
  const value=(state==='menu'||state==='loading')?(load()||{version:1,level:0,unlocked:0,score:0}):save(true);
  const code=encodeSave(value),url=new URL(location.href);url.hash='save='+code;
  $('#code').value=url.href;
  try{if(touchControls?.enabled&&navigator.share){await navigator.share({title:'霓雨街区',text:'接过电芯，继续这场雨夜行动。',url:url.href});return}await navigator.clipboard.writeText(url.href);toast('分享链接已复制 · 包含已解锁章节与分数')}catch(error){if(error.name==='AbortError')return;$('#guide').showModal();toast('请复制文本框中的分享链接')}
};
function importCode(input){
  try{const code=input.includes('#save=')?input.split('#save=')[1]:input;const saved=decodeSave(decodeURIComponent(code.trim()));unlocked=saved.unlocked;score=saved.score;chapter(saved.level);save(true);toast('存档导入成功');return true}catch{toast('存档格式无效或版本不兼容');return false}
}
$('#import').onclick=()=>{if(artReady&&importCode($('#code').value))$('#guide').close()};
document.querySelectorAll('[data-level]').forEach(button=>button.onclick=()=>{const n=Number(button.dataset.level);if(!artReady)return;if(n<=unlocked)chapter(n);else toast('先完成上一章节，解锁这片街区')});
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('.viewport').requestFullscreen()}catch{toast('当前浏览器不支持全屏，可使用 F11')}};
touchControls=mountTouch({touch,getState:()=>state,getFace:()=>player?.face||1,pause});
reset(0);$('#start').disabled=true;$('#start').textContent='正在载入美术…';
loadArt(progress=>{$('#start').textContent=`载入街区 ${Math.round(progress*100)}%`}).then(()=>{
  artReady=true;state='menu';$('#start').disabled=false;$('#start').innerHTML='进入街区 <span>→</span>';
  const saved=load();if(saved){unlocked=saved.unlocked;score=saved.score;reset(0)}
  if(location.hash.startsWith('#save='))importCode(location.hash);
}).catch(error=>{state='error';$('#start').textContent='载入失败，请刷新';toast(error.message)});
requestAnimationFrame(loop);
window.neonRain={getState:()=>({state,level,unlocked,score,player:{...player},enemies:enemies.filter(e=>e.hp>0).length,platforms:platforms.length,ladders:ladders.length,artReady})};
