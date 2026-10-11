import {reachSearch} from '../../../server/providers.mjs';
import {body,HttpError,json,sameOrigin} from '../../../server/security.mjs';
import {validateBrief} from '../../../../src/prism/web/research-core.mjs';
export async function onRequestPost({request}){
 try{sameOrigin(request);return json(await reachSearch(validateBrief(await body(request,6000))));}
 catch(e){return json({detail:e instanceof HttpError?e.message:'Check your brief and try again.'},e instanceof HttpError?e.status:400);}
}
