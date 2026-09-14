/* Behavioural test for the roadmap: path layout and status, locked-click
   feedback, a full lesson through to completion, the bonus branch launching
   the puzzle and reporting back, and the checkpoint gate. Runs in the real page.

       npm install --no-save playwright d3
       node tests/roadmap-test.js */
const path=require('path');
const fs=require('fs');
let chromium;
try{({chromium}=require('playwright'));}
catch(e){console.error('playwright not installed — run: npm install --no-save playwright d3');process.exit(2);}
const D3PATH=path.join(__dirname,'..','node_modules','d3','dist','d3.min.js');
if(!fs.existsSync(D3PATH)){console.error('d3 not installed — run: npm install --no-save playwright d3');process.exit(2);}
const D3=fs.readFileSync(D3PATH,'utf8');
const FILE='file://'+path.join(__dirname,'..','index.html');
const KEY='ha_play_v1';
const RM=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','roadmaps','atlas.json'),'utf8'));
const NODES=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','nodes.json'),'utf8'));
const label=id=>NODES.find(n=>n.id===id).label;
const u1=RM.units[0],u2=RM.units[1];
const std1=u1.nodes.filter(n=>n.type==='standard'),bonus1=u1.nodes.find(n=>n.type==='bonus'),check1=u1.nodes.find(n=>n.type==='checkpoint');
const dayKey=d=>{d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};

let fails=0;
const check=(name,cond,detail)=>{
  if(cond)console.log('  PASS  '+name);
  else{fails++;console.log('  FAIL  '+name+(detail!==undefined?'\n          '+detail:''));}
};
const doneSeed=ids=>{const o={};ids.forEach(id=>{const n=RM.units.flatMap(u=>u.nodes).find(x=>x.id===id);o[id]={done:n.steps,at:dayKey()};});return o;};

(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await ctx.route('**://cdnjs.cloudflare.com/**',r=>r.fulfill({contentType:'application/javascript',body:D3}));
  await ctx.route('**://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
  await ctx.route('**://fonts.gstatic.com/**',r=>r.abort());

  async function openRoad(seed){
    const pg=await ctx.newPage();const errs=[];
    pg.on('pageerror',e=>errs.push(e.message));
    pg.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
    if(seed)await pg.addInitScript(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[KEY,seed]);
    else await pg.addInitScript(k=>localStorage.removeItem(k),KEY);
    await pg.goto(FILE,{waitUntil:'load'});
    await pg.waitForTimeout(1500);
    await pg.click('.nav button[data-v="play"]');
    await pg.waitForSelector('.plmode');
    return{pg,errs};
  }
  const statusOf=(pg,id)=>pg.evaluate(id=>{const b=document.querySelector('[data-rn="'+id+'"]');return b?b.className.replace(/\brn\b|\bjust\b|\bshake\b/g,'').trim():null;},id);
  const store=pg=>pg.evaluate(k=>JSON.parse(localStorage.getItem(k)||'{}'),KEY);

  /* answer the current question; returns true if the chosen option was right */
  async function answer(pg,i){
    await pg.waitForSelector('.plopt:not([disabled])');
    const n=await pg.locator('.plopt:not([disabled])').count();
    await pg.locator('.plopt:not([disabled])').nth(i%n).click();
    await pg.waitForSelector('.plwhy');
    return (await pg.locator('.plopt.wrong').count())===0;
  }

  const section=async(name,fn)=>{console.log('\n=== '+name+' ===');try{await fn();}catch(e){fails++;console.log('  FAIL  section aborted: '+e.message.split('\n')[0]);}};
  await section('A. path from a fresh start + B. a lesson to completion',async()=>{
    const {pg,errs}=await openRoad(null);
    const firstCard=await pg.locator('.plmode').first().getAttribute('data-m');
    check('roadmap is the first card on the hub',firstCard==='road',firstCard);
    await pg.click('.plmode[data-m="road"]');
    await pg.waitForSelector('.road');
    const st=await pg.evaluate(()=>({
      units:document.querySelectorAll('.ru').length,nodes:document.querySelectorAll('.rn').length,
      active:[...document.querySelectorAll('.rn.active')].map(b=>b.dataset.rn),
      locked:document.querySelectorAll('.rn.locked').length,
      paths:document.querySelectorAll('.rsvg path').length,
      xs:[...document.querySelectorAll('.rn.standard')].slice(0,8).map(b=>parseFloat(b.style.left)),
      firstUnit:(document.querySelector('.ru')||{}).textContent||''
    }));
    check('no page errors',errs.length===0,errs[0]);
    check('six unit banners',st.units===6,st.units);
    check('52 nodes on the path',st.nodes===52,st.nodes);
    check('exactly one active node and it is the first construct',st.active.length===1&&st.active[0]===std1[0].id,JSON.stringify(st.active));
    check('everything else is locked',st.locked===51,st.locked);
    check('the path winds: consecutive x positions differ and cross the centre',
      st.xs.some((x,i)=>i&&Math.abs(x-st.xs[i-1])>20)&&Math.max(...st.xs)-Math.min(...st.xs)>100,JSON.stringify(st.xs));
    check('unit banner shows 0 of 8',/0\/8/.test(st.firstUnit),st.firstUnit.trim());

    await pg.click('[data-rn="'+std1[2].id+'"]',{force:true}); /* aria-disabled on purpose */
    await pg.waitForTimeout(120);
    const toast=await pg.locator('.rtoast').textContent().catch(()=>'');
    const shook=await pg.evaluate(id=>document.querySelector('[data-rn="'+id+'"]').classList.contains('shake'),std1[2].id);
    check('locked click shakes and names the blocking step',shook&&new RegExp('Finish '+label(std1[1].ref)).test(toast),toast);
    check('locked click did not open a lesson',(await pg.locator('.rlhead').count())===0);

    await pg.click('[data-rn="'+std1[0].id+'"]');
    await pg.waitForSelector('.rlhead h3');
    check('lesson opens on the construct',(await pg.locator('.rlhead h3').innerText())===label(std1[0].ref));
    const steps=std1[0].steps; /* derived from what the construct supports, not assumed */
    check('step counter starts at 1 of '+steps,new RegExp('STEP 1 OF '+steps).test(await pg.locator('.plcount').first().innerText()),await pg.locator('.plcount').first().innerText());
    check('a link to the full bubble is offered',(await pg.locator('.rlsum [data-peek]').count())===1);
    let rights=0,guard=0;
    while(guard++<30){
      const ok=await answer(pg,guard);
      if(ok)rights++;
      await pg.click('#plNext');
      await pg.waitForTimeout(60);
      if(await pg.locator('.plwin').count())break;
    }
    check(steps+' right answers complete the node',rights===steps&&guard<30,'rights '+rights+' after '+guard+' attempts');
    check('completion card says learned and pays 20 XP',/CONSTRUCT LEARNED/.test(await pg.locator('.plwin').innerText())&&/\+20 XP/.test(await pg.locator('.gain').innerText()));
    const s1=await store(pg);
    check('progress persisted with a completion date',s1.road.atlas[std1[0].id].done===steps&&s1.road.atlas[std1[0].id].at===dayKey(),JSON.stringify(s1.road.atlas[std1[0].id]));
    check('XP and streak flowed through the shared award',s1.xp===20&&s1.streak.count===1,'xp '+s1.xp+' streak '+s1.streak.count);
    await pg.click('#plPath2');
    await pg.waitForSelector('.road');
    check('node is now completed and the next one is active',
      (await statusOf(pg,std1[0].id)).includes('completed')&&(await statusOf(pg,std1[1].id)).includes('active'));
    check('unit banner advances to 1 of 8',/1\/8/.test(await pg.locator('.ru').first().innerText()));
    await pg.click('#plHome');
    await pg.waitForSelector('.plmode[data-m="road"]');
    check('hub card reports steps and unit',/1\/46 STEPS · UNIT 1 OF 6/.test(await pg.locator('.plmode[data-m="road"]').innerText()),
      (await pg.locator('.plmode[data-m="road"] .best').innerText().catch(()=>'')));
    await pg.close();
  });

  await section('C. bonus branch launches the puzzle and reports back',async()=>{
    const {pg,errs}=await openRoad({road:{atlas:doneSeed([std1[0].id,std1[1].id])}});
    await pg.click('.plmode[data-m="road"]');await pg.waitForSelector('.road');
    check('bonus unlocks once its branch point is done',(await statusOf(pg,bonus1.id)).includes('unlocked'));
    check('bonus never takes the pulse',!(await statusOf(pg,bonus1.id)).includes('active'));
    await pg.click('[data-rn="'+bonus1.id+'"]');
    await pg.waitForSelector('.pltarget b');
    check('puzzle target is the unit pair',(await pg.locator('.pltarget b').innerText())===label(bonus1.puzzle.to));
    check('puzzle starts on the unit pair',(await pg.locator('.plchain .hop').first().innerText())===label(bonus1.puzzle.from));
    let g=0;while(g++<12){if(await pg.locator('.plwin .big').count())break;await pg.click('#plHint');await pg.waitForSelector('.plopt.hint');await pg.locator('.plopt.hint').first().click();await pg.waitForTimeout(40);}
    check('puzzle solved',(await pg.locator('.plwin .big').count())===1);
    check('win card offers a way back to the roadmap',(await pg.locator('#plToRoad').count())===1);
    await pg.click('#plToRoad');
    await pg.waitForSelector('.road');
    check('bonus is marked completed on return',(await statusOf(pg,bonus1.id)).includes('completed'));
    const s=await store(pg);
    check('bonus completion persisted; XP came from the puzzle only',s.road.atlas[bonus1.id].done===1&&s.xp>=40&&s.xp<=60,'xp '+s.xp);
    check('no page errors',errs.length===0,errs[0]);
    await pg.close();
  });

  await section('D. checkpoint gates the next unit',async()=>{
    const {pg}=await openRoad({road:{atlas:doneSeed(std1.map(n=>n.id))}});
    await pg.click('.plmode[data-m="road"]');await pg.waitForSelector('.road');
    check('checkpoint is active once every construct in the unit is done',(await statusOf(pg,check1.id)).includes('active'));
    const u2first=u2.nodes.find(n=>n.type!=='bonus').id;
    check('next unit is locked behind it',(await statusOf(pg,u2first)).includes('locked'));
    await pg.click('[data-rn="'+check1.id+'"]');
    await pg.waitForSelector('.plcount');
    check('checkpoint mode announced',/CHECKPOINT/.test(await pg.locator('.plcount').first().innerText()));
    let rights=0;
    for(let i=0;i<5;i++){if(await answer(pg,0))rights++;await pg.click('#plNext');await pg.waitForTimeout(60);}
    await pg.waitForSelector('.plwin');
    const win=await pg.locator('.plwin').innerText();
    const passed=/UNIT COMPLETE/.test(win);
    check('outcome matches the count: '+rights+'/5 → '+(passed?'passed':'not yet'),
      passed===(rights>=4)&&(passed||/NEEDED 4/.test(win)),win.replace(/\s+/g,' ').slice(0,80));
    if(passed){
      await pg.click('#plPath2');await pg.waitForSelector('.road');
      check('next unit opens after the checkpoint',(await statusOf(pg,u2first)).includes('active'));
      const s=await store(pg);check('checkpoint pays 50 XP',s.xp===50,'xp '+s.xp);
    }else{
      await pg.click('#plRetry');await pg.waitForSelector('.plcount');
      check('retry offers a fresh checkpoint with nothing lost',/0 RIGHT/.test(await pg.locator('.plcount').last().innerText()));
      const s=await store(pg);check('a failed checkpoint records nothing',!(s.road.atlas[check1.id]&&s.road.atlas[check1.id].at));
    }
    await pg.close();
  });

  await b.close();
  console.log('\n────────────────────────────');
  console.log('  '+fails+' failed');
  console.log('────────────────────────────\n');
  process.exit(fails?1:0);
})();
