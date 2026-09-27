export const BOSS_NAMES=['赤犬 · 街区镇压车','渊井 · 高压泵蛛','天幕 · 中继炮艇'];
export const ENEMY_STATS={
  street:{hp:4,w:24,h:40},sewer:{hp:3,w:24,h:38},room:{hp:4,w:24,h:40},
  drone:{hp:3,w:36,h:24},shield:{hp:6,w:30,h:44},rusher:{hp:3,w:24,h:42},
  grenadier:{hp:4,w:26,h:44},sniper:{hp:3,w:24,h:44},turret:{hp:6,w:40,h:30},
};
export function buildLevel(level,ground=466){
  const positions=[[330,740,1060,1430,1800,2150,2470,2840,3160],[350,670,1070,1410,1750,2100,2470,2830,3170],[310,710,1080,1440,1790,2150,2500,2840,3160]][level];
  const heights=[[326,360,298,335,288,350,305,345,285],[350,294,330,280,345,310,355,288,330],[310,270,345,290,345,265,310,278,340]][level];
  const sets=[['street','rusher','shield','sewer','street','rusher','shield','grenadier','turret'],['sewer','grenadier','turret','sewer','shield','grenadier','turret','sewer','rusher'],['shield','sniper','drone','grenadier','drone','sniper','shield','drone','turret']];
  const platforms=[],ladders=[],enemies=[],obstacles=[],hazards=[];
  for(let i=0;i<9;i++){
    const x=positions[i],y=heights[i],group=Math.floor(i/3);
    platforms.push({x,y,w:185+(i%2)*45});ladders.push({x:x+37,y,bottom:ground});
    const kind=sets[level][i];enemies.push({x:x+125,y:kind==='drone'?170:ground-ENEMY_STATS[kind].h,kind,group});
    if(i%2===0)enemies.push({x:x+120,y:y-(i%4===0?40:44),kind:i%4===0?'room':'sniper',group});
    if(i%3===1)enemies.push({x:x+235,y:150+(i%2)*30,kind:'drone',group});
    // Low crates create firing cover and jump routes without blocking ladders.
    obstacles.push({x:x+220,y:ground-(i%2?42:32),w:i%2?58:52,h:i%2?42:32,hp:8,maxHp:8,kind:'crate'});
  }
  for(const x of [1280,2380,3350])obstacles.push({x,y:ground-52,w:58,h:52,hp:Infinity,maxHp:Infinity,kind:'barrier'});
  if(level===1){
    for(const x of [900,2052,3204])hazards.push({x,y:ground-5,w:110,h:5,kind:'electric',cycle:1,offset:0,alwaysOn:true});
    for(const x of [1660,2670])hazards.push({x,y:ground-5,w:55,h:5,kind:'steam',cycle:4.8,offset:x/1000});
    // A low service duct can be crawled under or jumped onto.
    obstacles.push({x:1510,y:ground-73,w:90,h:47,hp:Infinity,maxHp:Infinity,kind:'barrier'});
  }
  if(level===2)for(const x of [950,2030,3030])hazards.push({x,y:ground-5,w:70,h:5,kind:'electric',cycle:4.2,offset:x/1000});
  // Hand-authored jump chains: each rise is below the full jump's 85px apex.
  for(const [index,x] of [170,1320,2340].entries()){
    const firstY=ground-58;
    platforms.push({x,y:firstY,w:115,kind:'awning'},{x:x+105,y:firstY-58,w:110,kind:'cornice'},{x:x+205,y:firstY-116,w:120,kind:'awning'});
    if(level===2)platforms.push({x:x+310,y:firstY-164,w:150,kind:'cornice'});
  }
  const water=level===1?[{x:1140,w:180,surface:ground-11,bottom:ground+62},{x:2235,w:165,surface:ground-11,bottom:ground+62}]:[];
  if(level===1){
    // Remove ground crates above water; the pool has a clear bank and optional upper route.
    for(let i=obstacles.length-1;i>=0;i--)if(water.some(w=>obstacles[i].x<w.x+w.w&&obstacles[i].x+obstacles[i].w>w.x))obstacles.splice(i,1);
    for(const w of water)platforms.push({x:w.x+45,y:ground-65,w:85,kind:'cornice'});
    for(const e of enemies){const stat=ENEMY_STATS[e.kind];if(e.y+stat.h===ground&&water.some(w=>e.x+stat.w>w.x&&e.x<w.x+w.w)){const pool=water.find(w=>e.x+stat.w>w.x&&e.x<w.x+w.w);e.x=pool.x-stat.w-20;}}
  }
  const encounters=[
    {group:0,left:260,right:1370,trigger:590,name:['夜市夹击','排水口伏击','屋顶交叉火力'][level]},
    {group:1,left:1390,right:2440,trigger:1660,name:['装甲封锁','高压检修廊','狙击长廊'][level]},
    {group:2,left:2460,right:3490,trigger:2710,name:['东街防线','泵房警戒线','中继塔守备'][level]},
    {group:3,left:3510,right:4175,trigger:3560,name:BOSS_NAMES[level]},
  ].map(e=>({...e,active:false,cleared:false}));
  enemies.push({x:level===2?3890:3900,y:level===2?185:ground-(level===1?78:66),kind:'boss',group:3,bossType:level});
  return {platforms,ladders,enemies,obstacles,hazards,water,encounters};
}
