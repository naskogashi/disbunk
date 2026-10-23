import { Buffer } from 'node:buffer';
import { brandedEmail } from '../_shared/email.ts';

const MAX_FILE=10*1024*1024;
const origins=new Set(['https://disbunk.org','http://127.0.0.1:8080','http://localhost:8080']);
const types:Record<string,string>={pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',odt:'application/vnd.oasis.opendocument.text',txt:'text/plain',rtf:'application/rtf'};
function validSignature(extension:string,bytes:Uint8Array){
  const ascii=new TextDecoder().decode(bytes);
  const starts=(values:number[])=>values.every((value,index)=>bytes[index]===value);
  if(extension==='pdf')return ascii.startsWith('%PDF-');
  if(extension==='jpg'||extension==='jpeg')return starts([255,216,255]);
  if(extension==='png')return starts([137,80,78,71,13,10,26,10]);
  if(extension==='gif')return /^GIF8[79]a/.test(ascii);
  if(extension==='webp')return ascii.startsWith('RIFF')&&ascii.slice(8,12)==='WEBP';
  if(extension==='doc')return starts([208,207,17,224,161,177,26,225]);
  if(extension==='docx'||extension==='odt')return starts([80,75,3,4]);
  if(extension==='rtf')return ascii.startsWith('{\\rtf');
  return !bytes.includes(0)&&!/^\s*<(?:!doctype|html|script)/i.test(ascii);
}
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get('origin')||'';
  const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':origins.has(origin)?origin:'https://disbunk.org','Vary':'Origin','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type'};
  const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
  if(req.method==='OPTIONS')return new Response(null,{headers});
  if(req.method!=='POST')return json({error:'method'},405);
  if(!origins.has(origin))return json({error:'origin'},403);
  if(Number(req.headers.get('content-length')||0)>31*1024*1024)return json({error:'files'},413);
  try{
    if(!req.headers.get('content-type')?.startsWith('multipart/form-data'))return json({error:'invalid'},400);
    const reader=req.body?.getReader();
    if(!reader)return json({error:'invalid'},400);
    let size=0;const chunks:Uint8Array[]=[];
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>31*1024*1024){await reader.cancel();return json({error:'files'},413);}chunks.push(value);}
    const form=await new Response(new Blob(chunks),{headers:{'Content-Type':req.headers.get('content-type')!}}).formData();
    chunks.length=0;
    if(form.get('website'))return json({success:true}); // Honeypot: never deliver.
    const text=(key:string)=>typeof form.get(key)==='string'?String(form.get(key)).trim():'';
    const name=text('name'),email=text('email'),subject=text('subject'),message=text('message');
    if(name.length<2||name.length>120||email.length>254||!/^\S+@\S+\.\S+$/.test(email)||/[\r\n]/.test(email)||subject.length<3||subject.length>160||/[\r\n]/.test(subject)||message.length<20||message.length>10000||text('consent')!=='yes')return json({error:'invalid'},400);
    const files=form.getAll('files').filter((file):file is File=>file instanceof File&&file.size>0);
    if(files.length>3)return json({error:'files'},400);
    const attachments=[];
    for(const file of files){
      const extension=file.name.split('.').at(-1)?.toLowerCase()||'';
      if(file.size>MAX_FILE||!types[extension]||!validSignature(extension,new Uint8Array(await file.slice(0,512).arrayBuffer())))return json({error:'files'},400);
      attachments.push({file,filename:file.name.replace(/[^\p{L}\p{N}._ -]/gu,'_').slice(-140),mimetype:types[extension]});
    }
    const base=Deno.env.get('SUPABASE_URL'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),key=Deno.env.get('SMTP2GO_API_KEY');
    if(!base||!service||!key)return json({error:'unavailable'},503);
    const ip=req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()||'unknown';
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${service}:${new Date().toISOString().slice(0,13)}:${ip}`));
    const bucket=Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,'0')).join('');
    const reserved=await fetch(`${base}/rest/v1/rpc/reserve_contact_submission`,{method:'POST',headers:{apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'application/json'},body:JSON.stringify({p_key:bucket}),signal:AbortSignal.timeout(10000)});
    if(!reserved.ok)return json({error:'unavailable'},503);
    if(await reserved.json()!==true)return json({error:'rate'},429);
    const payload={sender:Deno.env.get('AUTH_EMAIL_FROM')||'DISBUNK.org <no-reply@disbunk.org>',to:['info@disbunk.org'],subject:`Disbunk contact: ${subject}`,custom_headers:[{header:'Reply-To',value:email}],...brandedEmail({title:'A new contact message',message:`From: ${name}\nReply to: ${email}\n\n${message}`})};
    // Stream one encoded attachment at a time to stay within Edge memory limits.
    const encoder=new TextEncoder();let current=0;
    const body=new ReadableStream({
      start(controller){controller.enqueue(encoder.encode(JSON.stringify(payload).slice(0,-1)+',"attachments":['));},
      async pull(controller){
        if(current>=attachments.length){controller.enqueue(encoder.encode(']}'));controller.close();return;}
        const {file,filename,mimetype}=attachments[current];
        const fileblob=Buffer.from(await file.arrayBuffer()).toString('base64');
        controller.enqueue(encoder.encode((current?',':'')+JSON.stringify({filename,mimetype,fileblob})));current++;
      },
    });
    const response=await fetch('https://api.smtp2go.com/v3/email/send',{
      method:'POST',headers:{'Content-Type':'application/json','X-Smtp2go-Api-Key':key},body,signal:AbortSignal.timeout(30000),
    });
    const result=await response.json().catch(()=>null);
    if(!response.ok||result?.data?.succeeded!==1||result?.data?.failed)return json({error:'unavailable'},502);
    return json({success:true});
  }catch{return json({error:'unavailable'},503);}
});
