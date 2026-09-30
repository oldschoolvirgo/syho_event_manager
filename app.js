import {RATE,invoiceAmounts,localDate,defaultNumber,displayDate,dueDate,money,paymentLines,senderLines,pdfBytes} from './core.js';
const $=id=>document.getElementById(id);
const fields=['name','city','phone','email','address','ein','zelle','venmo','cashapp','paypal'];
const storageKey='syho-business-v1';
let settings={}, generated=null, pdfFile=null, revision=0;
const status=message=>{$('status').textContent=message;};
try { const saved=JSON.parse(localStorage.getItem(storageKey)||'{}'); for(const key of fields) settings[key]=typeof saved?.[key]==='string'?saved[key]:''; } catch { status('Browser storage is unavailable. Settings will work for this session.'); }
for(const key of fields)$('settings-form').elements.namedItem(key).value=settings[key]||'';
$('date').value=localDate();$('number').value=defaultNumber($('date').value);
function draft(){return {number:$('number').value.trim(),date:$('date').value,hours:Number($('hours').value),discount:Number($('discount').value),customer:$('customer').value.trim(),address:$('include-address').checked,ein:$('include-ein').checked,settings:{...settings}};}
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(data){
  const s=data.settings;
  const hours=Number.isInteger(data.hours)&&data.hours>0?data.hours:0;
  let amounts;
  try{amounts=invoiceAmounts(hours,data.discount);}catch{amounts=null;}
  const subtotal=money(hours*RATE);
  const total=amounts?money(amounts.total):'—';
  $('discount').max=String(hours*RATE);
  $('estimate').textContent=total;
  $('invoice').innerHTML=`<div class="invoice-head"><div><div class="invoice-brand">Sing Your ❤️‍🔥 Out</div><div class="invoice-tagline">A Fresh Take on Karaoke 🎤</div></div><div class="invoice-title">INVOICE</div></div>
    <div class="invoice-row"><div><div class="invoice-label">From</div><div class="lines">${escape(senderLines(s,data.address,data.ein).join('\n')||'Your business details')}</div></div><div class="invoice-meta-block"><div><span class="invoice-label">Invoice</span> ${escape(data.number||'—')}</div><div><span class="invoice-label">Date</span> ${data.date?displayDate(data.date):'—'}</div><div><span class="invoice-label">Due</span> ${data.date?displayDate(dueDate(data.date)):'—'}</div></div></div>
    <div class="invoice-row customer-row"><div><div class="invoice-label">To</div><div class="lines">${escape(data.customer||'Your client’s name and address')}</div></div><div class="service-for"><div class="invoice-label">For</div>Karaoke Service</div></div>
    <table><thead><tr><th>DESCRIPTION</th><th class="numeric">HOURS</th><th class="numeric">RATE</th><th class="numeric">AMOUNT</th></tr></thead><tbody><tr><td>Karaoke Service</td><td class="numeric">${escape(data.hours||'—')}</td><td class="numeric">$100.00</td><td class="numeric">${subtotal}</td></tr></tbody></table>
    ${amounts?.discount>0?`<div class="discount-summary"><div><span>Subtotal</span><span>${subtotal}</span></div><div><span>Flat discount</span><span>−${money(amounts.discount)}</span></div></div>`:''}
    <div class="total"><span>Total due</span><strong>${total}</strong></div>
    <div class="payment"><div class="invoice-label">Remittance information</div>${paymentLines(s).map(line=>`<p>${escape(line)}</p>`).join('')||'<p>Add your payment details in Settings.</p>'}</div><div class="terms">Total due in 5 days.</div>
    <div class="invoice-footer"><strong>Thank you for your business!</strong><p>Please follow us on Instagram <a href="https://www.instagram.com/singyourheartouthtx/" target="_blank" rel="noopener">@singyourheartouthtx</a></p><p>We specialize in private parties and corporate events.</p></div>`;
  $('setup-hint').hidden=Boolean(settings.name);
}
function invalidate(){revision++;generated=null;pdfFile=null;for(const id of ['save-pdf','share','print'])$(id).disabled=true;$('preview-state').textContent='PREVIEW';render(draft());}
$('invoice-form').addEventListener('input',invalidate);
$('discount').addEventListener('invalid',()=>{$('discounts-panel').open=true;});
$('settings-form').addEventListener('submit',event=>{
  event.preventDefault();for(const key of fields)settings[key]=$('settings-form').elements.namedItem(key).value.trim();
  try{localStorage.setItem(storageKey,JSON.stringify(settings));status('Settings saved on this device.');}catch{status('Settings applied for this session. Your browser could not save them.');}
  invalidate();$('settings-panel').open=false;
});
$('invoice-form').addEventListener('submit',async event=>{
  event.preventDefault();const data=draft();
  if(!data.number||!data.customer||!data.date||!Number.isInteger(data.hours)||data.hours<1||data.hours>1000){status('Enter an invoice number, date, client, and whole hours from 1 to 1,000.');return;}
  try{invoiceAmounts(data.hours,data.discount);}catch(error){status(error.message);return;}
  if(!settings.name||!paymentLines(settings).length||(data.address&&!settings.address)||(data.ein&&!settings.ein)){
    $('settings-panel').open=true;status('Save your name and at least one payment method in Settings. Also add your address or EIN if you chose to include it.');$('settings-panel').scrollIntoView({behavior:'smooth',block:'center'});return;
  }
  const currentRevision=++revision;
  generated=null;pdfFile=null;
  for(const id of ['save-pdf','share','print'])$(id).disabled=true;
  status('Preparing your invoice...');
  try{
    const fonts=await Promise.all([document.fonts.load('400 12px Inter'),document.fonts.load('700 12px Inter')]);
    if(fonts.some(faces=>faces.length===0))throw new Error('Inter unavailable');
    if(currentRevision!==revision)return;
    generated=data;render(data);pdfFile=makePdf(data);
  }catch{
    if(currentRevision!==revision)return;status('PDF generation failed in this browser. You can still use Print to save the invoice as PDF.');$('print').disabled=false;return;}
  $('preview-state').textContent='READY TO SEND';for(const id of ['save-pdf','share','print'])$(id).disabled=false;
  status('Invoice ready. Save the PDF or share it from your device.');
  $('preview-area').scrollIntoView({behavior:'instant',block:'start'});
});
function makePdf(data){
  const amounts=invoiceAmounts(data.hours,data.discount);
  const pages=[];let canvas,ctx,y;
  function newPage(){canvas=document.createElement('canvas');canvas.width=1530;canvas.height=1980;ctx=canvas.getContext('2d');ctx.scale(2.5,2.5);ctx.fillStyle='#fff';ctx.fillRect(0,0,612,792);ctx.fillStyle='#ff4fa3';ctx.fillRect(0,0,306,5);ctx.fillStyle='#9b7cff';ctx.fillRect(306,0,306,5);y=44;}
  function finish(){const raw=atob(canvas.toDataURL('image/jpeg',.95).split(',')[1]);pages.push({width:canvas.width,height:canvas.height,bytes:Uint8Array.from(raw,c=>c.charCodeAt(0))});}
  function ensure(height){if(y+height>744){finish();newPage();}}
  function text(value,{size=11,color='#251b38',bold=false,center=false,width=524,x=44,right=false}={}){
    ctx.font=`${bold?'bold ':''}${size}px Inter`;const lines=[];
    for(const paragraph of String(value).split('\n')){let line='';for(const char of paragraph){if(ctx.measureText(line+char).width>width&&line){lines.push(line);line=char;}else line+=char;}lines.push(line);}
    for(const line of lines){ensure(size*1.5);ctx.font=`${bold?'bold ':''}${size}px Inter`;ctx.fillStyle=color;ctx.textAlign=center?'center':right?'right':'left';ctx.fillText(line,center?306:right?x+width:x,y+size);y+=size*1.5;}
  }
  function gap(n=12){y+=n;}
  function rule(){ensure(12);ctx.strokeStyle='#e6dcf0';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(44,y);ctx.lineTo(568,y);ctx.stroke();gap(12);}
  const label=value=>text(value,{size:9,color:'#655775',bold:true});
  newPage();
  text('INVOICE',{size:25,color:'#251b38',bold:true,x:420,width:148,right:true});y=44;
  text('Sing Your ❤️‍🔥 Out',{size:23,color:'#251b38',bold:true,width:370});
  text('A Fresh Take on Karaoke 🎤',{size:10,color:'#655775'});gap(22);
  const senderTop=y;
  text(`INVOICE: ${data.number}`,{size:10,bold:true,x:350,width:218,right:true});
  text(`DATE: ${displayDate(data.date)}`,{size:10,x:350,width:218,right:true});
  text(`DUE: ${displayDate(dueDate(data.date))}`,{size:10,x:350,width:218,right:true});
  const metaBottom=y;y=senderTop;
  label('FROM');text(senderLines(data.settings,data.address,data.ein).join('\n'),{width:280});
  y=Math.max(y,metaBottom);gap(28);
  const customerTop=y;
  text('FOR',{size:9,color:'#655775',bold:true,x:420,width:148,right:true});
  text('Karaoke Service',{size:11,x:420,width:148,right:true});
  const serviceBottom=y;y=customerTop;
  label('TO');
  // Ensure the first customer lines extend past the service block before paging.
  text(data.customer,{width:350});
  if(pages.length===0)y=Math.max(y,serviceBottom);
  gap(30);
  ensure(amounts.discount>0?170:125);ctx.fillStyle='#f5efff';ctx.fillRect(44,y,524,28);const top=y;y+=8;
  ctx.fillStyle='#251b38';ctx.font='bold 9px Inter';ctx.textAlign='left';ctx.fillText('DESCRIPTION',52,y+9);ctx.textAlign='right';ctx.fillText('HOURS',355,y+9);ctx.fillText('RATE',441,y+9);ctx.fillText('AMOUNT',560,y+9);
  y=top+48;ctx.font='11px Inter';ctx.fillStyle='#251b38';ctx.textAlign='left';ctx.fillText('Karaoke Service',52,y);ctx.textAlign='right';ctx.fillText(String(data.hours),355,y);ctx.fillText('$100.00',441,y);ctx.fillText(money(data.hours*RATE),560,y);y+=16;rule();
  if(amounts.discount>0){
    text(`Subtotal   ${money(amounts.subtotal)}`,{size:11,right:true});
    text(`Flat discount   −${money(amounts.discount)}`,{size:11,right:true});gap(8);
  }
  text(`Total due   ${money(amounts.total)}`,{size:23,color:'#251b38',bold:true,right:true});gap(20);
  label('REMITTANCE INFORMATION');for(const line of paymentLines(data.settings))text(line,{size:10});gap();text('Total due in 5 days.',{size:10,color:'#251b38',bold:true});gap(24);
  ensure(85);rule();text('Thank you for your business!',{size:13,color:'#251b38',bold:true});gap(6);text('Please follow us on Instagram @singyourheartouthtx',{size:10});text('We specialize in private parties and corporate events.',{size:10,color:'#655775'});
  finish();const safeName=data.number.replace(/[^a-zA-Z0-9_-]/g,'_')||'invoice';return new File([pdfBytes(pages)],`${safeName}.pdf`,{type:'application/pdf'});
}
function download(){if(!pdfFile)return;const url=URL.createObjectURL(pdfFile);const a=document.createElement('a');a.href=url;a.download=pdfFile.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);status('PDF ready to save. Your browser may open it first; use its save or share menu.');}
$('save-pdf').addEventListener('click',download);
$('share').addEventListener('click',async()=>{
  if(!pdfFile)return;
  if(navigator.canShare?.({files:[pdfFile]})){
    try{await navigator.share({files:[pdfFile],title:`Invoice ${generated.number}`});status('Invoice handed to your device’s share menu.');}catch(error){if(error.name!=='AbortError'){status('Sharing was unavailable. Use Save PDF, then attach it in your messaging app.');}}
  }else{download();status('File sharing isn’t supported in this browser. Save the PDF, then attach it in WhatsApp, Messages, or email.');}
});
$('print').addEventListener('click',()=>window.print());
render(draft());
