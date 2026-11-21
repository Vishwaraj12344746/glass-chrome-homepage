'use strict';
const $ = id => document.getElementById(id);
const readJSON = (key, fallback) => {try {const value=JSON.parse(localStorage.getItem(key));return value??fallback;}catch{return fallback;}};
const persist=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
function updateClock(){const now=new Date();$('clock').textContent=now.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});$('date').textContent=now.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});$('top-date').textContent=now.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}).toUpperCase();}updateClock();setInterval(updateClock,1000);
$('search-form').addEventListener('submit',event=>{event.preventDefault();const input=$('search-input').value.trim();if(!input)return;const maybeUrl=/^(https?:\/\/|localhost(?::\d+)?(?:\/|$)|(?:[a-z\d-]+\.)+[a-z]{2,}(?::\d+)?(?:\/|$))/i.test(input)&&!(/\s/.test(input));if(maybeUrl){try{const url=new URL(/^https?:\/\//i.test(input)?input:'https://'+input);if(['http:','https:'].includes(url.protocol)){location.href=url.href;return;}}catch{}}location.href='https://www.google.com/search?q='+encodeURIComponent(input);});
const defaults=[{name:'GitHub',url:'https://github.com',icon:'⌘'},{name:'YouTube',url:'https://youtube.com',icon:'▶'},{name:'Gmail',url:'https://mail.google.com',icon:'✉'},{name:'LinkedIn',url:'https://linkedin.com',icon:'in'},{name:'ChatGPT',url:'https://chatgpt.com',icon:'✦'},{name:'Drive',url:'https://drive.google.com',icon:'▣'}];let shortcuts=readJSON('glassShortcuts',defaults);if(!Array.isArray(shortcuts))shortcuts=defaults;
function renderLinks(){const list=$('shortcuts');list.replaceChildren();shortcuts.forEach((link,index)=>{const item=document.createElement('div');item.className='shortcut';const a=document.createElement('a');a.href=link.url;a.target='_blank';a.rel='noopener noreferrer';const symbol=document.createElement('span');symbol.className='symbol';symbol.textContent=link.icon||'↗';const name=document.createElement('span');name.className='name';name.textContent=link.name;a.append(symbol,name);const remove=document.createElement('button');remove.type='button';remove.className='remove-link';remove.textContent='×';remove.setAttribute('aria-label','Remove '+link.name);remove.addEventListener('click',()=>{shortcuts.splice(index,1);persist('glassShortcuts',shortcuts);renderLinks();});item.append(a,remove);list.append(item);});}renderLinks();
$('add-shortcut').addEventListener('click',()=>$('shortcut-dialog').showModal());$('shortcut-form').addEventListener('submit',event=>{event.preventDefault();const name=$('shortcut-name').value.trim();let url=$('shortcut-url').value.trim();if(!/^https?:\/\//i.test(url))url='https://'+url;try{const parsed=new URL(url);if(!['https:','http:'].includes(parsed.protocol)||!parsed.hostname.includes('.'))throw Error('invalid');}catch{alert('Please enter a valid website URL.');return;}if(!name)return;shortcuts.push({name,url,icon:name.slice(0,1).toUpperCase()});persist('glassShortcuts',shortcuts);renderLinks();$('shortcut-form').reset();$('shortcut-dialog').close();});
const saved=readJSON('glassSettings',{});const legacyTheme=Number(localStorage.getItem('glassTheme')||0);let settings={wallpaper:['mountain','galaxy','sakura'][legacyTheme]||'mountain',backgroundStyle:'midnight',blur:18,opacity:16,accent:'#ffb57c',...saved};
const wallpaperFiles={mountain:'sunset-mountains.png',galaxy:'midnight-galaxy.webp',sakura:'sakura-dreams.webp',neon:'neon-city.webp'};
const customWallpaperKey='glassCustomWallpaperV52';
let customWallpaperUrl=null;
function applySettings(){
  document.body.dataset.wallpaper=settings.wallpaper;document.body.dataset.backgroundStyle=settings.backgroundStyle||'midnight';
  document.documentElement.style.setProperty('--blur',settings.blur+'px');document.documentElement.style.setProperty('--glass-opacity',String(settings.opacity/100));document.documentElement.style.setProperty('--accent',settings.accent);
  for(const key of ['blur','opacity','accent'])$(key).value=settings[key];$('background-style').value=settings.backgroundStyle||'midnight';
  $('blur-value').textContent=settings.blur+'px';$('opacity-value').textContent=settings.opacity+'%';
  document.querySelectorAll('.wallpaper-choice').forEach(b=>b.classList.toggle('selected',b.dataset.choice===settings.wallpaper));
  if(settings.wallpaper==='custom'){if(customWallpaperUrl)document.documentElement.style.setProperty('--hero-wallpaper',`url("${customWallpaperUrl}")`);else document.documentElement.style.setProperty('--hero-wallpaper','url("sunset-mountains.png")');}
  else document.documentElement.style.setProperty('--hero-wallpaper',`url("${wallpaperFiles[settings.wallpaper]||wallpaperFiles.mountain}")`);
}
function saveAppearance(){persist('glassSettings',settings);applySettings();}
$('settings-open').addEventListener('click',()=>$('settings-dialog').showModal());
for(const key of ['blur','opacity','accent'])$(key).addEventListener('input',event=>{settings[key]=['blur','opacity'].includes(key)?Number(event.target.value):event.target.value;saveAppearance();});
$('background-style').addEventListener('change',event=>{settings.backgroundStyle=event.target.value;saveAppearance();});
document.querySelectorAll('.wallpaper-choice').forEach(b=>b.addEventListener('click',()=>{settings.wallpaper=b.dataset.choice;saveAppearance();}));
$('reset-appearance').addEventListener('click',()=>{settings={wallpaper:'mountain',backgroundStyle:'midnight',blur:18,opacity:16,accent:'#ffb57c'};saveAppearance();});
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>$(button.dataset.close).close()));
// IndexedDB stores full-size custom wallpapers without localStorage's small quota.
const dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open('glassHomepageMedia',1);req.onupgradeneeded=()=>req.result.createObjectStore('wallpapers');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
async function wallpaperStore(mode,value){const db=await dbPromise;return new Promise((resolve,reject)=>{const tx=db.transaction('wallpapers',mode);const store=tx.objectStore('wallpapers');const req=value===undefined?store.get('custom'):value===null?store.delete('custom'):store.put(value,'custom');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function loadCustomWallpaper(){try{const blob=await wallpaperStore('readonly');if(customWallpaperUrl)URL.revokeObjectURL(customWallpaperUrl);customWallpaperUrl=blob?URL.createObjectURL(blob):null;applySettings();}catch(e){$('wallpaper-status').textContent='Custom wallpaper storage is unavailable.';}}
$('custom-wallpaper').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)){alert('Choose a JPG, PNG or WebP image.');return;}if(file.size>25*1024*1024){alert('Please choose an image smaller than 25 MB.');return;}try{await wallpaperStore('readwrite',file);await loadCustomWallpaper();settings.wallpaper='custom';saveAppearance();$('wallpaper-status').textContent='Your wallpaper is saved on this device.';}catch{$('wallpaper-status').textContent='Could not save wallpaper. Try a smaller image.';}});
$('use-custom-wallpaper').addEventListener('click',()=>{if(!customWallpaperUrl){$('wallpaper-status').textContent='Upload a wallpaper first.';return;}settings.wallpaper='custom';saveAppearance();});
$('remove-custom-wallpaper').addEventListener('click',async()=>{try{await wallpaperStore('readwrite',null);await loadCustomWallpaper();if(settings.wallpaper==='custom'){settings.wallpaper='mountain';saveAppearance();}$('wallpaper-status').textContent='Uploaded wallpaper removed.';}catch{$('wallpaper-status').textContent='Could not remove wallpaper.';}});
applySettings();loadCustomWallpaper();
$('notes').value=localStorage.getItem('glassNotes')||'';$('notes').addEventListener('input',()=>{localStorage.setItem('glassNotes',$('notes').value);$('note-status').textContent='Saved locally';});
window.addEventListener('storage',event=>{if(event.key==='glassShortcuts'){shortcuts=readJSON('glassShortcuts',defaults);renderLinks();}if(event.key==='glassSettings'){settings={...settings,...readJSON('glassSettings',{})};applySettings();}if(event.key==='glassNotes')$('notes').value=event.newValue||'';});

// V5 Smart Progress: all records stay in this Chrome extension's local storage.
const smartKey='glassSmartTasksV5';
let smartTasks=readJSON(smartKey,null);
if(!Array.isArray(smartTasks)){
  smartTasks=(Array.isArray(readJSON('glassTasks',[]))?readJSON('glassTasks',[]):[]).map(t=>({id:t.id||crypto.randomUUID(),name:t.text||'Untitled task',category:'General',icon:'🎯',method:'manual',percent:t.done?100:0,createdAt:new Date().toISOString(),updates:[],milestones:[],goal:0,hours:0,archived:false}));
  persist(smartKey,smartTasks);
}
const DAY=86400000;
const safeDate=s=>{const d=new Date(s);return Number.isNaN(d.getTime())?new Date():d;};
const elapsed=(s)=>Date.now()-safeDate(s).getTime();
const clamp=n=>Math.min(100,Math.max(0,Number(n)||0));
const pct=t=>t.method==='hours'?clamp(Math.round((Number(t.hours)||0)/Math.max(.25,Number(t.goal)||10)*100)):t.method==='milestones'?clamp(Math.round((t.milestones||[]).filter(m=>m.done).length/Math.max(1,(t.milestones||[]).length)*100)):clamp(t.percent);
const active=()=>smartTasks.filter(t=>!t.archived);
function saveSmart(){persist(smartKey,smartTasks);renderSmart();}
function element(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;}
function addButton(parent,label,fn){const b=element('button','',label);b.type='button';b.addEventListener('click',fn);parent.append(b);return b;}
function renderSmart(){
  const list=$('full-task-list'),mini=$('task-list');list.replaceChildren();mini.replaceChildren();
  const all=active(),avg=all.length?Math.round(all.reduce((sum,t)=>sum+pct(t),0)/all.length):0;
  $('combined-progress-panel').hidden=all.length<3; $('progress-percent').textContent=avg+'%';$('progress-ring').style.setProperty('--pct',avg+'%');$('progress-caption').textContent=all.length?`${all.length} active task${all.length===1?'':'s'} · average completion`:'Add a task to begin your progress journey.';
  $('task-count').textContent=all.filter(t=>pct(t)<100).length+' in progress';
  if(!all.length)list.append(element('p','empty-tasks','No tasks yet. Create your first goal to begin tracking progress.'));
  for(const t of all){
    const card=element('article','task-card');card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label','Open details for '+t.name);card.addEventListener('click',e=>{if(e.target.closest('button,input,label'))return;openDetails(t.id);});card.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target===card){e.preventDefault();openDetails(t.id);}});
    const title=element('div','task-title'),icon=element('span','task-icon',t.icon||'🎯'),names=element('div');
    names.append(element('h3','',t.name),element('div','category',t.category||'General'));
    title.append(icon,names,element('strong','task-percent',pct(t)+'%'));card.append(title);
    const track=element('div','track'),fill=element('div','track-fill');fill.style.width=pct(t)+'%';track.append(fill);card.append(track);
    const metric=t.method==='hours'?`${Number(t.hours||0).toFixed(1)} / ${Number(t.goal||10)} hours` : t.method==='milestones'?`${(t.milestones||[]).filter(m=>m.done).length} / ${(t.milestones||[]).length} milestones`:`${pct(t)}% manually recorded`;
    card.append(element('p','task-meta',metric+' · Started '+safeDate(t.createdAt).toLocaleDateString()));
    if(t.method==='milestones'){
      const ul=element('ul','milestone-list');for(const m of t.milestones||[]){const li=element('li'),c=element('input');c.type='checkbox';c.checked=!!m.done;c.addEventListener('change',()=>{m.done=c.checked;t.updates.push({at:new Date().toISOString(),note:(c.checked?'Completed: ':'Reopened: ')+m.name,delta:0});saveSmart();});li.append(c,element('span','',m.name));ul.append(li);}card.append(ul);
    }
    const actions=element('div','task-actions');addButton(actions,'View details',()=>openDetails(t.id));addButton(actions,'+ Log work',()=>openUpdate(t.id));addButton(actions,'Archive',()=>{if(confirm('Archive this task? Its history will remain saved.')){t.archived=true;saveSmart();}});card.append(actions);
    if((t.updates||[]).length){const log=element('div','activity-log');log.append(element('strong','','Recent updates'));for(const u of t.updates.slice(-4).reverse())log.append(element('p','',safeDate(u.at).toLocaleString()+' — '+u.note));card.append(log);}
    if(elapsed(t.createdAt)>=7*DAY)card.append(makeTaskReport(t,7,'Weekly progress'));
    if(elapsed(t.createdAt)>=30*DAY)card.append(makeTaskReport(t,30,'Monthly progress'));
    list.append(card);
    const mr=element('button','mini-row');mr.type='button';mr.addEventListener('click',()=>openDetails(t.id));mr.append(element('span','',t.icon||'🎯'),element('span','mini-name',t.name),element('b','',pct(t)+'%'));mini.append(mr);
  }
  renderCombinedReports();
}
function makeTaskReport(t,days,label){const section=element('div','task-report');const cutoff=Date.now()-days*DAY;const updates=(t.updates||[]).filter(u=>safeDate(u.at).getTime()>=cutoff);section.append(element('p','task-meta',`${label} · ${updates.length} update${updates.length===1?'':'s'} in the last ${days} days`));return section;}
function renderCombinedReports(){
  const all=active();const first=all.length?Math.min(...all.map(t=>safeDate(t.createdAt).getTime())):Date.now();
  for(const [days,boxId,bodyId] of [[7,'combined-week','combined-week-body'],[30,'combined-month','combined-month-body']]){
    const box=$(boxId),body=$(bodyId);box.hidden=Date.now()-first<days*DAY;body.replaceChildren();if(box.hidden)continue;
    const since=Date.now()-days*DAY;const logs=all.flatMap(t=>(t.updates||[]).filter(u=>safeDate(u.at).getTime()>=since).map(u=>({...u,taskName:t.name})));
    const hours=logs.reduce((n,u)=>n+(Number(u.hours)||0),0);
    body.append(element('p','',`${logs.length} work updates · ${hours.toFixed(1)} hours logged · ${all.length} active tasks`));
    for(const t of all){const count=(t.updates||[]).filter(u=>safeDate(u.at).getTime()>=since).length;body.append(element('p','report-line',`${t.icon||'🎯'} ${t.name}: ${pct(t)}% complete · ${count} updates`));}
  }
}

let selectedTaskId=null;
function expectedProgress(t){if(!t.deadline)return null;const start=safeDate(t.createdAt).getTime();const due=new Date(t.deadline+'T23:59:59').getTime();if(!Number.isFinite(due)||due<=start)return null;return clamp(Math.round((Date.now()-start)/(due-start)*100));}
function detailLine(parent,label,value){const row=element('div','detail-line');row.append(element('span','',label),element('strong','',value));parent.append(row);}
function openDetails(id){const t=smartTasks.find(x=>x.id===id);if(!t)return;selectedTaskId=id;const body=$('details-content');body.replaceChildren();$('details-title').textContent=(t.icon||'🎯')+' '+t.name;
  body.append(element('p','task-meta',`${t.category||'General'} · ${t.method} tracking · Created ${safeDate(t.createdAt).toLocaleDateString()}`));
  const expected=expectedProgress(t),stats=element('div','detail-stats');const actual=element('div','detail-stat');actual.append(element('span','','Actual progress'),element('strong','',pct(t)+'%'));stats.append(actual);
  const planned=element('div','detail-stat');planned.append(element('span','','Expected by today'),element('strong','',expected===null?'Set a target date':expected+'%'));stats.append(planned);body.append(stats);
  if(expected!==null)body.append(element('p','task-meta',pct(t)>=expected?'On track or ahead of schedule':`${expected-pct(t)} percentage points behind planned pace`));
  if(t.deadline)detailLine(body,'Target completion',new Date(t.deadline+'T12:00:00').toLocaleDateString());
  if(t.method==='hours')detailLine(body,'Hours logged',`${Number(t.hours||0).toFixed(1)} / ${t.goal} hours`);
  if(t.method==='milestones'){
    const title=element('h3','','Milestones');body.append(title);const ul=element('div','details-milestones');for(const m of t.milestones||[]){const label=element('label','detail-milestone'),c=element('input');c.type='checkbox';c.checked=!!m.done;c.addEventListener('change',()=>{m.done=c.checked;t.updates.push({at:new Date().toISOString(),note:(c.checked?'Completed: ':'Reopened: ')+m.name});saveSmart();openDetails(t.id);});label.append(c,element('span','',m.name));ul.append(label);}body.append(ul);
  }
  body.append(element('h3','','Work history'));const logs=element('div','detail-logs');if(!(t.updates||[]).length)logs.append(element('p','small-muted','No updates recorded yet. Log your first work session.'));
  for(const u of (t.updates||[]).slice().reverse()){const entry=element('div','detail-log');entry.append(element('span','',safeDate(u.at).toLocaleString()),element('p','',u.note));logs.append(entry);}body.append(logs);
  const age=elapsed(t.createdAt);if(age>=7*DAY)body.append(makeTaskReport(t,7,'Weekly progress'));if(age>=30*DAY)body.append(makeTaskReport(t,30,'Monthly progress'));
  if(!$('details-dialog').open)$('details-dialog').showModal();
}
$('details-log').addEventListener('click',()=>{const id=selectedTaskId;$('details-dialog').close();openUpdate(id);});
$('details-archive').addEventListener('click',()=>{const t=smartTasks.find(x=>x.id===selectedTaskId);if(t&&confirm('Archive this task? Its history will remain saved.')){t.archived=true;$('details-dialog').close();saveSmart();}});
$('details-edit').addEventListener('click',()=>{const t=smartTasks.find(x=>x.id===selectedTaskId);if(!t)return;$('edit-task-name').value=t.name;$('edit-task-category').value=t.category||'General';$('edit-task-deadline').value=t.deadline||'';$('edit-goal-wrap').hidden=t.method!=='hours';$('edit-milestones-wrap').hidden=t.method!=='milestones';$('edit-task-goal').value=t.goal||10;$('edit-task-milestones').value=(t.milestones||[]).map(m=>m.name).join('\n');$('details-dialog').close();$('edit-dialog').showModal();});
$('edit-task-form').addEventListener('submit',e=>{e.preventDefault();const t=smartTasks.find(x=>x.id===selectedTaskId);if(!t)return;t.name=$('edit-task-name').value.trim();t.category=$('edit-task-category').value.trim();if(!t.name||!t.category)return;t.deadline=$('edit-task-deadline').value;if(t.method==='hours'){const goal=Number($('edit-task-goal').value);if(!(goal>0))return alert('Enter a valid target.');t.goal=goal;}if(t.method==='milestones'){const names=[...new Set($('edit-task-milestones').value.split('\n').map(x=>x.trim()).filter(Boolean))];if(!names.length)return alert('Keep at least one milestone.');t.milestones=names.map(name=>(t.milestones||[]).find(m=>m.name===name)||{name,done:false});}$('edit-dialog').close();saveSmart();openDetails(t.id);});

function openUpdate(id){const t=smartTasks.find(x=>x.id===id);if(!t)return;editingId=id;$('update-task-title').textContent=(t.icon||'🎯')+' '+t.name;$('update-note').value='';$('update-hours-wrap').hidden=t.method!=='hours';$('update-percent-wrap').hidden=t.method!=='manual';$('update-percent').value=pct(t);$('update-milestone-hint').textContent=t.method==='milestones'?'Tick milestones on the task card to increase completion. This note records additional work.':'';$('update-dialog').showModal();}
let editingId=null;
$('update-form').addEventListener('submit',e=>{e.preventDefault();const t=smartTasks.find(x=>x.id===editingId);if(!t)return;const note=$('update-note').value.trim();if(!note)return;const u={at:new Date().toISOString(),note};if(t.method==='hours'){const n=Number($('update-hours').value);if(!Number.isFinite(n)||n<=0||n>24)return alert('Enter 0.1 to 24 hours.');t.hours=(Number(t.hours)||0)+n;u.hours=n;}if(t.method==='manual'){const n=Number($('update-percent').value);if(!Number.isFinite(n)||n<0||n>100)return alert('Enter 0 to 100 percent.');t.percent=n;}t.updates.push(u);$('update-dialog').close();saveSmart();openDetails(t.id);});
function toggleMethod(){const method=$('new-task-method').value;$('goal-hours-wrap').hidden=method!=='hours';$('milestones-wrap').hidden=method!=='milestones';}
$('new-task-method').addEventListener('change',toggleMethod);toggleMethod();
function openNew(){ $('create-task-form').reset();toggleMethod();$('task-dialog').showModal(); }
$('new-task-bottom').addEventListener('click',openNew);
$('create-task-form').addEventListener('submit',e=>{e.preventDefault();const name=$('new-task-name').value.trim(),category=$('new-task-category').value.trim(),method=$('new-task-method').value;if(!name||!category)return;const milestones=method==='milestones'?[...new Set($('new-task-milestones').value.split('\n').map(s=>s.trim()).filter(Boolean))].map(name=>({name,done:false})):[];if(method==='milestones'&&!milestones.length)return alert('Add at least one milestone.');const goal=Number($('new-task-goal').value);if(method==='hours'&&(!Number.isFinite(goal)||goal<=0))return alert('Enter a positive target.');smartTasks.push({id:crypto.randomUUID(),name,category,icon:$('new-task-icon').value,method,percent:0,goal:method==='hours'?goal:0,hours:0,milestones,createdAt:new Date().toISOString(),deadline:$('new-task-deadline').value||'',updates:[],archived:false});$('task-dialog').close();saveSmart();});
const quotes=['Small, consistent steps build big results.','Make progress visible, one action at a time.','Focus on what you can finish today.','Great work grows from ordinary days.','Your next small step matters.','Create more than you consume.','Discipline turns ideas into reality.','One focused hour can change your direction.','Keep building, even when progress feels slow.','Every completed milestone tells a story.','A fresh day is a fresh opportunity.','Progress is built, not wished for.'];
function refreshQuote(){const day=Math.floor(new Date().setHours(0,0,0,0)/DAY);$('daily-quote').textContent='“'+quotes[((day%quotes.length)+quotes.length)%quotes.length]+'”';}
refreshQuote();setInterval(()=>{refreshQuote();renderSmart();},60000);
const displayName=$('display-name');displayName.value=localStorage.getItem('glassDisplayNameV5')||'';
function greetingName(){const hour=new Date().getHours();const base=hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';$('greeting').textContent=base+(displayName.value.trim()?', '+displayName.value.trim():'')+'.';}
displayName.addEventListener('input',()=>{localStorage.setItem('glassDisplayNameV5',displayName.value.trim());greetingName();});greetingName();setInterval(greetingName,60000);
window.addEventListener('storage',e=>{if(e.key===smartKey){smartTasks=readJSON(smartKey,[]);renderSmart();}if(e.key==='glassDisplayNameV5'){displayName.value=e.newValue||'';greetingName();}});
renderSmart();
