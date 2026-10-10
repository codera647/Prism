import policy from './policy.json' with {type:'json'};
export {policy};
export function normalize(vector){
  const v=Array.from(vector,Number),norm=Math.hypot(...v);
  if(!norm||v.some(x=>!Number.isFinite(x)))throw Error('CLIP returned an invalid vector.');
  return v.map(x=>x/norm);
}
export const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
export function copyTags(text,corrections=[]){
  const tags=[];
  for(const [kind,rules] of [['hook',policy.HOOK_RULES],['offer',policy.OFFER_RULES]]){
    for(const [label,expression] of rules){const m=new RegExp(expression,'i').exec(text);if(m)tags.push({kind,label,source:'user_copy',start:m.index,end:m.index+m[0].length,quote:m[0]});}
  }
  for(const c of corrections){
    for(let i=tags.length-1;i>=0;i--)if(tags[i].kind===c.kind&&tags[i].label===c.label)tags.splice(i,1);
    if(c.operation==='add'&&c.quote&&text.includes(c.quote)){const start=text.indexOf(c.quote);tags.push({kind:c.kind,label:c.label,source:'user_annotation',start,end:start+c.quote.length,quote:c.quote});}
  }
  return tags;
}
export function clusters(vectors,threshold=.22){
  // Average linkage updates cached pair distances by cluster size, O(n^3) for <=100.
  const groups=new Map(vectors.map((_,i)=>[i,[i]])),distances=new Map();
  const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
  for(let i=0;i<vectors.length;i++)for(let j=i+1;j<vectors.length;j++)distances.set(key(i,j),1-dot(vectors[i],vectors[j]));
  while(groups.size>1){
    const ids=[...groups.keys()];let best=null,minimum=Infinity;
    for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const d=distances.get(key(ids[i],ids[j]));if(d<minimum){minimum=d;best=[ids[i],ids[j]];}}
    if(minimum>=threshold)break;
    const [a,b]=best,na=groups.get(a).length,nb=groups.get(b).length;
    for(const c of ids)if(c!==a&&c!==b)distances.set(key(a,c),(na*distances.get(key(a,c))+nb*distances.get(key(b,c)))/(na+nb));
    groups.set(a,[...groups.get(a),...groups.get(b)]);groups.delete(b);
  }
  return [...groups.values()];
}
export function patterns(ads,groups){
  const result=groups.map(g=>({kind:'visual',label:g.name,count:g.members.length,denominator:ads.length,ad_ids:g.members,tentative:true}));
  const tags=new Map();
  for(const a of ads)for(const t of a.tags){const k=t.kind+'\0'+t.label;if(!tags.has(k))tags.set(k,{kind:t.kind,label:t.label,count:0,denominator:ads.length,ad_ids:[],tentative:false});const p=tags.get(k);if(!p.ad_ids.includes(a.id)){p.ad_ids.push(a.id);p.count++;}}
  return [...result,...tags.values()].sort((a,b)=>b.count-a.count);
}
export function draftReport(ads,groupPatterns,coverage){
  const observations=groupPatterns.filter(p=>p.count>=2).slice(0,12).map(p=>({...p,text:`${p.count} of ${p.denominator} analyzed ad variants share ${p.label.toLowerCase()}${p.tentative?' (tentative visual label).':' in their supplied copy.'}`}));
  const visual=groupPatterns.find(p=>p.kind==='visual'),hook=groupPatterns.find(p=>p.kind==='hook'),offer=groupPatterns.find(p=>p.kind==='offer');
  const candidates=[
    [visual,'Change the visual composition','visual composition','Compare the current composition with a contrasting composition, such as product-only versus product in use.','Keep the headline, offer, audience and placement the same.','A different composition may make the product easier to understand.'],
    [hook,'Try a different opening hook','opening headline','Compare the observed hook with a question-led or direct, factual product introduction.','Keep the image, product facts, offer and audience the same.','A different opening may make the message more relevant to the viewer.'],
    [offer||hook,'Test the supporting message',offer?'offer presentation':'supporting copy',offer?'Present the same existing offer more clearly without changing its value.':'Compare concise supporting copy with a fuller explanation of verified product facts.','Keep the image, opening hook, product, audience and actual price the same.','Clearer supporting information may help viewers understand the proposal.']
  ];
  const experiments=ads.length>=3?candidates.filter(c=>c[0]).map(([p,title,variable,direction,hold_constant,hypothesis])=>({title,variable,direction,hold_constant,hypothesis,evidence_ids:p.ad_ids.slice(0,8),observation:p.label,measurement:'Choose a campaign metric and a fair comparison before running this experiment elsewhere.',limitations:'Untested creative hypothesis. Uploaded ads provide no performance evidence.'})):[];
  return {id:crypto.randomUUID(),status:experiments.length===3?'draft':'partial',method:'evidence-based templates',observations,experiments,coverage,gap:experiments.length===3?null:'At least three ads and identifiable copy hooks are needed for three supported experiments.',limitations:['Visual labels are tentative CLIP suggestions; rename them after inspection.','Copy tags use English rules and quote supplied text. No OCR or semantic language model is enabled.','Repeated claims in ads are advertiser statements, not verified product benefits.','No campaign performance data was supplied.','Browser storage is specific to this device and site address. Export your work before clearing browser data.'],reviewed_at:null};
}
export function parseCsv(text){
  const rows=[];let row=[],cell='',quoted=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(!quoted&&c===','){row.push(cell);cell='';}else if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}
  if(quoted)throw Error('CSV has an unclosed quoted field.');
  if(cell||row.length){row.push(cell);rows.push(row);}
  if(rows[0]?.length!==2||!rows[0].includes('filename')||!rows[0].includes('copy'))throw Error('CSV columns must be filename and copy.');
  const ni=rows[0].indexOf('filename'),ci=rows[0].indexOf('copy'),mapping={};
  for(const r of rows.slice(1)){if(r.length!==2||Object.hasOwn(mapping,r[ni]))throw Error('CSV contains duplicate filenames or ambiguous columns.');mapping[r[ni]]=r[ci];}
  return mapping;
}
