// Pixel scenery for the underground service corridor and rooftop district.
export function drawDistrict(ctx, level, x, i, ground, time) {
  if (!level) return false;
  const box=(a,b,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(a),Math.round(b),w,h)};
  const label=(s,a,b,c,size=14)=>{ctx.fillStyle=c;ctx.font=`${size}px monospace`;ctx.fillText(s,a,b)};
  if (level===1) {
    box(x,130,204,ground-130,'#172c34');
    for(let row=0;row<12;row++)for(let col=0;col<5;col++){
      box(x+col*42+(row%2)*18,140+row*25,38,21,row%3?'#233a40':'#294048');
    }
    box(x+8,116,15,350,'#435b62');box(x+11,116,3,350,'#71888b');
    box(x+35,205,135,14,'#6e6860');box(x+35,208,135,3,'#afa086');
    box(x+162,205,14,150,'#6e6860');box(x+165,205,3,150,'#afa086');
    box(x+46,265,96,125,'#0b2028');box(x+50,269,88,117,'#304851');
    for(let j=0;j<8;j++)box(x+58,285+j*10,68,3,'#172e39');
    box(x+66,241,56,15,'#70e3b7');label(['PUMP 09','DANGER','GRID 72'][i%3<0?0:i%3],x+68,252,'#163631',9);
    box(x+139,331,27,46,'#64736e');box(x+145,338,15,9,'#8efbb6');
    box(x+141,392,40,15,'#3c6559');box(x+145,386,32,6,'#73997c');
    box(x+37,ground-15,120,5,'#0b161c');
    for(let j=0;j<8;j++)box(x+40+j*14,ground-15,3,5,'#6b8f8a');
    ctx.fillStyle='#9affe916';for(let k=0;k<5;k++)ctx.fillRect(x+85+Math.sin(time+k)*8,ground-30-k*10,10+k*4,8);
    label('地下供电 / '+String(i+2).padStart(2,'0'),x+39,174,'#a2c7b4',12);
  } else {
    const top=210+(i%3)*27;
    box(x,top,195,ground-top,'#24263e');box(x+195,top+10,15,ground-top-10,'#161b2d');
    box(x-5,top-8,205,8,'#757186');
    for(let row=0;row<4;row++)for(let col=0;col<6;col++){
      box(x+10+col*30,top+20+row*45,18,28,(col+row+i)%3?'#35455f':'#be988a');
      box(x+17+col*30,top+20+row*45,3,28,'#202a42');
    }
    box(x+40,top-60,85,52,'#596578');box(x+45,top-66,75,6,'#85939e');
    box(x+44,top-42,77,4,'#303e53');box(x+44,top-22,77,4,'#303e53');
    box(x+155,top-120,4,120,'#84929e');box(x+131,top-101,50,3,'#788892');
    box(x+146,top-116,23,3,'#788892');box(x+155,top-123,4,4,'#fc81b7');
    ctx.strokeStyle='#80869a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,top-42);ctx.lineTo(x+195,top-25);ctx.stroke();
    for(let k=0;k<5;k++)box(x+8+k*32,top-41+k*3,17,25,['#a77389','#597f8e','#aea694'][k%3]);
    box(x+5,ground-53,65,28,'#151d34');label('中繼 '+(i+2),x+10,ground-33,'#d4a2ff',13);
    box(x+133,ground-26,32,20,'#675d78');box(x+139,ground-35,18,9,'#5b877f');
  }
  return true;
}
