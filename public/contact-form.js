(() => {
  const allowed=/\.(pdf|jpe?g|png|gif|webp|docx?|odt|txt|rtf)$/i;
  function initialize(){
    for(const form of document.querySelectorAll('[data-contact-form]')){
      if(form.dataset.enhanced)continue;form.dataset.enhanced='true';
      const input=form.querySelector('input[type="file"]'),list=form.querySelector('[data-contact-files]'),status=form.querySelector('[data-contact-status]'),button=form.querySelector('button[type="submit"]');
      let files=[];
      const show=(message,error=false)=>{status.textContent=message;status.classList.toggle('text-destructive',error);};
      function render(){
        list.replaceChildren();
        files.forEach((file,index)=>{
          const item=document.createElement('li');item.className='flex items-center justify-between gap-3 rounded-lg border border-border p-3';
          const label=document.createElement('span');label.className='min-w-0 break-all';label.textContent=`${file.name} · ${(file.size/1024/1024).toFixed(1)} MB`;
          const remove=document.createElement('button');remove.type='button';remove.className='shrink-0 rounded-md px-2 py-2 font-semibold text-primary';remove.textContent='×';remove.setAttribute('aria-label',`${form.dataset.remove}: ${file.name}`);remove.onclick=()=>{files.splice(index,1);render();};
          item.append(label,remove);list.append(item);
        });
      }
      input.addEventListener('change',()=>{
        const selected=[...input.files];input.value='';
        if(files.length+selected.length>3||selected.some(file=>file.size===0||file.size>10*1024*1024||!allowed.test(file.name))){show(form.dataset.filesError,true);return;}
        files.push(...selected);show('');render();
      });
      form.addEventListener('submit',async event=>{
        event.preventDefault();if(button.disabled)return;
        if(!form.reportValidity()){show(form.dataset.invalid,true);return;}
        if(files.length>3||files.some(file=>file.size>10*1024*1024||!allowed.test(file.name))){show(form.dataset.filesError,true);return;}
        const data=new FormData(form);data.delete('files');files.forEach(file=>data.append('files',file));
        button.disabled=true;button.textContent=form.dataset.sending;form.setAttribute('aria-busy','true');show('');
        try{
          const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),60000);
          let response;try{response=await fetch(form.action,{method:'POST',body:data,credentials:'omit',signal:controller.signal});}finally{clearTimeout(timeout);}
          const result=await response.json();
          if(!response.ok||!result.success)throw new Error(result.error||'unavailable');
          form.reset();files=[];render();show(form.dataset.success);status.focus();
        }catch(error){const key=error instanceof Error?error.message:'unavailable';show(key==='files'?form.dataset.filesError:key==='rate'?form.dataset.rate:key==='invalid'?form.dataset.invalid:form.dataset.unavailable,true);status.focus();}
        finally{button.disabled=false;button.textContent=form.dataset.send;form.removeAttribute('aria-busy');}
      });
    }
  }
  document.addEventListener('disbunk-contact-ready',initialize);initialize();
})();
