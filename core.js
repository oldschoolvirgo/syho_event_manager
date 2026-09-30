export const RATE = 100;
export function invoiceAmounts(hours, discount = 0) {
  const subtotalCents = hours * RATE * 100;
  const discountCents = Math.round(discount * 100);
  if (!Number.isFinite(discount) || discount < 0 ||
      Math.abs(discount * 100 - discountCents) > 0.000001 || discountCents > subtotalCents) {
    throw new RangeError('Enter a discount from $0 to the service amount, with at most two decimal places.');
  }
  return {subtotal: subtotalCents / 100, discount: discountCents / 100, total: (subtotalCents - discountCents) / 100};
}
export function localDate(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export function defaultNumber(date) { return `SYHO-${date.slice(2).replaceAll('-','')}`; }
export function displayDate(value) { const [y,m,d] = value.split('-'); return `${m}/${d}/${y}`; }
export function dueDate(value) { const [y,m,d] = value.split('-').map(Number); const date = new Date(y,m-1,d,12); date.setDate(date.getDate()+5); return localDate(date); }
export const money = value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
export function paymentLines(settings) { return [['Zelle',settings.zelle],['Venmo',settings.venmo],['CashApp',settings.cashapp],['PayPal',settings.paypal]].filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`); }
export function senderLines(settings, address, ein) { return [settings.name, address ? settings.address : settings.city, settings.phone,settings.email,ein && settings.ein ? `EIN: ${settings.ein}` : ''].filter(Boolean); }
// Build a PDF around locally rendered JPEG pages; no uploads or third-party scripts.
export function pdfBytes(pages) {
  const encoder=new TextEncoder(), chunks=[], offsets=[0]; let length=0;
  const push=value=>{const bytes=typeof value==='string'?encoder.encode(value):value;chunks.push(bytes);length+=bytes.length;};
  const object=(id,body)=>{offsets[id]=length;push(`${id} 0 obj\n`);push(body);push('\nendobj\n');};
  push('%PDF-1.4\n');
  object(1,'<< /Type /Catalog /Pages 2 0 R >>');
  object(2,`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] >>`);
  pages.forEach((page,i)=>{
    const id=3+i*3;
    object(id,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 ${id+1} 0 R >> >> /Contents ${id+2} 0 R >>`);
    offsets[id+1]=length;push(`${id+1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`);push(page.bytes);push('\nendstream\nendobj\n');
    const commands='q\n612 0 0 792 0 0 cm\n/Im0 Do\nQ\n';
    object(id+2,`<< /Length ${encoder.encode(commands).length} >>\nstream\n${commands}endstream`);
  });
  const xref=length;push(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  for(const offset of offsets.slice(1))push(`${String(offset).padStart(10,'0')} 00000 n \n`);
  push(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  const result=new Uint8Array(length);let position=0;for(const chunk of chunks){result.set(chunk,position);position+=chunk.length;}return result;
}
