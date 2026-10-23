// @vitest-environment node
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';
import ts from 'typescript';
import {expect,it,vi} from 'vitest';
const source=readFileSync('supabase/functions/_shared/email.ts','utf8').replace(/export function/g,'function')+'\n'+readFileSync('supabase/functions/contact-message/index.ts','utf8').replace(/^import .*;\r?\n/gm,'');
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
function app({reserved=true,provider=true}={}){
  let handler:(request:Request)=>Promise<Response>;
  let payload:Record<string,unknown>;
  const send=vi.fn(async(url:string,options?:RequestInit)=>{if(url.includes('/rpc/'))return Response.json(reserved);payload=JSON.parse(await new Response(options?.body).text());return Response.json({data:{succeeded:provider?1:0,failed:provider?0:1}});});
  runInNewContext(code,{Deno:{env:{get:(key:string)=>key==='SUPABASE_URL'?'https://test.supabase.co':'test-only-secret'},serve:(fn:typeof handler)=>handler=fn},Buffer,Request,Response,File,Blob,Uint8Array,TextDecoder,TextEncoder,crypto:webcrypto,ReadableStream,AbortSignal,fetch:send});
  return {send,payload:()=>payload,request:(files:File[]=[],extra:Record<string,string>={},origin='https://disbunk.org')=>{
    const form=new FormData();for(const [key,value] of Object.entries({name:'Test researcher',email:'reply@example.org',subject:'Test contact form',message:'A test message for automated validation only.',consent:'yes',...extra}))form.set(key,value);
    for(const file of files)form.append('files',file);
    return handler!(new Request('https://test/contact-message',{method:'POST',headers:{origin},body:form}));
  }};
}
const pdf=(name='source.pdf',size=40)=>new File(['%PDF-1.7\n',new Uint8Array(size)],name,{type:'application/pdf'});
it('rejects unknown origins and honeypots without contacting email delivery',async()=>{
  const service=app();expect((await service.request([],{},'https://untrusted.example')).status).toBe(403);
  expect((await service.request([],{website:'spam'})).status).toBe(200);expect(service.send).not.toHaveBeenCalled();
});
it('rejects a fourth attachment and files over 10 MB before sending',async()=>{
  const service=app();expect((await service.request([pdf(),pdf(),pdf(),pdf()])).status).toBe(400);
  expect((await service.request([pdf('large.pdf',10*1024*1024)])).status).toBe(400);expect(service.send).not.toHaveBeenCalled();
});
it('rejects a forged image, unsupported file and missing consent',async()=>{
  const service=app();expect((await service.request([new File(['not an image'],'fake.png')])).status).toBe(400);
  expect((await service.request([new File(['<svg/>'],'icon.svg')])).status).toBe(400);
  expect((await service.request([],{consent:''})).status).toBe(400);expect(service.send).not.toHaveBeenCalled();
});
it('routes three validated attachments only to the private project inbox and escapes message HTML',async()=>{
  const service=app();expect((await service.request([pdf('a.pdf'),pdf('b.pdf'),new File(['Research notes'],'notes.txt')],{message:'A source includes <script>alert(1)</script> and must stay escaped.'})).status).toBe(200);
  const payload=service.payload();
  expect(payload.to).toEqual(['info@disbunk.org']);expect(payload.attachments).toHaveLength(3);
  expect(payload.custom_headers).toEqual([{header:'Reply-To',value:'reply@example.org'}]);expect(payload.html_body).toContain('&lt;script&gt;');expect(payload.html_body).not.toContain('<script>');
});
it('fails closed on the durable rate limit and reports provider rejection',async()=>{
  const limited=app({reserved:false});expect((await limited.request()).status).toBe(429);expect(limited.send).toHaveBeenCalledTimes(1);
  expect((await app({provider:false}).request()).status).toBe(502);
});

