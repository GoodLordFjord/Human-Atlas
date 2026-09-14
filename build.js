/* Builds index.html from src/app.html + data/*.json.

   The data files are the source of truth and are what you edit. This step folds
   them back into one self-contained HTML file, so the site stays a single file
   you can open by double-clicking — browsers block fetch() on file:// URLs, so
   a page that loaded its own JSON at runtime would only work over a server.

       node build.js

   Run it after editing anything in data/. */
const fs=require('fs');
const path=require('path');
const ROOT=__dirname;

const read=f=>JSON.parse(fs.readFileSync(path.join(ROOT,'data',f),'utf8'));
const nodes=read('nodes.json'), edges=read('edges.json'), layers=read('layers.json');
/* one roadmap per file; a new subject is a new file, not a code change */
const roadmaps=fs.readdirSync(path.join(ROOT,'data','roadmaps')).filter(f=>f.endsWith('.json')).sort()
  .map(f=>JSON.parse(fs.readFileSync(path.join(ROOT,'data','roadmaps',f),'utf8')));

/* The renderer still speaks the original field names. Rather than rewrite it in
   the same change that moves the data out, the build projects v2 records back
   into the shape it expects, and carries the new fields alongside. The renderer
   migrates field by field from here, without the data ever moving again. */
const linksOf=id=>edges.filter(e=>e.rel==='relates'&&(e.from===id||e.to===id))
  .map(e=>[e.from===id?e.to:e.from,e.note]);
const contraOf=id=>edges.filter(e=>e.rel==='tension'&&(e.from===id||e.to===id))
  .map(e=>[e.from===id?e.to:e.from,e.note]);

const projected=nodes.map(n=>({
  id:n.id, label:n.label, layer:n.facets.layer,
  ev:n.strength.label, ver:n.verification,
  def:n.body.def, mech:n.body.mech,
  mag:n.strength.magnitude, bound:n.strength.boundaries, rep:n.strength.replication,
  intra:n.body.intra, inter:n.body.inter, app:n.body.app,
  links:linksOf(n.id), contra:contraOf(n.id),
  src:n.sources, open:n.open,
  /* v2 fields the renderer reads directly */
  claim_type:n.facets.claim_type, tradition:n.facets.tradition, plain:n.plain
}));

const layersJs=Object.fromEntries(Object.entries(layers).map(([k,v])=>[k,{n:v.name,c:v.color}]));

function build(){
  const payload='const LAYERS='+JSON.stringify(layersJs)+';\n'+
                'const N='+JSON.stringify(projected)+';\n'+
                'const ROADMAPS='+JSON.stringify(roadmaps)+';';
  const tpl=fs.readFileSync(path.join(ROOT,'src','app.html'),'utf8');
  if(!tpl.includes('/*__ATLAS_DATA__*/')){
    console.error('src/app.html is missing the /*__ATLAS_DATA__*/ marker');
    process.exit(1);
  }
  const out=tpl.replace('/*__ATLAS_DATA__*/',()=>payload);
  fs.writeFileSync(path.join(ROOT,'index.html'),out);
  return out;
}

/* the tests read the data through here, so the projection is defined once */
module.exports={nodes,edges,layers,roadmaps,projected,build};

if(require.main===module){
  const out=build();
  const withPlain=nodes.filter(n=>n.plain).length;
  console.log('built index.html — '+nodes.length+' nodes, '+edges.length+' edges, '+
    Object.keys(layers).length+' layers, '+roadmaps.length+' roadmap'+(roadmaps.length===1?'':'s')+', '+(out.length/1024).toFixed(0)+' KB');
  console.log('plain-language register: '+withPlain+'/'+nodes.length+
    ' ('+Math.round(withPlain/nodes.length*100)+'%)');
}
