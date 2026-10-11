import {handleCloud} from '../../../server/cloud.mjs';
export const onRequest=context=>handleCloud(context.request,context.env);
