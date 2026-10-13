import { features, audiences } from './content.js';
import { prepareInquiry, formatInquiry } from './inquiry.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const menu = $('.menu-toggle');
const navigation = $('#main-nav');
function closeMenu() { menu.setAttribute('aria-expanded','false'); menu.setAttribute('aria-label','Open navigation'); navigation.classList.remove('open'); document.body.classList.remove('menu-open'); }
menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded',String(open)); menu.setAttribute('aria-label',open ? 'Close navigation' : 'Open navigation'); navigation.classList.toggle('open',open); document.body.classList.toggle('menu-open',open); });
$$('#main-nav a').forEach(link => link.addEventListener('click',closeMenu));
document.addEventListener('keydown', event => { if(event.key==='Escape') closeMenu(); });
window.matchMedia('(min-width:901px)').addEventListener('change',event => { if(event.matches)closeMenu(); });

function selectFeature(id) {
  const item = features[id]; if(!item)return;
  $$('[data-feature]').forEach(button => { const active=button.dataset.feature===id; button.classList.toggle('active',active); button.setAttribute('aria-pressed',String(active)); });
  $('#feature-icon-use').setAttribute('href','#'+item.icon);
  $('#feature-title').textContent=item.title;
  $('#feature-description').textContent=item.description;
  $('#feature-status').textContent=item.status;
  document.dispatchEvent(new CustomEvent('cv:feature',{detail:id}));
}
$$('.feature-choice').forEach(button=>button.addEventListener('click',()=>selectFeature(button.dataset.feature)));
document.addEventListener('cv:hotspot',event=>selectFeature(event.detail));

const tabs=$$('[data-audience]');
function selectAudience(button,focus=false) {
  const id=button.dataset.audience;const item=audiences[id];
  tabs.forEach(tab=>{const active=tab===button;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;tab.classList.toggle('active',active);});
  $('#audience-panel').setAttribute('aria-labelledby',button.id);
  $('#audience-index').textContent=item.index;$('#audience-heading').textContent=item.title;$('#audience-copy').textContent=item.copy;
  if(focus)button.focus();
}
tabs.forEach((button,index)=>{
  button.addEventListener('click',()=>selectAudience(button));
  button.addEventListener('keydown',event=>{
    let next=index;
    if(event.key==='ArrowRight'||event.key==='ArrowDown')next=(index+1)%tabs.length;
    else if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=(index+tabs.length-1)%tabs.length;
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=tabs.length-1;
    else return;
    event.preventDefault();selectAudience(tabs[next],true);
  });
});

let viewerLoading=false;
let viewerLoaded=false;
const staticMode=new URLSearchParams(window.location.search).get('view')==='static';
function viewerFailure(error) {
  console.warn('Calculated Visions: 3D viewer unavailable.',error?.message || error);
  $('#viewer-loading').hidden=true;$('#viewer-error').hidden=false;$('#model-state').textContent='CONCEPT IMAGE';
  $('#viewer-stage').classList.remove('ready');
}
async function loadViewer() {
  if(viewerLoading||viewerLoaded||staticMode)return;
  viewerLoading=true;$('#viewer-loading').hidden=false;$('#viewer-error').hidden=true;
  try { const {initViewer}=await import('./viewer.js');await initViewer();viewerLoaded=true; }
  catch(error){viewerFailure(error);}
  finally{viewerLoading=false;}
}
$('#retry-viewer').addEventListener('click',()=>{const url=new URL(window.location.href);url.searchParams.delete('view');window.location.replace(url.href);});
if(staticMode){
  $('#viewer-loading').hidden=true;$('#viewer-error').hidden=false;$('#model-state').textContent='STATIC CONCEPT VIEW';
  $('#viewer-error strong').textContent='Static presentation view';
  $('#viewer-error span').textContent='The supplied concept rendering is shown. The design notes remain available.';
  $('#retry-viewer').textContent='Load the 3D model';
} else if('IntersectionObserver' in window) {
  const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){loadViewer();observer.disconnect();}},{rootMargin:'500px'});observer.observe($('#explore'));
} else loadViewer();
document.querySelectorAll('a[href="#explore"]').forEach(link=>link.addEventListener('click',loadViewer));

// Demo-only inquiry. No network requests, localStorage, cookies, or fake delivery.
const form=$('#interest-form');const result=$('#inquiry-result');let inquiry=null;
form.querySelector('button[type="submit"]').disabled=false;
form.addEventListener('submit',event=>{
  event.preventDefault();
  const prepared=prepareInquiry(Object.fromEntries(new FormData(form)));
  for(const key of ['name','email','organization','interest','message'])form.elements.namedItem(key).setCustomValidity(prepared.errors[key]||'');
  if(!form.reportValidity())return;
  if(!prepared.valid)return;
  inquiry=prepared.data;
  $('#inquiry-summary').textContent=`${inquiry.name}, your interest in ${inquiry.interest.toLowerCase()} has been prepared on this device.`;
  form.hidden=true;result.hidden=false;result.tabIndex=-1;result.focus({preventScroll:true});
});
form.addEventListener('input',event=>event.target.setCustomValidity?.(''));
form.addEventListener('change',event=>event.target.setCustomValidity?.(''));
$('#edit-inquiry').addEventListener('click',()=>{result.hidden=true;form.hidden=false;$('#full-name').focus();});
$('#download-inquiry').addEventListener('click',()=>{
  if(!inquiry)return;
  const text=formatInquiry(inquiry);
  const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='calculated-visions-inquiry.txt';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
const privacy=$('#privacy-dialog');
$('#privacy-button').addEventListener('click',()=>privacy.showModal());
$$('.dialog-close').forEach(button=>button.addEventListener('click',()=>privacy.close()));
privacy.addEventListener('click',event=>{if(event.target===privacy){const rect=privacy.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)privacy.close();}});
