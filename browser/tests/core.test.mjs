import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clusters,normalize,copyTags,parseCsv,patterns,draftReport} from '../core.mjs';

test('average linkage does not collapse a chain of pairwise matches',()=>{
  const v=[0,30,60].map(angle=>[Math.cos(angle*Math.PI/180),Math.sin(angle*Math.PI/180)]);
  const groups=clusters(v);
  assert.equal(groups.length,2);
  assert.equal(groups.flat().length,3);
  assert.equal(new Set(groups.flat()).size,3);
});
test('overlapping tags retain exact source text and sourced corrections',()=>{
  const copy='Discover smoother skin? Today only: 20% off. Free shipping.';
  const tags=copyTags(copy);
  assert.ok(tags.some(t=>t.label==='Question'));
  assert.ok(tags.some(t=>t.label==='Discount'));
  for(const t of tags)assert.equal(copy.slice(t.start,t.end),t.quote);
  const corrected=copyTags(copy,[{kind:'offer',label:'Discount',operation:'remove'}, {kind:'hook',label:'My hook',operation:'add',quote:'smoother skin'}]);
  assert.ok(!corrected.some(t=>t.label==='Discount'));
  assert.equal(corrected.find(t=>t.label==='My hook').quote,'smoother skin');
});
test('CSV preserves quoted commas/newlines and rejects duplicate mappings',()=>{
  assert.deepEqual(parseCsv('filename,copy\r\na.png,"Hello,\nworld"'),{'a.png':'Hello,\nworld'});
  assert.throws(()=>parseCsv('filename,copy\na.png,one\na.png,two'),/duplicate/);
  assert.throws(()=>parseCsv('filename,copy\na.png,"open'),/unclosed/);
});
test('missing copy stays missing and cannot support three experiments',()=>{
  const ads=[1,2,3].map(i=>({id:String(i),copy:'',tags:[]}));
  const p=patterns(ads,[{name:'Products',members:['1','2','3']}]);
  const r=draftReport(ads,p,{images:3,copy:0,ad_variants:3,unique_images:3});
  assert.equal(r.status,'partial');assert.equal(r.experiments.length,1);
  assert.equal(r.observations.length,1);assert.equal(r.coverage.copy,0);
});
test('invalid inference cannot enter the board',()=>{
  assert.throws(()=>normalize([0,0]),/invalid/);
  assert.throws(()=>normalize([NaN,1]),/invalid/);
  assert.deepEqual(normalize([3,4]),[.6,.8]);
});
