export const RUN_STRIDE = 108;
export function runFrame(cycles, backwards=false) {
  const frame=Math.floor(((cycles%1)+1)%1*6+1e-8)%6;
  return backwards?(6-frame)%6:frame;
}
