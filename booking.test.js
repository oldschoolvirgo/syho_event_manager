import test from 'node:test';
import assert from 'node:assert/strict';
import {bookingAmounts, bookingBlocks, displayTime, durationLabel} from './booking-core.js';

test('booking pricing includes travel, discounts, partial hours and overnight events', () => {
  assert.equal(bookingAmounts('19:00', '21:30', 25, 40).total, 265);
  const overnight = bookingAmounts('21:00', '00:00');
  assert.equal(overnight.hours, 3); assert.equal(overnight.overnight, true);
  assert.equal(bookingAmounts('23:50', '00:10').total, 33.33);
  assert.equal(bookingAmounts('09:00', '10:00', 110, 10).total, 0);
  assert.equal(durationLabel(150), '2 hours 30 minutes');
  assert.equal(displayTime('00:00'), '12:00 AM');
  assert.equal(displayTime('12:00'), '12:00 PM');
  for (const times of [['','12:00'], ['25:00','12:00'], ['12:60','13:00'], ['12:00','12:00']]) assert.throws(() => bookingAmounts(...times));
  for (const amount of [-1, NaN, Infinity, 1.001, 1000001]) {
    assert.throws(() => bookingAmounts('09:00','10:00', amount));
    assert.throws(() => bookingAmounts('09:00','10:00', 0, amount));
  }
  assert.throws(() => bookingAmounts('09:00','10:00', 110.01, 10));
});

test('confirmation keeps policy wording and includes only enabled options', () => {
  const data = {date:'2026-10-02', start:'21:00', end:'00:00', setup:'20:00'};
  const amounts = bookingAmounts(data.start, data.end, 25, 40);
  let blocks = bookingBlocks(data, amounts);
  assert.ok(!blocks.some(b => ['Lyrics Monitor','Flat Discount','Travel Fee'].includes(b.label)));
  assert.equal(blocks.find(b => b.label === 'End Time').value, '12:00 AM (next day)');
  data.monitor = data.includeDiscount = data.includeTravel = true;
  blocks = bookingBlocks(data, amounts);
  assert.equal(blocks.find(b => b.label === 'Lyrics Monitor').value, 'Sing Your Heart Out will provide a lyrics monitor for this event.');
  assert.equal(blocks.find(b => b.label === 'Estimated Total').value, '$315.00');
  assert.deepEqual(blocks.filter(b => b.kind === 'heading').map(b => b.text), ['EVENT DETAILS', 'VENUE & SETUP REQUIREMENTS', 'ADDITIONAL SERVICE TIME', 'EQUIPMENT & EVENT POLICY', 'PAYMENT', 'CANCELLATIONS & RESCHEDULING', 'TRAVEL']);
  assert.ok(blocks.some(b => b.text?.includes('five (5) calendar days')));
  assert.ok(blocks.some(b => b.text?.includes('A song that begins before the scheduled end time')));
});

test('booking UI escapes client text, disables hidden fees, generates multipage PDF and invalidates edits', async () => {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {value:'', checked:false, disabled:true, handlers:{},
      addEventListener(name, handler) { this.handlers[name] = handler; },
      setAttribute() {}, setCustomValidity(value) { this.validationMessage = value; },
      reportValidity() { return true; }, scrollIntoView() {}});
    return elements.get(id);
  }
  const drawn = [], fonts = [];
  const context = {scale(){}, fillRect(){}, fillText(text,x,y){assert.ok(y < 792); drawn.push(text); fonts.push(this.font);}, measureText:text=>({width:text.length * 5})};
  globalThis.document = {getElementById:element, fonts:{load:async()=>[{}]}, createElement:()=>({getContext:()=>context, toDataURL:()=>`data:image/jpeg;base64,${Buffer.from([255,216,255,217]).toString('base64')}`})};
  let shared;
  Object.defineProperty(globalThis, 'navigator', {configurable:true, value:{canShare:()=>true, share:async data=>{shared=data;}}});
  const fire = async (id, event) => element(id).handlers[event]({preventDefault(){}});
  await import('./booking.js');
  for (const [id,value] of Object.entries({contact:'<img src=x onerror=alert(1)>', phone:'713-555-0100', date:'2026-10-02', address:'123 Example Street', setup:'20:00', start:'21:00', end:'00:00', discount:'25', travel:'40'})) element(id).value = value;
  element('include-discount').checked = element('include-travel').checked = element('monitor').checked = true;
  await fire('booking-form','input');
  assert.equal(element('estimate').textContent, '$315.00');
  assert.ok(element('confirmation').innerHTML.includes('&lt;img'));
  assert.ok(!element('confirmation').innerHTML.includes('<img'));
  await fire('booking-form','submit');
  assert.equal(element('save-pdf').disabled, false);
  await fire('share','click');
  const pdf = await shared.files[0].text();
  assert.match(pdf, /^%PDF-1.4/);
  assert.ok(Number(pdf.match(/\/Count (\d+)/)[1]) >= 2);
  assert.ok(fonts.some(font=>font.startsWith('bold')));
  assert.ok(drawn.join('').includes('CANCELLATIONS'));
  element('include-discount').checked = element('include-travel').checked = element('monitor').checked = false;
  element('travel').value = '-999';
  await fire('booking-form','input');
  assert.equal(element('save-pdf').disabled, true);
  assert.equal(element('travel').disabled, true);
  assert.equal(element('estimate').textContent, '$300.00');
  assert.ok(!element('confirmation').innerHTML.includes('Lyrics Monitor:'));
  document.fonts.load = async()=>{throw new Error('Unavailable');};
  await fire('booking-form','submit');
  assert.equal(element('print').disabled, false);
  assert.equal(element('save-pdf').disabled, true);
  const pending = [];
  document.fonts.load = ()=>new Promise(resolve=>pending.push(resolve));
  const generating = fire('booking-form','submit');
  element('end').value = '01:00'; await fire('booking-form','input');
  pending.forEach(resolve=>resolve([{}])); await generating;
  assert.equal(element('save-pdf').disabled, true);
  assert.equal(element('estimate').textContent, '$400.00');
});
