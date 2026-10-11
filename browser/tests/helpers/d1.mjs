import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
const schema=await readFile(new URL('../../migrations/0001_accounts.sql',import.meta.url),'utf8');
export function database(){
 const sql=new DatabaseSync(':memory:');sql.exec(schema);
 function prepare(query){let values=[];return {bind(...v){values=v;return this;},async first(){return sql.prepare(query).get(...values)||null;},async all(){return {results:sql.prepare(query).all(...values)};},async run(){const result=sql.prepare(query).run(...values);return {meta:{changes:Number(result.changes)}};}};}
 return {sql,prepare,async batch(statements){sql.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}};
}
