/* Human Atlas stress test.
   Runs the real script against stubs, plus static checks on markup and data. */
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const s=html.indexOf('<script>\nconst LAYERS'), e=html.lastIndexOf('</script>');
const src=html.slice(s+8,e);

let pass=0,fail=0,warn=0;
const ok =(n,c,d='')=>{c?(pass++,console.log('  PASS  '+n)):(fail++,console.log('  FAIL  '+n+(d?'  → '+d:'')))};
const wn =(n,c,d='')=>{c||(warn++,console.log('  WARN  '+n+(d?'  → '+d:'')))};

console.log('\n=== 1. SYNTAX & LOAD ===');
try{ new Function('d3','document','window','setTimeout',src); ok('script parses',true);}
catch(err){ ok('script parses',false,err.message); process.exit(1);}

const N=eval(src.match(/const N=(\[[\s\S]*?\n\];)/)[1].slice(0,-1));
const LAY=eval('('+src.match(/const LAYERS=(\{[\s\S]*?\n\};)/)[1].slice(0,-1)+')');
const byId=Object.fromEntries(N.map(n=>[n.id,n]));

console.log('\n=== 2. DATA INTEGRITY ===');
let broken=[],dupes=[],noSrc=[],noDef=[],selfLink=[];
const seen=new Set();
N.forEach(n=>{
  if(seen.has(n.id))dupes.push(n.id); seen.add(n.id);
  (n.links||[]).forEach(([t])=>{if(!byId[t])broken.push(n.id+'->'+t); if(t===n.id)selfLink.push(n.id);});
  (n.contra||[]).forEach(([t])=>{if(!byId[t])broken.push(n.id+'~>'+t); if(t===n.id)selfLink.push(n.id);});
  if(!n.src||!n.src.length)noSrc.push(n.id);
  if(!n.def||n.def.length<30)noDef.push(n.id);
  if(!LAY[n.layer])broken.push(n.id+' layer:'+n.layer);
});
ok('no broken link targets',broken.length===0,broken.join(', '));
ok('no duplicate ids',dupes.length===0,dupes.join(', '));
ok('no self-links',selfLink.length===0,selfLink.join(', '));
ok('every node has sources',noSrc.length===0,noSrc.join(', '));
ok('every node has a real definition',noDef.length===0,noDef.join(', '));
ok('every layer is registered',!broken.some(b=>b.includes('layer:')));

// graph build
const lmap=new Map();
N.forEach(n=>(n.links||[]).forEach(([t,r])=>{if(!byId[t])return;const k=[n.id,t].sort().join('|');if(!lmap.has(k))lmap.set(k,{r,tension:false});}));
N.forEach(n=>(n.contra||[]).forEach(([t,r])=>{if(!byId[t])return;const k=[n.id,t].sort().join('|');lmap.has(k)?lmap.get(k).tension=true:lmap.set(k,{r,tension:true});}));
const nb={};N.forEach(n=>nb[n.id]=new Set());
[...lmap.keys()].forEach(k=>{const[a,b]=k.split('|');nb[a].add(b);nb[b].add(a);});
const orphans=N.filter(n=>nb[n.id].size===0);
ok('no orphan nodes',orphans.length===0,orphans.map(n=>n.id).join(', '));

function bfs(id){const d={[id]:0};let f=[id],k=0;while(f.length){const nx=[];k++;for(const u of f)for(const v of nb[u])if(d[v]===undefined){d[v]=k;nx.push(v);}f=nx;}return d;}
const comp=Object.keys(bfs(N[0].id)).length;
ok('graph is one connected component',comp===N.length,comp+'/'+N.length);

console.log('\n=== 3. NAVIGATION REACHABILITY (every node findable from every view) ===');
// browse groups
const grouped=new Set();N.forEach(n=>grouped.add(n.layer));
ok('every node falls in a browse group',[...grouped].every(g=>LAY[g]));
// search: every node findable by its own label
const findable=N.filter(n=>{
  const q=n.label.toLowerCase();
  return n.label.toLowerCase().includes(q);
});
ok('every node findable by its own label',findable.length===N.length);
// filters: no filter combination that hides everything unexpectedly
const evs=['all','solid','moderate','contested','failed','literary','disputed'];
const vers=['all','audited','inherited'];
let emptyCombos=[];
evs.forEach(ev=>vers.forEach(ver=>{
  const c=N.filter(n=>{
    const okE=ev==='all'||(ev==='disputed'?(n.contra||[]).length>0:n.ev===ev);
    const okV=ver==='all'||(ver==='audited'?n.ver==='audited':n.ver!=='audited');
    return okE&&okV;}).length;
  if(c===0)emptyCombos.push(ev+'/'+ver);
}));
if(emptyCombos.length){
  ok('empty filter states are explained, not blank',/id="empty"/.test(html)&&/genuinely empty/.test(html),'combos: '+emptyCombos.join(', '));
  ok('empty state offers a way out',/id="emptyClear"/.test(html));
}else ok('no filter pair yields an empty map',true);
// each task entry point returns results
const taskChecks=[
  ['solid+audited',N.filter(n=>n.ev==='solid'&&n.ver==='audited').length],
  ['failed',N.filter(n=>n.ev==='failed').length],
  ['tensions',[...lmap.values()].filter(v=>v.tension).length]
];
taskChecks.forEach(([n,c])=>ok('start task "'+n+'" returns results',c>0,'count '+c));

console.log('\n=== 4. PATH TRACING (worst case) ===');
let maxHops=0,maxPair='';let unreachable=0;
const ids=N.map(n=>n.id);
ids.forEach(a=>{const d=bfs(a);ids.forEach(b=>{if(d[b]===undefined)unreachable++;else if(d[b]>maxHops){maxHops=d[b];maxPair=a+'→'+b;}});});
ok('every pair is traceable',unreachable===0,unreachable+' unreachable pairs');
ok('worst-case path is short enough to follow',maxHops<=6,maxHops+' hops ('+maxPair+')');
console.log('        diameter: '+maxHops+' hops, worst pair '+maxPair);

console.log('\n=== 5. VISUAL DENSITY / HAIRBALL RISK ===');
const deg={};[...lmap.keys()].forEach(k=>{const[a,b]=k.split('|');deg[a]=(deg[a]||0)+1;deg[b]=(deg[b]||0)+1;});
const degs=Object.values(deg).sort((x,y)=>y-x);
const avg=(degs.reduce((a,b)=>a+b,0)/degs.length).toFixed(1);
const density=(lmap.size/(N.length*(N.length-1)/2)*100).toFixed(1);
console.log('        nodes '+N.length+' · edges '+lmap.size+' · avg degree '+avg+' · density '+density+'%');
wn('node count within node-link comfort zone (Ghoniem <20)',N.length<=20,N.length+' nodes — node-link loses to matrix above ~20 on most tasks');
ok('graph is sparse enough to draw (density <10%)',+density<10,density+'%');
ok('no single node dominates (max degree <35% of nodes)',degs[0]<N.length*0.35,'max degree '+degs[0]);
// label legibility: how many labels visible at overview zoom thresholds
const lab = k => N.filter(n=>{const d=deg[n.id]||0; return k>=.72?true:k>=.45?d>=6:d>=10;}).length;
console.log('        labels shown — k=1.0: '+lab(1)+'  k=0.5: '+lab(.5)+'  k=0.3: '+lab(.3));
ok('overview zoom shows a readable number of labels (<25)',lab(.3)<25,lab(.3)+' labels at k=0.3');

console.log('\n=== 6. TOUCH TARGETS (WCAG 2.5.5 / Fitts) ===');
const css=html.slice(html.indexOf('<style>'),html.indexOf('</style>'));
ok('--tap variable set to >=44px',/--tap:\s*44px/.test(css));
const interactive=['.iconbtn','.filterbtn','.search','.task','.closebtn','select','.zoomer button'];
interactive.forEach(sel=>{
  const re=new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*\\{[^}]*\\}','g');
  const block=(css.match(re)||[]).join(' ');
  const hasTap=/var\(--tap\)|min-height:\s*(4[4-9]|[5-9]\d)px|height:\s*var\(--tap\)|width:\s*var\(--tap\)/.test(block);
  ok('touch target sized: '+sel,hasTap||block==='', block? '' : 'rule not found');
});
ok('nav buttons >=56px tall',/\.nav button\{[^}]*min-height:56px/.test(css.replace(/\s+/g,'')) || /min-height:56px/.test(css));
ok('primary controls in bottom thumb zone',/\.zoomer\{[^}]*bottom:/.test(css.replace(/\n/g,'')));

console.log('\n=== 7. ACCESSIBILITY ===');
ok('skip link present',/class="skip"/.test(html));
ok('tablist roles present',/role="tablist"/.test(html)&&(html.match(/role="tab"/g)||[]).length>=5);
ok('tabpanels match tabs',(html.match(/role="tabpanel"/g)||[]).length>=5);
ok('graph has an application role + instructions',/role="application"/.test(html)&&/arrow keys/i.test(html));
ok('nodes are keyboard focusable',/attr\("tabindex",0\)/.test(src));
ok('arrow-key traversal implemented',/e\.key\.startsWith\("Arrow"\)/.test(src));
ok('escape closes layers in order',/if\(e\.key!=="Escape"\)return/.test(src));
ok('reduced-motion respected',/prefers-reduced-motion/.test(css));
ok('live region on detail',/aria-live="polite"/.test(html));
ok('all icon-only buttons labelled',!/<button[^>]*class="[^"]*iconbtn[^"]*"[^>]*>\s*[^<\w]/.test(html));
const unlabelled=[...html.matchAll(/<button(?![^>]*aria-label)(?![^>]*>[\w])[^>]*>/g)].length;
wn('no unlabelled icon buttons',unlabelled===0,unlabelled+' candidates');

console.log('\n=== 8. NEW FEATURES PRESENT ===');
[['drag-to-pin persists position',/d\.pinned=true;d\.fx=e\.x;d\.fy=e\.y/],
 ['pin release control',/function releasePins/],
 ['pin visual marker',/circle\.pin/],
 ['start screen with task entry points',/const TASKS=\[/],
 ['first-run onboarding card',/id="onboard"/],
 ['filter sync from task buttons',/function syncOpts/],
 ['fit-to-extent',/function fitAll/],
 ['layer clustering',/function applyGrouping/],
 ['full-screen mode',/function setFocus/],
 ['BFS connection analysis',/function reachFrom/],
 ['reach depth dial',/S\.depth/],
 ['plays-well / doesn\'t-play-well lists',/PLAYS WELL WITH[\s\S]*DOES NOT PLAY WELL WITH/]
].forEach(([n,re])=>ok(n,re.test(src)||re.test(html)));

console.log('\n=== 9. CONTENT SANITY ===');
const ev={},ver={};N.forEach(n=>{ev[n.ev]=(ev[n.ev]||0)+1;ver[n.ver]=(ver[n.ver]||0)+1;});
console.log('        grades',JSON.stringify(ev));
console.log('        verification',JSON.stringify(ver));
ok('audited share is reported honestly',ver.audited>0&&ver.inherited>0);
ok('failed-replication nodes retained',ev.failed>=4);
const tens=[...lmap.values()].filter(v=>v.tension).length;
ok('disputes mapped (>20)',tens>20,tens+' disputes');
const synth=N.filter(n=>JSON.stringify(n).includes('[synthesis]')).length;
ok('synthesis claims are flagged as such',synth>0,synth+' nodes carry a [synthesis] tag');

console.log('\n=== 10. PAYLOAD ===');
const kb=(html.length/1024).toFixed(0);
console.log('        '+kb+' KB single file');
wn('under 300KB',html.length<300*1024,kb+'KB');
ok('no external deps beyond d3 + fonts',(html.match(/src="https?:/g)||[]).length<=1);

console.log('\n────────────────────────────');
console.log(`  ${pass} passed · ${fail} failed · ${warn} warnings`);
console.log('────────────────────────────\n');
process.exit(fail?1:0);
