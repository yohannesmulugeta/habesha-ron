const runway=document.querySelector('.runway');
const rail=document.querySelector('#runway-rail');
const slides=[...document.querySelectorAll('.runway-slide')];
const progressBar=document.querySelector('[data-progress]');
const currentLabel=document.querySelector('[data-current]');
const header=document.querySelector('[data-header]');
const prev=document.querySelector('[data-prev]');
const next=document.querySelector('[data-next]');
const menuButton=document.querySelector('.menu-toggle');
const navigation=document.querySelector('.site-nav');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');

let touching=false,pageFrame=0,railFrame=0;
let target=rail?rail.scrollLeft:0;
let current=target;
const clamp=(v,min,max)=>Math.min(Math.max(v,min),max);

function activeIndex(){
  if(!rail||!rail.clientWidth)return 0;
  return clamp(Math.round(rail.scrollLeft/rail.clientWidth),0,slides.length-1);
}
function updateSlideStates(){
  if(!rail||!rail.clientWidth)return;
  const center=rail.scrollLeft+rail.clientWidth/2;
  slides.forEach(slide=>{
    const slideCenter=slide.offsetLeft+slide.clientWidth/2;
    const signed=(slideCenter-center)/rail.clientWidth;
    slide.classList.toggle('is-current',Math.abs(signed)<.52);
    if(!reduced.matches){
      const media=slide.querySelector('[data-slide-media]');
      const copy=slide.querySelector('[data-slide-copy]');
      if(media)media.style.transform=`translate3d(${signed*16}px,0,0)`;
      if(copy)copy.style.transform=`translate3d(${signed*-12}px,0,0)`;
    }
  });
}
function updateUI(){
  if(!rail)return;
  const max=Math.max(rail.scrollWidth-rail.clientWidth,1);
  const p=clamp(rail.scrollLeft/max,0,1);
  if(progressBar)progressBar.style.width=`${p*100}%`;
  if(currentLabel)currentLabel.textContent=String(activeIndex()+1).padStart(2,'0');
  updateSlideStates();
}
function setRail(v){if(!rail)return;current=v;rail.scrollLeft=v;updateUI()}
function smoothRail(){
  if(!rail||railFrame||reduced.matches||touching)return;
  const tick=()=>{
    railFrame=0;
    if(touching)return;
    const delta=target-current;
    if(Math.abs(delta)<.3){setRail(target);return}
    setRail(current+delta*.14);
    railFrame=requestAnimationFrame(tick);
  };
  railFrame=requestAnimationFrame(tick);
}
function syncFromPage(){
  if(!runway||!rail)return;
  const rect=runway.getBoundingClientRect();
  const dist=Math.max(runway.offsetHeight-innerHeight,1);
  const p=clamp(-rect.top/dist,0,1);
  target=p*Math.max(rail.scrollWidth-rail.clientWidth,0);
  if(!touching){reduced.matches?setRail(target):smoothRail()}
  header?.classList.toggle('is-solid',rect.bottom<innerHeight*.35);
}
function requestPage(){
  if(pageFrame)return;
  pageFrame=requestAnimationFrame(()=>{pageFrame=0;syncFromPage()});
}
function runwayYFor(left){
  const max=Math.max(rail.scrollWidth-rail.clientWidth,1);
  const p=clamp(left/max,0,1);
  const top=scrollY+runway.getBoundingClientRect().top;
  return top+p*Math.max(runway.offsetHeight-innerHeight,0);
}
function goTo(i){
  if(!rail||!runway)return;
  const idx=clamp(i,0,slides.length-1);
  const left=idx*rail.clientWidth;
  target=left;
  reduced.matches?setRail(left):smoothRail();
  scrollTo({top:runwayYFor(left),behavior:reduced.matches?'auto':'smooth'});
}
function syncPageToRail(){
  if(!rail||!runway)return;
  target=current=rail.scrollLeft;
  scrollTo({top:runwayYFor(rail.scrollLeft),behavior:'auto'});
  updateUI();
}

addEventListener('scroll',requestPage,{passive:true});
addEventListener('resize',()=>{current=rail?rail.scrollLeft:0;requestPage()});

if(rail){
  rail.addEventListener('scroll',()=>{if(touching){current=target=rail.scrollLeft}updateUI()},{passive:true});
  rail.addEventListener('pointerdown',()=>{touching=true;if(railFrame){cancelAnimationFrame(railFrame);railFrame=0}});
  rail.addEventListener('pointerup',()=>setTimeout(()=>{touching=false;syncPageToRail()},140));
  rail.addEventListener('pointercancel',()=>{touching=false;syncPageToRail()});
  rail.addEventListener('keydown',e=>{
    if(e.key==='ArrowRight'){e.preventDefault();goTo(activeIndex()+1)}
    if(e.key==='ArrowLeft'){e.preventDefault();goTo(activeIndex()-1)}
  });
}
prev?.addEventListener('click',()=>goTo(activeIndex()-1));
next?.addEventListener('click',()=>goTo(activeIndex()+1));

menuButton?.addEventListener('click',()=>{
  const open=navigation?.classList.toggle('is-open')??false;
  menuButton.setAttribute('aria-expanded',String(open));
  document.body.classList.toggle('menu-open',open);
});
navigation?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
  navigation.classList.remove('is-open');
  menuButton?.setAttribute('aria-expanded','false');
  document.body.classList.remove('menu-open');
}));

const revealObserver=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target)}
  });
},{threshold:.13});
document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));

const sectionObserver=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(!entry.isIntersecting)return;
    const id=entry.target.dataset.section;
    navigation?.querySelectorAll('[data-nav]').forEach(link=>{
      link.classList.toggle('is-active',link.dataset.nav===id);
    });
  });
},{rootMargin:'-34% 0px -56% 0px'});
document.querySelectorAll('[data-section]').forEach(s=>sectionObserver.observe(s));

const year=document.querySelector('[data-year]');
if(year)year.textContent=new Date().getFullYear();

syncFromPage();
updateUI();