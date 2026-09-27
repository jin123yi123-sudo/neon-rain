// Touch input stays separate from keyboard input so releasing one cannot cancel the other.
export function stickVector(x,y,radius){
  const length=Math.hypot(x,y),scale=length>radius?radius/length:1;
  return {x:x*scale,y:y*scale,dx:Math.abs(x)>radius*.28?Math.sign(x):0,dy:Math.abs(y)>radius*.28?Math.sign(y):0,angle:Math.atan2(y,x),aiming:length>radius*.18};
}
export function mountTouch({touch,getState,getFace,pause,root=document,host=window}){
  const mode=new URLSearchParams(host.location.search).get('mode');
  const enabled=mode==='mobile'||(mode!=='desktop'&&host.matchMedia('(any-pointer: coarse)').matches&&Math.min(host.innerWidth,host.innerHeight)<=900);
  root.body.classList.toggle('mobile-game',enabled);
  const controls=root.querySelector('#touch-controls'),menu=root.querySelector('#touch-menu');
  const sticks=[root.querySelector('#move-stick'),root.querySelector('#aim-stick')];
  const actions=[...root.querySelectorAll('[data-touch-key]')];
  const pointers=new Map();let prone=false,previousState='';
  function refresh(){
    touch.keys.clear();touch.firing=false;
    if(prone)touch.keys.add('c');
    for(const p of pointers.values()){
      if(p.kind==='move'){if(p.v.dx)touch.keys.add(p.v.dx>0?'d':'a');if(p.v.dy)touch.keys.add(p.v.dy>0?'s':'w')}
      else if(p.kind==='aim'){touch.firing=true;touch.angle=p.v.aiming?p.v.angle:getFace()<0?Math.PI:0}
      else touch.keys.add(p.key);
    }
  }
  function release(){
    pointers.clear();prone=false;touch.keys.clear();touch.firing=false;
    for(const el of [...sticks,...actions]){el.classList.remove('held');el.style.setProperty('--stick-x','0px');el.style.setProperty('--stick-y','0px')}
    root.querySelector('#touch-prone').setAttribute('aria-pressed','false');
  }
  function sync(state){if(state===previousState)return;previousState=state;controls.hidden=state!=='playing';menu.textContent=state==='playing'?'暂停':'菜单';if(state!=='playing')release()}
  if(!enabled)return {release,sync,enabled};
  function bind(el,kind,key){
    el.addEventListener('pointerdown',event=>{
      if(getState()!=='playing'||[...pointers.values()].some(p=>p.el===el))return;
      event.preventDefault();el.setPointerCapture(event.pointerId);
      const bounds=el.getBoundingClientRect(),radius=bounds.width/2;
      const p={el,kind,key,cx:bounds.left+radius,cy:bounds.top+bounds.height/2,radius:radius*.7,v:stickVector(0,0,radius)};
      pointers.set(event.pointerId,p);el.classList.add('held');refresh();
    });
    el.addEventListener('pointermove',event=>{
      const p=pointers.get(event.pointerId);if(!p||p.el!==el||kind==='button')return;
      event.preventDefault();p.v=stickVector(event.clientX-p.cx,event.clientY-p.cy,p.radius);
      el.style.setProperty('--stick-x',`${p.v.x}px`);el.style.setProperty('--stick-y',`${p.v.y}px`);refresh();
    });
    const end=event=>{const p=pointers.get(event.pointerId);if(!p||p.el!==el)return;pointers.delete(event.pointerId);el.classList.remove('held');el.style.setProperty('--stick-x','0px');el.style.setProperty('--stick-y','0px');refresh()};
    for(const name of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(name,end);
  }
  bind(sticks[0],'move');bind(sticks[1],'aim');
  for(const el of actions)bind(el,'button',el.dataset.touchKey);
  root.querySelector('#touch-prone').onclick=()=>{if(getState()!=='playing')return;prone=!prone;root.querySelector('#touch-prone').setAttribute('aria-pressed',String(prone));refresh()};
  menu.onclick=()=>{if(getState()==='playing')pause();else root.querySelector('#mobile-options').showModal()};
  root.querySelector('#close-mobile-options').onclick=()=>root.querySelector('#mobile-options').close();
  for(const el of root.querySelectorAll('[data-mobile-action]'))el.onclick=()=>{root.querySelector('#mobile-options').close();root.querySelector(`#${el.dataset.mobileAction}`).click()};
  function viewportChanged(){release();if(host.innerHeight>host.innerWidth&&getState()==='playing')pause()}
  host.addEventListener('resize',viewportChanged);host.addEventListener('blur',release);
  root.addEventListener('visibilitychange',()=>{if(root.hidden)release()});
  return {release,sync,enabled};
}
