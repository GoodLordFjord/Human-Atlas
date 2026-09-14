/* Validates data/*.json against schema/atlas.schema.json.

       node tests/validate-data.js

   Deliberately has no dependencies: it interprets the subset of JSON Schema the
   atlas schema actually uses (type, required, properties, items, enum, const,
   pattern, minLength, additionalProperties). If the schema starts needing more
   than this, that is the moment to reach for a real validator — not before. */
const fs=require('fs');
const path=require('path');
const ROOT=path.join(__dirname,'..');

const schema=JSON.parse(fs.readFileSync(path.join(ROOT,'schema','atlas.schema.json'),'utf8'));
const nodes =JSON.parse(fs.readFileSync(path.join(ROOT,'data','nodes.json'),'utf8'));
const edges =JSON.parse(fs.readFileSync(path.join(ROOT,'data','edges.json'),'utf8'));
const layers=JSON.parse(fs.readFileSync(path.join(ROOT,'data','layers.json'),'utf8'));

const errors=[];
const fail=(where,msg)=>errors.push(where+': '+msg);

function typeOf(v){
  if(v===null)return 'null';
  if(Array.isArray(v))return 'array';
  return typeof v==='number'?'number':typeof v;
}

function check(value,spec,where){
  if(spec.const!==undefined&&value!==spec.const)
    return fail(where,'must be '+JSON.stringify(spec.const)+', got '+JSON.stringify(value));

  if(spec.enum&&!spec.enum.includes(value))
    return fail(where,JSON.stringify(value)+' is not one of '+spec.enum.join(', '));

  if(spec.type){
    const allowed=Array.isArray(spec.type)?spec.type:[spec.type];
    const t=typeOf(value);
    const ok=allowed.includes(t)||(allowed.includes('number')&&t==='number');
    if(!ok)return fail(where,'expected '+allowed.join(' or ')+', got '+t);
    if(value===null)return;             /* nullable and null — nothing further to check */
  }

  if(typeof value==='string'){
    if(spec.minLength!==undefined&&value.length<spec.minLength)
      fail(where,'shorter than '+spec.minLength+' characters');
    if(spec.pattern&&!new RegExp(spec.pattern).test(value))
      fail(where,'does not match '+spec.pattern);
  }

  if(typeOf(value)==='array'&&spec.items)
    value.forEach((v,i)=>check(v,spec.items,where+'['+i+']'));

  if(typeOf(value)==='object'){
    (spec.required||[]).forEach(k=>{
      if(!(k in value))fail(where,'missing required field "'+k+'"');
    });
    if(spec.additionalProperties===false&&spec.properties){
      Object.keys(value).forEach(k=>{
        if(!(k in spec.properties))fail(where,'unexpected field "'+k+'"');
      });
    }
    if(spec.properties)Object.entries(spec.properties).forEach(([k,sub])=>{
      if(k in value)check(value[k],sub,where+'.'+k);
    });
  }
}

/* --- nodes against the schema --- */
nodes.forEach(n=>check(n,schema,n&&n.id?n.id:'<node>'));

/* --- cross-file integrity: things a per-node schema cannot see --- */
const ids=new Set(nodes.map(n=>n.id));
if(ids.size!==nodes.length)fail('nodes','duplicate ids present');

nodes.forEach(n=>{
  if(!layers[n.facets.layer])fail(n.id,'layer "'+n.facets.layer+'" is not in layers.json');
  if(n.strength.rubric!==n.facets.claim_type)
    fail(n.id,'strength.rubric "'+n.strength.rubric+'" does not match claim_type "'+n.facets.claim_type+'"');
});

const REL=['relates','tension','transmitted_to','converges_with'];
edges.forEach((e,i)=>{
  const w='edge['+i+'] '+e.from+'→'+e.to;
  if(!ids.has(e.from))fail(w,'unknown source node');
  if(!ids.has(e.to))fail(w,'unknown target node');
  if(e.from===e.to)fail(w,'self-edge');
  if(!REL.includes(e.rel))fail(w,'unknown relation "'+e.rel+'"');
});

const seen=new Set();
edges.forEach((e,i)=>{
  const k=[e.from,e.to].sort().join('|')+'|'+e.rel;
  if(seen.has(k))fail('edge['+i+']','duplicate '+k);
  seen.add(k);
});

/* every node must be reachable, or it cannot be found in the map. Edges with a
   bad endpoint are already reported above; skip them here so the reachability
   check still produces a readable report instead of throwing. */
const nb={};nodes.forEach(n=>nb[n.id]=new Set());
edges.forEach(e=>{
  if(!nb[e.from]||!nb[e.to])return;
  nb[e.from].add(e.to);nb[e.to].add(e.from);
});
const orphans=nodes.filter(n=>nb[n.id].size===0).map(n=>n.id);
if(orphans.length)fail('graph','orphan nodes: '+orphans.join(', '));

/* --- roadmaps: every node references a real construct, every prerequisite is
   inside the same roadmap, the graph is acyclic, and each unit is gated by the
   previous unit's checkpoint --- */
const rmDir=path.join(ROOT,'data','roadmaps');
const roadmaps=fs.existsSync(rmDir)?fs.readdirSync(rmDir).filter(f=>f.endsWith('.json')).sort()
  .map(f=>({file:f,rm:JSON.parse(fs.readFileSync(path.join(rmDir,f),'utf8'))})):[];
const RTYPES=['standard','checkpoint','bonus'];
/* How many distinct question types the app can generate about a construct. Mirrors
   the five generators exactly — including the page's own sentence splitter — so a
   roadmap can never ask for more steps than a lesson can supply. */
const tensionOf={};edges.filter(e=>e.rel==='tension').forEach(e=>{tensionOf[e.from]=1;tensionOf[e.to]=1;});
function sent(t,k){const s=String(t||'').trim();if(!s)return'';k=k||1;let start=0,count=0,out='';
  for(let i=0;i<s.length&&count<k;i++){if(s[i]==='.'&&(i+1>=s.length||s[i+1]===' ')){out+=s.slice(start,i+1);start=i+1;count++;}}return(out.trim()||s);}
const nodeById=Object.fromEntries(nodes.map(n=>[n.id,n]));
function supportedQuestions(id){
  const n=nodeById[id];if(!n)return 0;let k=1;               /* evidence grade: always */
  if(n.strength.label==='failed')k++;                          /* spot the failed replication */
  if(tensionOf[id])k++;                                        /* real tension partner */
  if(nb[id]&&nb[id].size>=3)k++;                               /* odd one out */
  const d=n.body.def||'';
  if(d.length>70&&sent(d,2).toLowerCase().indexOf(n.label.toLowerCase().split(' ')[0])===-1)k++; /* match the definition */
  return k;
}
roadmaps.forEach(({file,rm})=>{
  const w='roadmaps/'+file;
  if(!rm.id||!rm.title||!Array.isArray(rm.units))return fail(w,'needs id, title and units[]');
  const all=[];rm.units.forEach(u=>(u.nodes||[]).forEach(n=>all.push(n)));
  const rid=new Set();
  all.forEach(n=>{
    const nw=w+' '+n.id;
    if(rid.has(n.id))fail(nw,'duplicate roadmap node id');rid.add(n.id);
    if(!RTYPES.includes(n.type))fail(nw,'unknown node type "'+n.type+'"');
    if(!(n.steps>=1))fail(nw,'steps must be >= 1');
    if(n.type==='standard'&&!ids.has(n.ref))fail(nw,'ref "'+n.ref+'" is not a construct');
    else if(n.type==='standard'){
      const k=supportedQuestions(n.ref);
      if(n.steps>k)fail(nw,'asks for '+n.steps+' steps but '+n.ref+' supports only '+k+' question type'+(k===1?'':'s'));
    }
    if(n.type==='checkpoint'){
      if(!(n.pass>=1&&n.pass<=n.steps))fail(nw,'pass must be between 1 and steps');
      (n.pool||[]).forEach(r=>{if(!ids.has(r))fail(nw,'pool ref "'+r+'" is not a construct');});
      if(!(n.pool||[]).length)fail(nw,'checkpoint has an empty pool');
    }
    if(n.type==='bonus'){
      const pz=n.puzzle||{};
      if(!ids.has(pz.from)||!ids.has(pz.to))fail(nw,'puzzle endpoints must be constructs');
      else{ /* must be reachable, or the bonus can never be completed */
        const d={[pz.from]:0};let f=[pz.from],found=pz.from===pz.to;
        while(f.length&&!found){const nx=[];for(const u of f)for(const v of nb[u])if(d[v]===undefined){d[v]=1;if(v===pz.to)found=true;nx.push(v);}f=nx;}
        if(!found)fail(nw,'no route exists between the puzzle endpoints');
      }
    }
  });
  all.forEach(n=>(n.prerequisites||[]).forEach(p=>{
    if(!rid.has(p))fail(w+' '+n.id,'prerequisite "'+p+'" is not in this roadmap');
  }));
  /* acyclic */
  const state={},byR=Object.fromEntries(all.map(n=>[n.id,n]));
  const visit=id=>{if(state[id]==='done')return false;if(state[id]==='in')return true;state[id]='in';
    for(const p of (byR[id].prerequisites||[]))if(byR[p]&&visit(p))return true;state[id]='done';return false;};
  if(all.some(n=>visit(n.id)))fail(w,'prerequisite cycle');
  /* gate contract */
  rm.units.forEach((u,i)=>{
    if(i===0)return;
    const prevCheck=(rm.units[i-1].nodes||[]).find(n=>n.type==='checkpoint');
    const first=(u.nodes||[]).find(n=>n.type!=='bonus');
    if(!prevCheck)fail(w+' '+rm.units[i-1].id,'unit has no checkpoint to gate the next unit');
    else if(!first||!(first.prerequisites||[]).includes(prevCheck.id))
      fail(w+' '+u.id,'first node must require the previous unit\'s checkpoint');
  });
});

/* --- coverage, reported rather than enforced --- */
const withPlain=nodes.filter(n=>n.plain).length;
const withOrigin=nodes.filter(n=>n.provenance&&n.provenance.origin).length;
const byType={};nodes.forEach(n=>byType[n.facets.claim_type]=(byType[n.facets.claim_type]||0)+1);
const byRel={};edges.forEach(e=>byRel[e.rel]=(byRel[e.rel]||0)+1);

console.log('\n  '+nodes.length+' nodes · '+edges.length+' edges · '+Object.keys(layers).length+' layers');
console.log('  claim types   '+JSON.stringify(byType));
console.log('  relations     '+JSON.stringify(byRel));
console.log('  plain register '+withPlain+'/'+nodes.length+' ('+Math.round(withPlain/nodes.length*100)+'%)');
console.log('  provenance     '+withOrigin+'/'+nodes.length+' ('+Math.round(withOrigin/nodes.length*100)+'%)');

if(errors.length){
  console.log('\n  '+errors.length+' problem(s):');
  errors.slice(0,40).forEach(e=>console.log('    '+e));
  if(errors.length>40)console.log('    …and '+(errors.length-40)+' more');
  console.log('');
  process.exit(1);
}
console.log('\n  data valid against schema/atlas.schema.json\n');
