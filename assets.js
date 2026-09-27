export const ART = {};
export async function loadArt(onProgress = () => {}) {
  const entries = ['market', 'underground', 'rooftop', 'atlas', 'story', 'courier-run', 'combat-atlas', 'environment-atlas', 'gamevado-graffiti'];
  let loaded = 0;
  await Promise.all(entries.map(name => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => { ART[name] = image; onProgress(++loaded / entries.length); resolve(); };
    image.onerror = () => reject(new Error(`无法加载美术资源：${name}`));
    image.src = `assets/${name}.png`;
  })));
}

// Every visible character, prop, pickup and environment comes from generated art.
// Canvas only composes those assets and adds lighting / rain / combat effects.
const crops = [
  [89,65,176,260],[360,65,235,265],[680,64,226,264],[1030,55,190,253],
  [47,353,246,296],[357,387,259,262],[652,340,325,310],[964,393,283,207],
  [0,746,377,185],[424,648,102,304],[612,777,396,134],[1027,655,180,299],
  [73,1015,196,170],[410,985,124,220],[656,1028,239,156],[980,1025,229,160],
];
export function sprite(ctx, cell, x, y, width, height, flip = false) {
  const atlas = ART.atlas;
  if (!atlas) return;
  const [sx,sy,sw,sh] = crops[cell];
  const scale = atlas.naturalWidth / 1254;
  ctx.save();
  ctx.translate(Math.round(x + (flip ? width : 0)), Math.round(y));
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(atlas, sx*scale, sy*scale, sw*scale, sh*scale, 0, 0, width, height);
  ctx.restore();
}

export function runningSprite(ctx, frame, centerX, feetY, flip = false) {
  const sheet = ART['courier-run'];
  if (!sheet) return;
  const width=sheet.naturalWidth/3, height=sheet.naturalHeight/2;
  ctx.save();
  ctx.translate(Math.round(centerX),Math.round(feetY));
  if(flip)ctx.scale(-1,1);
  // Fixed cell coordinates preserve scale and foot registration across frames.
  ctx.drawImage(sheet,(frame%3)*width,Math.floor(frame/3)*height,width,height,-34,-66,68,68);
  ctx.restore();
}

const combatCrops=[
  [27,201,364,126],[423,202,366,124],[849,67,270,263],[1220,82,303,252],
  [43,381,304,277],[409,400,382,259],[800,447,337,211],[1180,473,327,181],
  [8,707,393,260],[401,705,430,267],[786,677,405,272],[1182,778,325,185],
];
export function combatSprite(ctx,cell,x,y,width,height,flip=false){
  const sheet=ART['combat-atlas'];if(!sheet)return;
  const [sx,sy,sw,sh]=combatCrops[cell],scale=sheet.naturalWidth/1536;
  ctx.save();ctx.translate(Math.round(x+(flip?width:0)),Math.round(y));if(flip)ctx.scale(-1,1);
  ctx.drawImage(sheet,sx*scale,sy*scale,sw*scale,sh*scale,0,0,width,height);ctx.restore();
}

const envCrops=[[32,196,452,185],[540,102,470,300],[1032,87,499,340],[5,552,501,385],[580,513,433,478],[1097,501,383,511]];
export function environmentSprite(ctx,cell,x,y,width,height){
  const sheet=ART['environment-atlas'];if(!sheet)return;const [sx,sy,sw,sh]=envCrops[cell],scale=sheet.naturalWidth/1536;
  ctx.drawImage(sheet,sx*scale,sy*scale,sw*scale,sh*scale,Math.round(x),Math.round(y),width,height);
}
