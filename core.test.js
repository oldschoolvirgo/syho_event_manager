import test from 'node:test';
import assert from 'node:assert/strict';
import {invoiceAmounts,localDate,defaultNumber,dueDate,displayDate,senderLines,paymentLines,pdfBytes} from './core.js';
test('flat discounts preserve the service amount and subtract once, using cents',()=>{
  assert.deepEqual(invoiceAmounts(3,50),{subtotal:300,discount:50,total:250});
  assert.equal(invoiceAmounts(3).total,300);
  assert.equal(invoiceAmounts(3,50.25).total,249.75);
  assert.equal(invoiceAmounts(3,300).total,0);
  for(const discount of [-1,300.01,0.001,NaN,Infinity])assert.throws(()=>invoiceAmounts(3,discount),RangeError);
});
test('dates use local calendar and cross month, leap day, and year boundaries',()=>{
  assert.equal(localDate(new Date(2026,8,7,23)), '2026-09-07');
  assert.equal(defaultNumber('2026-09-07'),'SYHO-260907');
  assert.equal(dueDate('2026-12-29'),'2027-01-03');
  assert.equal(dueDate('2028-02-25'),'2028-03-01');
  assert.equal(displayDate('2026-09-07'),'09/07/2026');
});
test('optional identifiers are omitted unless explicitly enabled',()=>{
  const s={name:'Example',city:'City',address:'Private address',ein:'Private EIN',zelle:'Example payment'};
  assert.deepEqual(senderLines(s,false,false),['Example','City']);
  assert.deepEqual(senderLines(s,true,true),['Example','Private address','EIN: Private EIN']);
  assert.deepEqual(paymentLines(s),['Zelle: Example payment']);
});
test('PDF byte offsets resolve to their objects across multiple binary image pages',()=>{
  const bytes=pdfBytes([1,2].map(()=>({width:10,height:10,bytes:new Uint8Array([255,216,255,217])})));
  const source=new TextDecoder('latin1').decode(bytes);
  assert.ok(source.startsWith('%PDF-1.4'));
  assert.match(source,/\/Count 2/);
  const xref=Number(source.match(/startxref\n(\d+)/)[1]);
  assert.equal(source.slice(xref,xref+4),'xref');
  const entries=source.slice(xref).split('\n').slice(3,11);
  entries.forEach((entry,index)=>assert.ok(source.slice(Number(entry.slice(0,10))).startsWith(`${index+1} 0 obj`)));
});
