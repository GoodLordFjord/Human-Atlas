/* Drives index.html in a real browser: clicks through every Play mode on a phone
   viewport, then checks the layout on phone and desktop. This is the test that
   catches things static analysis cannot — it found the map collapsing to the
   SVG default height of 150px, which had been shipping unnoticed.

   Needs two dev dependencies that the app itself does not:
     npm install --no-save playwright d3
     node tests/browser-test.js

   d3 is loaded from node_modules and served in place of the CDN request, and the
   webfonts are stubbed, so this runs with no network access. */
const path=require('path');
const fs=require('fs');

let chromium;
try{({chromium}=require('playwright'));}
catch(e){console.error('playwright not installed — run: npm install --no-save playwright d3');process.exit(2);}

const D3PATH=path.join(__dirname,'..','node_modules','d3','dist','d3.min.js');
if(!fs.existsSync(D3PATH)){console.error('d3 not installed — run: npm install --no-save playwright d3');process.exit(2);}
const D3=fs.readFileSync(D3PATH,'utf8');
const FILE='file://'+path.join(__dirname,'..','index.html');

(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await ctx.route('**://cdnjs.cloudflare.com/**',r=>r.fulfill({contentType:'application/javascript',body:D3}));
  await ctx.route('**://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
  await ctx.route('**://fonts.gstatic.com/**',r=>r.abort());
  const pg=await ctx.newPage();
  const errs=[];
  pg.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE: '+m.text());});
  pg.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));

  await pg.goto(FILE,{waitUntil:'load'});
  await pg.waitForTimeout(1800);

  let fails=0;
  const step=async(name,fn)=>{
    try{await fn();console.log('  PASS  '+name);}
    catch(e){fails++;errs.push('STEP "'+name+'": '+e.message);
      console.log('  FAIL  '+name+'\n          '+e.message.split('\n')[0]);}
  };

  console.log('\n=== PLAY: QUIZ ===');
  await step('play tab opens the hub with every registered mode',async()=>{
    await pg.click('.nav button[data-v="play"]');
    await pg.waitForSelector('#vPlay:not([hidden])',{timeout:3000});
    const n=await pg.locator('.plmode').count();
    if(n!==4)throw new Error('expected 4 mode cards (roadmap, quiz, expeditions, puzzle), found '+n);
    if((await pg.locator('.plmode').first().getAttribute('data-m'))!=='road')throw new Error('roadmap should lead the hub');
  });

  await step('a full 10-question round scores and explains every answer',async()=>{
    await pg.click('.plmode[data-m="quiz"]');
    for(let i=0;i<10;i++){
      await pg.waitForSelector('.plopt:not([disabled])',{timeout:3000});
      const n=await pg.locator('.plopt:not([disabled])').count();
      if(n<2)throw new Error('question '+(i+1)+' rendered only '+n+' options');
      if(!(await pg.locator('.plask').first().innerText()).trim())
        throw new Error('question '+(i+1)+' has an empty prompt');
      await pg.locator('.plopt:not([disabled])').nth(i%n).click();
      await pg.waitForSelector('.plwhy',{timeout:3000});
      if(!(await pg.locator('.plwhy p').first().innerText()).trim())
        throw new Error('question '+(i+1)+' gave an empty explanation');
      await pg.click('#plNext');
    }
    const sc=await pg.locator('.plwin .big').innerText();
    if(!/^\d+\/10$/.test(sc))throw new Error('bad result score: '+sc);
    console.log('        scored '+sc);
  });

  await step('an answer links through to the full construct',async()=>{
    await pg.click('#plAgain');
    await pg.waitForSelector('.plopt:not([disabled])');
    await pg.locator('.plopt:not([disabled])').first().click();
    await pg.waitForSelector('.plwhy [data-peek]');
    await pg.click('.plwhy [data-peek]');
    await pg.waitForSelector('#sheet.on',{timeout:3000});
    if(!(await pg.locator('#dTitle').innerText()).trim())throw new Error('detail sheet opened with no title');
    await pg.click('#dClose');
  });

  console.log('\n=== PLAY: EXPEDITIONS ===');
  await step('every route walks end to end and marks itself complete',async()=>{
    await pg.click('.plback');
    await pg.click('.plmode[data-m="exped"]');
    const count=await pg.locator('[data-e]').count();
    if(count<5)throw new Error('expected at least 5 routes, found '+count);
    for(let r=0;r<count;r++){
      await pg.locator('[data-e]').nth(r).click();
      let guard=0;
      while(guard++<40){
        if(await pg.locator('.plwin .big').count())break;
        if(!(await pg.locator('.plask').first().innerText()).trim())
          throw new Error('route '+r+' has a stop with no construct');
        if((await pg.locator('.plframe').first().innerText()).trim().length<20)
          throw new Error('route '+r+' has a stop with no framing');
        await pg.click('#plNext');
        await pg.waitForTimeout(40);
      }
      if(guard>=40)throw new Error('route '+r+' never reached its end');
      /* the card also carries a short "+XP" line; the payoff is the other paragraph */
      if((await pg.locator('.plwin p:not(.gain)').first().innerText()).trim().length<40)
        throw new Error('route '+r+' has no closing payoff');
      await pg.click('#plBack');
      await pg.waitForSelector('[data-e]');
    }
    const done=await pg.locator('[data-e]:has-text("COMPLETED")').count();
    if(done!==count)throw new Error('only '+done+'/'+count+' routes marked complete');
    console.log('        walked '+count+' routes');
  });

  await step('progress survives a reload',async()=>{
    await pg.reload({waitUntil:'load'});
    await pg.waitForTimeout(1400);
    await pg.click('.nav button[data-v="play"]');
    await pg.waitForSelector('.plmode[data-m="exped"]');
    const txt=await pg.locator('.plmode[data-m="exped"]').innerText();
    if(!/COMPLETED/.test(txt))throw new Error('completion not restored from storage');
  });

  console.log('\n=== PLAY: CONNECTION PUZZLE ===');
  await step('the daily puzzle solves along the hinted route, at par',async()=>{
    await pg.click('.plmode[data-m="puzzle"]');
    await pg.waitForSelector('.pltarget b',{timeout:3000});
    const target=await pg.locator('.pltarget b').innerText();
    let guard=0;
    while(guard++<12){
      if(await pg.locator('.plwin .big').count())break;
      await pg.click('#plHint');
      await pg.waitForSelector('.plopt.hint',{timeout:3000});
      await pg.locator('.plopt.hint').first().click();
      await pg.waitForTimeout(40);
    }
    if(!(await pg.locator('.plwin .big').count()))throw new Error('the hinted route never reached the target');
    const hops=+(await pg.locator('.plwin .big').innerText());
    const par=+(await pg.locator('.plwin .lab').innerText()).match(/PAR (\d+)/)[1];
    if(hops!==par)throw new Error('hints took '+hops+' hops but par is '+par);
    console.log('        solved '+target+' in '+hops+' hops (par '+par+')');
  });

  await step('undo steps back one hop',async()=>{
    await pg.click('#plNew');
    await pg.waitForSelector('[data-hop]');
    await pg.locator('[data-hop]').first().click();
    await pg.waitForTimeout(60);
    if(await pg.locator('.plchain .hop').count()!==2)throw new Error('hop was not added to the chain');
    await pg.click('#plUndo');
    await pg.waitForTimeout(60);
    if(await pg.locator('.plchain .hop').count()!==1)throw new Error('undo did not remove the hop');
  });

  console.log('\n=== LAYOUT ===');
  await step('no horizontal scroll at 390px',async()=>{
    const over=await pg.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    if(over>0)throw new Error(over+'px of horizontal overflow');
  });

  await step('every nav tab is reachable and meets the 44px tap rule',async()=>{
    const r=await pg.evaluate(()=>{
      const bs=[...document.querySelectorAll('.nav button')].map(b=>b.getBoundingClientRect());
      return{n:bs.length,minH:Math.min(...bs.map(b=>b.height)),minW:Math.min(...bs.map(b=>b.width))};
    });
    if(r.minH<44)throw new Error('shortest tab is '+Math.round(r.minH)+'px');
    if(r.minW<40)throw new Error('narrowest tab is '+Math.round(r.minW)+'px');
    console.log('        '+r.n+' tabs, narrowest '+Math.round(r.minW)+'px');
  });

  await step('play controls are all thumb-sized',async()=>{
    await pg.click('.plback');
    await pg.waitForSelector('.plmode');
    const bad=await pg.evaluate(()=>[...document.querySelectorAll('#vPlay button')]
      .filter(b=>b.offsetParent!==null&&b.getBoundingClientRect().height<38)
      .map(b=>b.className+':'+Math.round(b.getBoundingClientRect().height)));
    if(bad.length)throw new Error('undersized controls: '+bad.join(', '));
  });

  /* the regression that prompted this file: .app must give the map a real row,
     or the graph silently falls back to the SVG default height of 150px */
  await step('the map fills its pane and fits the whole graph on first open',async()=>{
    const fresh=await ctx.newPage();
    fresh.on('pageerror',e=>errs.push('PAGEERROR(map): '+e.message));
    await fresh.goto(FILE,{waitUntil:'load'});
    await fresh.waitForTimeout(2200);
    await fresh.click('.nav button[data-v="map"]');
    await fresh.waitForTimeout(1500);
    const st=await fresh.evaluate(()=>{
      const svg=document.querySelector('#graph').getBoundingClientRect();
      const g=document.querySelector('#graph g');
      const m=/scale\(([-\d.]+)\)/.exec(g?g.getAttribute('transform')||'':'');
      let inside=0,total=0;
      document.querySelectorAll('#graph g.nd').forEach(n=>{
        const r=n.getBoundingClientRect();total++;
        if(r.left>=svg.left-1&&r.right<=svg.right+1&&r.top>=svg.top-1&&r.bottom<=svg.bottom+1)inside++;
      });
      return{h:Math.round(svg.height),k:m?+m[1]:null,inside,total};
    });
    if(st.h<400)throw new Error('graph pane is only '+st.h+'px tall — the SVG fell back to its default height');
    if(st.k===null||!isFinite(st.k))throw new Error('graph never received a finite transform');
    if(st.inside/st.total<0.9)throw new Error('only '+st.inside+'/'+st.total+' nodes on screen after the fit');
    console.log('        pane '+st.h+'px, scale '+st.k.toFixed(2)+', '+st.inside+'/'+st.total+' nodes visible');
    await fresh.close();
  });

  await step('desktop keeps every tab and adds no horizontal scroll',async()=>{
    await pg.setViewportSize({width:1280,height:900});
    await pg.waitForTimeout(300);
    const over=await pg.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    if(over>0)throw new Error(over+'px overflow at 1280px');
    if(await pg.locator('.nav button').count()!==6)throw new Error('nav lost tabs on desktop');
  });

  await b.close();
  const consoleErrs=errs.filter(e=>/^CONSOLE|^PAGEERROR/.test(e));
  console.log('\n────────────────────────────');
  console.log('  '+fails+' failed · '+consoleErrs.length+' console error(s)');
  console.log('────────────────────────────\n');
  if(consoleErrs.length)console.log(consoleErrs.slice(0,8).join('\n')+'\n');
  process.exit(fails||consoleErrs.length?1:0);
})();
