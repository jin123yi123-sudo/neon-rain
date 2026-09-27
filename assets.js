export const ART = {};
export async function loadArt(onProgress = () => {}) {
  const entries = ['market', 'underground', 'rooftop', 'atlas', 'story'];
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
