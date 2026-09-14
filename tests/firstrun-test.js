/* The first-run walkthrough: what someone who has never seen this site hits, in
   order, and how few decisions it takes to reach something worth reading.

   The measure that matters is taps-to-value — how many taps from a cold load to
   a construct explained in plain English. Everything else here guards the
   sequencing that keeps that number low.

       npm install --no-save playwright d3
       node tests/firstrun-test.js */
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

let fails=0;
const check=(name,cond,detail)=>{
  if(cond)console.log('  PASS  '+name);
  else{fails++;console.log('  FAIL  '+name+(detail!==undefined?'\n          '+String(detail).slice(0,200):''));}
};

(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await ctx.route('**://cdnjs.cloudflare.com/**',r=>r.fulfill({contentType:'application/javascript',body:D3}));
  await ctx.route('**://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
  await ctx.route('**://fonts.gstatic.com/**',r=>r.abort());

  async function cold(seed){
    const pg=await ctx.newPage();const errs=[];
    pg.on('pageerror',e=>errs.push(e.message));
    pg.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
    if(seed)await pg.addInitScript(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[KEY,seed]);
    else await pg.addInitScript(k=>localStorage.removeItem(k),KEY);
    await pg.goto(FILE,{waitUntil:'load'});
    await pg.waitForTimeout(1600);
    return{pg,errs};
  }
  /* everything the eye can actually act on, above the fold, excluding the nav */
  const affordances=pg=>pg.evaluate(()=>{
    const vh=window.innerHeight;
    return [...document.querySelectorAll('button,a[href],input,select')].filter(el=>{
      if(el.closest('.nav'))return false;
      const r=el.getBoundingClientRect(),st=getComputedStyle(el);
      if(!(r.width>0&&r.height>0&&r.top<vh&&r.bottom>0))return false;
      if(st.visibility==='hidden'||st.display==='none'||+st.opacity<=0.05)return false;
      /* clipped inside a collapsed container (the filter drawer) is not on screen */
      for(let a=el.parentElement;a;a=a.parentElement){
        const as=getComputedStyle(a);
        if((as.overflow==='hidden'||as.overflowY==='hidden')&&a.getBoundingClientRect().height<4)return false;
      }
      return true;
    }).map(el=>(el.textContent||el.placeholder||el.ariaLabel||'').trim().slice(0,32));
  });

  console.log('\n=== A. the first screen ===');
  {
    const {pg,errs}=await cold(null);
    check('no page errors on a cold load',errs.length===0,errs[0]);
    const view=await pg.evaluate(()=>[...document.querySelectorAll('.view')].find(v=>!v.hidden).id);
    check('opens on Start, not the graph',view==='vStart',view);

    const hero=await pg.locator('.hero').count();
    check('there is exactly one hero action',hero===1,hero);
    const heroText=await pg.locator('.hero').innerText();
    check('the hero says what it is and how long it takes',/START HERE/.test(heroText)&&/5 MINUTES/i.test(heroText),heroText.replace(/\n/g,' | '));
    check('the hero promises no account',/No account/i.test(heroText));

    /* Hick's law: decision time grows with the number of options. The bar below is a
       creep guard — one hero, five clearly-subordinate alternatives and About. What
       actually protects the first decision is the dominance check underneath it. */
    const aff=await affordances(pg);
    check('the first screen has not grown new competing actions',aff.length<=8,aff.length+': '+aff.join(' / '));
    check('no search or filter controls before there is anything to search',
      !aff.some(t=>/Search|Filters/i.test(t)),aff.join(' / '));
    const heroBox=await pg.locator('.hero').boundingBox();
    const taskBox=await pg.locator('.tasks.compact .task').first().boundingBox();
    check('the hero is visually dominant over the secondary cards',
      heroBox.height>taskBox.height*1.4,'hero '+Math.round(heroBox.height)+'px vs task '+Math.round(taskBox.height)+'px');
    check('the hero comes first in reading order',heroBox.y<taskBox.y);
    check('the alternatives are labelled as alternatives',
      /OR GO STRAIGHT TO A QUESTION/.test(await pg.locator('#vStart').innerText()));

    /* the one number that matters */
    await pg.click('.hero');
    await pg.waitForTimeout(500);
    await pg.click('.rn.active');
    await pg.waitForSelector('.rlhead h3',{timeout:4000});
    const lesson=await pg.locator('#vPlay').innerText();
    check('two taps from cold load to a construct in plain English',
      /WHAT IT IS|WHY IT MATTERS/.test(lesson)||(await pg.locator('.rlsum').count())===1,lesson.slice(0,120));
    console.log('        taps to first explained construct: 2 (hero → first node)');
    await pg.close();
  }

  console.log('\n=== B. the guided path is reachable and honest about progress ===');
  {
    const {pg}=await cold(null);
    check('the Learn tab is named for what it gives',
      /Learn/.test(await pg.locator('.nav button[data-v="play"]').innerText()),
      (await pg.locator('.nav button[data-v="play"]').innerText()).replace(/\n/g,' '));
    await pg.click('.hero');
    await pg.waitForTimeout(400);
    check('the hero lands directly on the path, not the mode list',(await pg.locator('.road').count())===1);
    await pg.click('.plback');await pg.waitForTimeout(250);
    check('no streak nudge before anything is earned',(await pg.locator('.today').count())===0);
    check('the roadmap leads the mode list',
      (await pg.locator('.plmode').first().getAttribute('data-m'))==='road');
    await pg.close();
  }

  console.log('\n=== C. returning visitor is offered continuation, not a restart ===');
  {
    const rm=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','roadmaps','atlas.json'),'utf8'));
    const first=rm.units[0].nodes.find(n=>n.type==='standard');
    const {pg}=await cold({road:{atlas:{[first.id]:{done:first.steps,at:'2026-01-01'}}},xp:20});
    const heroText=await pg.locator('.hero').innerText();
    check('the hero switches to Continue',/CONTINUE THE GUIDED PATH/.test(heroText),heroText.replace(/\n/g,' | '));
    check('it names where you are',/1\/46/.test(heroText),heroText.replace(/\n/g,' | '));
    check('it names what is next',/Next up:/.test(heroText));
    await pg.close();
  }

  console.log('\n=== D. the map: overview first, details on demand ===');
  {
    const {pg,errs}=await cold(null);
    await pg.click('.nav button[data-v="map"]');
    await pg.waitForTimeout(1800);
    check('nothing blocks the map on arrival',(await pg.locator('.mapcard:visible').count())===0);
    const labels=await pg.evaluate(()=>[...document.querySelectorAll('#graph g.nd text')]
      .filter(t=>t.getAttribute('display')!=='none').length);
    check('only the hubs are named at fit zoom',labels<=12,labels+' labels');
    check('the legend is present without being asked for',(await pg.locator('.legend').isVisible()));
    check('a hint points at the first thing to do',(await pg.locator('.maphint').isVisible()));

    check('the map can be cut down to the current unit',(await pg.locator('#uMine').count())===1);
    await pg.click('#uMine');await pg.waitForTimeout(900);
    const drawn=()=>pg.evaluate(()=>[...document.querySelectorAll('#graph g.nd')]
      .filter(g=>g.getAttribute('display')!=='none'&&getComputedStyle(g).display!=='none'&&+getComputedStyle(g).opacity>0.15).length);
    const few=await drawn();
    check('narrowing shows a handful, not the hairball',few>0&&few<=12,few+' nodes');
    await pg.click('#uAll');await pg.waitForTimeout(700);
    const all=await drawn();
    check('and going back restores everything',all===98,all+' nodes');

    await pg.locator('.nd').first().click({force:true});
    await pg.waitForTimeout(500);
    check('tapping a bubble opens the detail sheet',await pg.locator('#sheet.on').count()===1);
    check('which opens in plain English',
      (await pg.locator('[data-reg="plain"]').getAttribute('aria-pressed'))==='true');
    check('the hint retires after the first tap',!(await pg.locator('.maphint').isVisible()));
    /* a second visit, sharing storage but without the init script that clears it */
    const pg2=await ctx.newPage();
    await pg2.goto(FILE,{waitUntil:'load'});await pg2.waitForTimeout(1500);
    await pg2.click('.nav button[data-v="map"]');await pg2.waitForTimeout(1200);
    check('and stays retired on the next visit',!(await pg2.locator('.maphint').isVisible()),
      await pg2.evaluate(k=>localStorage.getItem(k),KEY));
    await pg2.close();
    check('no page errors across the map journey',errs.length===0,errs[0]);
    await pg.close();
  }

  console.log('\n=== E. plain names lead, precise names survive ===');
  {
    const {pg}=await cold(null);
    await pg.click('.nav button[data-v="browse"]');await pg.waitForTimeout(400);
    const h=await pg.locator('.grp h2').first().innerText();
    check('browse headings lead with the plain name',/Built-in drives/.test(h),h.replace(/\n/g,' | '));
    check('and keep the precise one beside it',/Evolved substrate/.test(h),h.replace(/\n/g,' | '));
    await pg.click('#bFilter');await pg.waitForTimeout(300);
    const chips=await pg.locator('#optLayer .opt').allInnerTexts();
    check('layer chips are plain',chips.includes('What you inherit')&&!chips.includes('Heredity & genomics'),chips.slice(0,4).join(' / '));
    check('grade chips spell out the jargon',
      (await pg.locator('#optEv .opt').allInnerTexts()).includes('Failed to replicate'));
    await pg.close();
  }

  console.log('\n=== F. the filter drawer does not follow you around ===');
  {
    const {pg}=await cold(null);
    await pg.click('.nav button[data-v="map"]');await pg.waitForTimeout(800);
    await pg.click('#bFilter');await pg.waitForTimeout(300);
    check('the drawer opens',await pg.locator('#drawer.on').count()===1);
    await pg.click('.nav button[data-v="play"]');await pg.waitForTimeout(400);
    check('and closes when the view changes',await pg.locator('#drawer.on').count()===0);
    check('map-only tools are hidden on the guided path',!(await pg.locator('.searchrow').isVisible()));
    await pg.click('.nav button[data-v="map"]');await pg.waitForTimeout(500);
    check('and come back on the map',await pg.locator('.searchrow').isVisible());
    await pg.close();
  }

  console.log('\n=== G. Trace asks rather than answers ===');
  {
    const {pg}=await cold(null);
    await pg.click('.nav button[data-v="trace"]');await pg.waitForTimeout(400);
    const txt=await pg.locator('#vTrace').innerText();
    check('it opens with a question, not a route',/Which two ideas/.test(txt)&&!/→/.test(txt.split('Choose')[0]||''),txt.slice(0,90).replace(/\n/g,' | '));
    check('both pickers start empty',
      (await pg.locator('#selFrom').inputValue())===''&&(await pg.locator('#selTo').inputValue())==='');
    const sug=await pg.locator('[data-sug]').count();
    check('it offers real pairs to try',sug===3,sug);
    await pg.locator('[data-sug]').first().click();
    await pg.waitForTimeout(400);
    check('choosing one produces a route',(await pg.locator('#vTrace .tension').count())>0);
    await pg.close();
  }

  console.log('\n=== H. one About door, both documents behind it ===');
  {
    const {pg}=await cold(null);
    const header=await pg.locator('.top').innerText();
    check('the header carries one About control, not two essays',
      /About/.test(header)&&!/Audit log/.test(header)&&!/Method/.test(header),header.replace(/\n/g,' | '));
    await pg.click('#bAbout');await pg.waitForTimeout(300);
    check('About opens',await pg.locator('#mAbout.on').count()===1);
    check('it states the privacy promise plainly',/no account/i.test(await pg.locator('#mAbout').innerText()));
    await pg.click('#aMethod');await pg.waitForTimeout(300);
    check('the grading document is one tap further',await pg.locator('#mMethod.on').count()===1);
    check('and About got out of the way',await pg.locator('#mAbout.on').count()===0);
    await pg.keyboard.press('Escape');await pg.waitForTimeout(200);
    await pg.click('#bAbout');await pg.waitForTimeout(250);
    await pg.click('#aAudit');await pg.waitForTimeout(300);
    check('the audit log is reachable too',await pg.locator('#mAudit.on').count()===1);
    await pg.close();
  }

  await b.close();
  console.log('\n────────────────────────────');
  console.log('  '+fails+' failed');
  console.log('────────────────────────────\n');
  process.exit(fails?1:0);
})();
