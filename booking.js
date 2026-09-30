import {money} from './core.js';
import {bookingAmounts, bookingBlocks, durationLabel} from './booking-core.js';
import {makeBookingPdf} from './booking-pdf.js';

const $ = id => document.getElementById(id);
const form = $('booking-form');
let revision = 0, pdfFile = null;
const status = message => { $('status').textContent = message; };
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const rich = value => value.split('**').map((part, i) => i % 2 ? `<strong>${escape(part)}</strong>` : escape(part)).join('');
function draft() {
  const data = {};
  for (const id of ['organization', 'contact', 'phone', 'date', 'venue', 'address', 'setup', 'start', 'end']) data[id] = $(id).value.trim();
  data.monitor = $('monitor').checked;
  data.includeDiscount = $('include-discount').checked;
  data.includeTravel = $('include-travel').checked;
  data.discount = data.includeDiscount ? Number($('discount').value) : 0;
  data.travel = data.includeTravel ? Number($('travel').value) : 0;
  return data;
}
function render(data, amounts) {
  $('estimate').textContent = amounts ? money(amounts.total) : '—';
  $('duration').textContent = `Scheduled hours: ${amounts ? durationLabel(amounts.minutes) + (amounts.overnight ? ' · Ends next day' : '') : '—'}`;
  const blocks = bookingBlocks(data, amounts);
  $('confirmation').innerHTML = blocks.map(block => {
    if (block.kind === 'brand') return `<div class="invoice-brand">${escape(block.text)}</div>`;
    if (block.kind === 'title') return `<h2>${escape(block.text)}</h2>`;
    if (block.kind === 'heading') return `<h3>${escape(block.text)}</h3>`;
    if (block.kind === 'list') return `<ul>${block.items.map(item => `<li>${escape(item)}</li>`).join('')}</ul>`;
    if (block.kind === 'detail' || block.kind === 'total') return `<p class="booking-detail${block.kind === 'total' ? ' booking-total' : ''}"><strong>${escape(block.label)}:</strong> ${escape(block.value)}</p>`;
    return `<p>${rich(block.text)}</p>`;
  }).join('');
  return blocks;
}
function invalidate() {
  revision++; pdfFile = null;
  for (const id of ['save-pdf', 'share', 'print']) $(id).disabled = true;
  $('preview-state').textContent = 'PREVIEW';
  for (const id of ['discount', 'travel']) {
    const enabled = $(`include-${id}`).checked;
    $(`${id}-field`).hidden = !enabled; $(id).disabled = !enabled;
    $(`include-${id}`).setAttribute('aria-expanded', String(enabled));
  }
  for (const id of ['contact', 'phone', 'address', 'end', 'discount']) $(id).setCustomValidity('');
  const data = draft(); let amounts = null, error = '';
  if (data.start && data.end) {
    try { amounts = bookingAmounts(data.start, data.end, data.discount, data.travel); }
    catch (e) { error = e.message; }
  }
  render(data, amounts); status(error);
}
form.addEventListener('input', invalidate);
form.addEventListener('submit', async event => {
  event.preventDefault();
  const data = draft();
  for (const id of ['contact', 'phone', 'address']) $(id).setCustomValidity(data[id] ? '' : 'Please complete this field.');
  if (!form.reportValidity()) return;
  let amounts;
  try { amounts = bookingAmounts(data.start, data.end, data.discount, data.travel); }
  catch (error) { status(error.message); return; }
  const currentRevision = ++revision;
  pdfFile = null;
  for (const id of ['save-pdf', 'share', 'print']) $(id).disabled = true;
  $('preview-state').textContent = 'PREPARING';
  const blocks = render(data, amounts);
  status('Preparing your booking confirmation…');
  try {
    const fonts = await Promise.all([document.fonts.load('400 12px Inter'), document.fonts.load('700 12px Inter')]);
    if (fonts.some(faces => faces.length === 0)) throw new Error('Inter unavailable');
    if (currentRevision !== revision) return;
    const name = data.contact.replace(/[^a-zA-Z0-9_-]/g, '_') || 'client';
    pdfFile = makeBookingPdf(blocks, `SYHO-Booking-${data.date}-${name}.pdf`);
  } catch {
    if (currentRevision !== revision) return;
    $('print').disabled = false; $('preview-state').textContent = 'PRINT READY';
    status('PDF generation failed in this browser. Use Print to save your confirmation as PDF.'); return;
  }
  for (const id of ['save-pdf', 'share', 'print']) $(id).disabled = false;
  $('preview-state').textContent = 'READY TO SEND';
  status('Confirmation ready. Save the PDF or share it from your device.');
  $('preview-area').scrollIntoView({behavior:'instant', block:'start'});
});
function download() {
  if (!pdfFile) return;
  const url = URL.createObjectURL(pdfFile), a = document.createElement('a');
  a.href = url; a.download = pdfFile.name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  status('PDF ready to save. Your browser may open it first; use its save or share menu.');
}
$('save-pdf').addEventListener('click', download);
$('share').addEventListener('click', async () => {
  if (!pdfFile) return;
  if (navigator.canShare?.({files:[pdfFile]})) {
    try { await navigator.share({files:[pdfFile], title:'Karaoke Service Booking Confirmation'}); status('Confirmation handed to your device’s share menu.'); }
    catch (error) { if (error.name !== 'AbortError') status('Sharing was unavailable. Use Save PDF, then attach it in your messaging app.'); }
  } else { download(); status('File sharing isn’t supported in this browser. Save the PDF, then attach it in your messaging app.'); }
});
$('print').addEventListener('click', () => window.print());
invalidate();
