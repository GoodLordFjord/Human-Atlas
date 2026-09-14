/* Behavioural test for the streak / XP spine. Seeds localStorage into each
   state the streak logic must handle, completes a quiz round in the real page,
   and checks what was persisted. No clock mocking: the seed is relative to the
   page's own idea of today, so the branches are exercised deterministically.

       npm install --no-save playwright d3
       node tests/streak-test.js */
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

/* same algorithm as the page; both run in this container's time zone */
const dayKey=d=>{d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const dayShift=(k,n)=>{const p=k.split('-').map(Number);return dayKey(new Date(p[0],p[1]-1,p[2]+n));};
const TODAY=dayKey(),YESTERDAY=dayShift(TODAY,-1),TWO_AGO=dayShift(TODAY,-2);

let fails=0;
const check=(name,cond,detail)=>{
  if(cond)console.log('  PASS  '+name);
  else{fails++;console.log('  FAIL  '+name+(detail?'\n          '+detail:''));}
};

(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await ctx.route('**://cdnjs.cloudflare.com/**',r=>r.fulfill({contentType:'application/javascript',body:D3}));
  await ctx.route('**://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
  await ctx.route('**://fonts.gstatic.com/**',r=>r.abort());

  async function run(seed,label){
    const pg=await ctx.newPage();
    const errs=[];
    pg.on('pageerror',e=>errs.push(e.message));
    if(seed)await pg.addInitScript(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[KEY,seed]);
    else await pg.addInitScript(k=>localStorage.removeItem(k),KEY);
    await pg.goto(FILE,{waitUntil:'load'});
    await pg.waitForTimeout(1500);
    await pg.click('.nav button[data-v="play"]');
    await pg.waitForSelector('.plmode[data-m="quiz"]');
    const hub=await pg.evaluate(()=>({
      spine:!!document.querySelector('.spine'),
      todayCls:(document.querySelector('.today')||{}).className||'',
      spineText:(document.querySelector('.spine')||{}).textContent||''
    }));
    await pg.click('.plmode[data-m="quiz"]');
    let score=0;
    for(let i=0;i<10;i++){
      await pg.waitForSelector('.plopt:not([disabled])');
      const n=await pg.locator('.plopt:not([disabled])').count();
      await pg.locator('.plopt:not([disabled])').nth(i%n).click();
      await pg.waitForSelector('.plwhy');
      if(await pg.locator('.plopt.right.wrong, .plopt.wrong').count()===0)score++; /* chosen was right */
      await pg.click('#plNext');
    }
    await pg.waitForSelector('.plwin .big');
    const shown=await pg.locator('.plwin .big').innerText();
    score=+shown.split('/')[0];
    const gain=await pg.locator('.gain').innerText();
    const after=await pg.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
    const inQuizSpine=await pg.locator('.spine').count();
    const spineCls=await pg.evaluate(()=>(document.querySelector('.spine')||{}).className||'');
    /* re-render the finished state by leaving and re-entering the tab */
    await pg.click('.nav button[data-v="map"]');await pg.waitForTimeout(150);
    await pg.click('.nav button[data-v="play"]');await pg.waitForTimeout(250);
    const again=await pg.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
    await pg.close();
    return{hub,score,gain,after,again,inQuizSpine,spineCls,errs};
  }

  console.log('\n=== A. first ever activity ===');
  {
    const r=await run(null,'fresh');
    check('no page errors',r.errs.length===0,r.errs[0]);
    check('spine renders on the hub',r.hub.spine);
    check('hub invites a new streak',/today/.test(r.hub.todayCls)&&!/risk|done/.test(r.hub.todayCls));
    check('spine renders inside the quiz too',r.inQuizSpine===1);
    check('ember tier on day 1',/tier-ember/.test(r.spineCls),r.spineCls);
    check('streak becomes 1',r.after.streak.count===1,'got '+r.after.streak.count);
    check('last is today',r.after.streak.last===TODAY,r.after.streak.last);
    check('XP is score × 10',r.after.xp===r.score*10,r.after.xp+' vs score '+r.score);
    check('today is logged',r.after.log[TODAY]===r.score*10);
    check('result card shows the gain and the streak',/\+\d+ XP · streak 1 day$/.test(r.gain.trim()),r.gain);
    check('re-rendering the finished round does not award twice',
      r.again.xp===r.after.xp&&r.again.quizRounds===1,'xp '+r.again.xp+' rounds '+r.again.quizRounds);
  }

  console.log('\n=== B. active yesterday → extends ===');
  {
    const r=await run({streak:{count:3,best:3,last:YESTERDAY,freezes:0,frozen:[]},xp:120,log:{}},'extend');
    check('hub warns the streak is at risk',/risk/.test(r.hub.todayCls),r.hub.todayCls);
    check('hub spine shows the current count',/3\s*days/.test(r.hub.spineText),r.hub.spineText.replace(/\s+/g,' ').trim());
    check('streak extends to 4',r.after.streak.count===4,'got '+r.after.streak.count);
    check('best keeps up',r.after.streak.best===4);
    check('XP accumulates',r.after.xp===120+r.score*10);
  }

  console.log('\n=== C. missed one day, holding a freeze → kept, and day 7 earns one ===');
  {
    const r=await run({streak:{count:6,best:6,last:TWO_AGO,freezes:1,frozen:[]},xp:0,log:{}},'freeze');
    check('streak continues to 7',r.after.streak.count===7,'got '+r.after.streak.count);
    check('the freeze covered yesterday',r.after.streak.frozen.length===1&&r.after.streak.frozen[0]===YESTERDAY,JSON.stringify(r.after.streak.frozen));
    check('freeze spent, then a new one earned at day 7',r.after.streak.freezes===1,'got '+r.after.streak.freezes);
    check('result says the streak was kept with a freeze',/kept with a freeze, now 7 days/.test(r.gain),r.gain);
  }

  console.log('\n=== D. missed one day, no freeze → resets ===');
  {
    const r=await run({streak:{count:6,best:6,last:TWO_AGO,freezes:0,frozen:[]},xp:0,log:{}},'reset');
    check('streak resets to 1',r.after.streak.count===1,'got '+r.after.streak.count);
    check('best is preserved',r.after.streak.best===6);
  }

  console.log('\n=== E. already counted today → no double extension ===');
  {
    const r=await run({streak:{count:5,best:5,last:TODAY,freezes:0,frozen:[]},xp:50,log:{[TODAY]:50}},'done');
    check('hub says today is counted',/done/.test(r.hub.todayCls),r.hub.todayCls);
    check('count unchanged',r.after.streak.count===5,'got '+r.after.streak.count);
    check('XP still accrues',r.after.xp===50+r.score*10);
    check('result shows XP without a streak message',/\+\d+ XP$/.test(r.gain.trim()),r.gain);
  }

  console.log('\n=== F. freeze cap ===');
  {
    const r=await run({streak:{count:13,best:13,last:YESTERDAY,freezes:2,frozen:[]},xp:0,log:{}},'cap');
    check('day 14 does not exceed the freeze cap of 2',r.after.streak.freezes===2,'got '+r.after.streak.freezes);
    check('bronze tier at 14 days',/tier-bronze/.test(r.spineCls),r.spineCls);
  }

  await b.close();
  console.log('\n────────────────────────────');
  console.log('  '+fails+' failed');
  console.log('────────────────────────────\n');
  process.exit(fails?1:0);
})();
