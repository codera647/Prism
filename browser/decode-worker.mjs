function size(bytes){
  const d=new DataView(bytes.buffer);
  if(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71&&bytes.length>=24)return [d.getUint32(16),d.getUint32(20)];
  if(bytes[0]===255&&bytes[1]===216){
    let i=2;
    while(i+4<bytes.length){if(bytes[i]!==255){i++;continue;}const marker=bytes[i+1];if(marker===255){i++;continue;}if(marker===217||marker===218)break;const length=d.getUint16(i+2);if(length<2)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker))return [d.getUint16(i+7),d.getUint16(i+5)];i+=length+2;}
  }
  const ascii=(i,n)=>String.fromCharCode(...bytes.slice(i,i+n));
  if(ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP'){
    const type=ascii(12,4);
    if(type==='VP8X'){if(bytes[20]&2)throw Error('Animated WebP is unsupported.');return [1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16),1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16)];}
    if(type==='VP8 '&&bytes[23]===157&&bytes[24]===1&&bytes[25]===42)return [d.getUint16(26,true)&16383,d.getUint16(28,true)&16383];
    if(type==='VP8L'&&bytes[20]===47){const b=d.getUint32(21,true);return [(b&16383)+1,((b>>14)&16383)+1];}
  }
  throw Error('Use a valid static JPEG, PNG or WebP image.');
}
onmessage=async event=>{
  try{
    const file=event.data,bytes=new Uint8Array(await file.arrayBuffer());
    const [width,height]=size(bytes);
    if(!width||!height||width*height>40000000)throw Error('Images must contain at most 40 megapixels.');
    // Reject animated PNG rather than silently analyzing its first frame.
    if(bytes[0]===137){let i=8;const d=new DataView(bytes.buffer);while(i+12<=bytes.length){const n=d.getUint32(i),type=String.fromCharCode(...bytes.slice(i+4,i+8));if(type==='acTL')throw Error('Animated PNG is unsupported.');if(type==='IDAT')break;i+=n+12;}}
    const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
    if(bitmap.width*bitmap.height>40000000){bitmap.close();throw Error('Image dimensions exceed the limit.');}
    const scale=Math.min(1,2048/bitmap.width,2048/bitmap.height),canvas=new OffscreenCanvas(Math.max(1,Math.round(bitmap.width*scale)),Math.max(1,Math.round(bitmap.height*scale)));
    canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
    const actual=[bitmap.width,bitmap.height];bitmap.close();
    const blob=await canvas.convertToBlob({type:'image/jpeg',quality:.9});
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
    postMessage({blob,width:actual[0],height:actual[1],hash});
  }catch(error){postMessage({error:error.message||'Image decoding failed.'});}
};
