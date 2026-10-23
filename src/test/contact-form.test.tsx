import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {ContactForm} from '@/components/ContactForm';
afterEach(()=>{cleanup();document.querySelectorAll('script[src="/contact-form.js"]').forEach(script=>script.remove());});
function setup(ok=true){
  render(<ContactForm language="sq"/>);
  const send=vi.fn(async()=>({ok,json:async()=>ok?{success:true}:{error:'rate'}}));
  runInNewContext(readFileSync('public/contact-form.js','utf8'),{document,FormData,AbortController,setTimeout,clearTimeout,Error,fetch:send});
  const input=screen.getByLabelText('Bashkëngjitje (opsionale)');
  return {send,input,select:(files:File[])=>fireEvent.change(input,{target:{files}})};
}
it('limits selection to three files, rejects oversized files and lets a visitor remove a file',()=>{
  const form=setup();
  const file=(name:string)=>new File(['%PDF-1.7'],name,{type:'application/pdf'});
  form.select([file('a.pdf'),file('b.pdf'),file('c.pdf'),file('d.pdf')]);
  expect(screen.getByRole('status')).toHaveTextContent('deri në 3 skedarë');
  expect(screen.queryByRole('button',{name:/Hiq skedarin:/})).not.toBeInTheDocument();
  form.select([file('a.pdf'),file('b.pdf'),file('c.pdf')]);
  expect(screen.getAllByRole('button',{name:/Hiq skedarin:/})).toHaveLength(3);
  fireEvent.click(screen.getByRole('button',{name:'Hiq skedarin: b.pdf'}));
  expect(screen.getAllByRole('button',{name:/Hiq skedarin:/})).toHaveLength(2);
  const large=file('large.pdf');Object.defineProperty(large,'size',{value:10*1024*1024+1});
  form.select([large]);expect(screen.getByRole('status')).toHaveTextContent('10 MB');expect(form.send).not.toHaveBeenCalled();
});
it('keeps the message and files when delivery fails and announces a translated error',async()=>{
  const form=setup(false);
  fireEvent.change(screen.getByLabelText('Emri dhe mbiemri'),{target:{value:'Test researcher'}});
  fireEvent.change(screen.getByLabelText('Email-i juaj'),{target:{value:'test@example.org'}});
  fireEvent.change(screen.getByLabelText('Tema'),{target:{value:'Research question'}});
  fireEvent.change(screen.getByLabelText('Mesazhi'),{target:{value:'A sufficiently long message for automated validation.'}});
  fireEvent.click(screen.getByRole('checkbox'));
  form.select([new File(['Notes'],'notes.txt',{type:'text/plain'})]);
  fireEvent.submit(screen.getByRole('button',{name:'Dërgo mesazhin'}).closest('form')!);
  await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Provoni përsëri më vonë'));
  expect(screen.getByLabelText('Mesazhi')).toHaveValue('A sufficiently long message for automated validation.');
  expect(screen.getByRole('button',{name:'Hiq skedarin: notes.txt'})).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Dërgo mesazhin'})).not.toBeDisabled();
});
