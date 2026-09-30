import {RATE, money, displayDate} from './core.js';

export function timeMinutes(value) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new RangeError('Enter a valid start and end time.');
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}
export function bookingAmounts(start, end, discount = 0, travel = 0) {
  const startMinutes = timeMinutes(start), endMinutes = timeMinutes(end);
  if (startMinutes === endMinutes) throw new RangeError('Start and end times must be different.');
  const minutes = (endMinutes - startMinutes + 1440) % 1440;
  const cents = (value, label) => {
    if (!Number.isFinite(value) || value < 0 || value > 1000000 || Math.abs(value * 100 - Math.round(value * 100)) > 0.000001) {
      throw new RangeError(`Enter a ${label} between $0 and $1,000,000 with at most two decimal places.`);
    }
    return Math.round(value * 100);
  };
  const subtotalCents = Math.round(minutes * RATE * 100 / 60);
  const discountCents = cents(discount, 'flat discount'), travelCents = cents(travel, 'travel fee');
  if (discountCents > subtotalCents + travelCents) throw new RangeError('The flat discount cannot exceed the service amount plus travel fee.');
  return {minutes, hours: minutes / 60, overnight: endMinutes < startMinutes, subtotal: subtotalCents / 100,
    discount: discountCents / 100, travel: travelCents / 100, total: (subtotalCents - discountCents + travelCents) / 100};
}
export function displayTime(value) {
  if (!value) return '—';
  const minutes = timeMinutes(value), hour = Math.floor(minutes / 60);
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}
export function durationLabel(minutes) {
  const hours = Math.floor(minutes / 60), remaining = minutes % 60;
  return [hours ? `${hours} ${hours === 1 ? 'hour' : 'hours'}` : '', remaining ? `${remaining} ${remaining === 1 ? 'minute' : 'minutes'}` : ''].filter(Boolean).join(' ');
}
// The same document blocks feed the HTML preview and the downloadable PDF.
// Double asterisks mark the emphasis supplied in the booking wording.
export function bookingBlocks(data, amounts) {
  const blocks = [];
  const p = text => blocks.push({kind:'paragraph', text});
  const heading = text => blocks.push({kind:'heading', text});
  const detail = (label, value, kind = 'detail') => blocks.push({kind, label, value: value || '—'});
  blocks.push({kind:'brand', text:'SING YOUR ❤️‍🔥 OUT'}, {kind:'title', text:'Karaoke Service Booking Confirmation'});
  p('Thank you for choosing **Sing Your Heart Out**! This confirmation summarizes the details of your upcoming karaoke event and helps ensure that we are all on the same page before the event.');
  p('Please review the information below and let me know as soon as possible if any event details need to be corrected or changed.');
  p('By confirming this booking, we acknowledge that the event details, pricing, requirements, and policies below accurately reflect our understanding of the scheduled karaoke service.');
  p('Thank you for choosing **Sing Your ❤️‍🔥 Out**. I look forward to making your event a great one!');
  heading('EVENT DETAILS');
  detail('Client / Organization', data.organization);
  detail('Primary Contact', data.contact);
  detail('Contact Phone', data.phone);
  detail('Event Date', data.date ? displayDate(data.date) : '—');
  detail('Location / Venue', data.venue);
  detail('Venue Address', data.address);
  if (data.monitor) detail('Lyrics Monitor', 'Sing Your Heart Out will provide a lyrics monitor for this event.');
  detail('Setup / Access Time', displayTime(data.setup));
  detail('Start Time', displayTime(data.start));
  detail('End Time', `${displayTime(data.end)}${amounts?.overnight ? ' (next day)' : ''}`);
  detail('Scheduled Hours', amounts ? durationLabel(amounts.minutes) : '—');
  detail('Hourly Rate', money(RATE));
  if (data.includeDiscount) detail('Flat Discount', amounts ? `−${money(amounts.discount)}` : '—');
  if (data.includeTravel) detail('Travel Fee', amounts ? money(amounts.travel) : '—');
  detail('Estimated Total', amounts ? money(amounts.total) : '—', 'total');
  heading('VENUE & SETUP REQUIREMENTS');
  p('The client or venue must provide:');
  blocks.push({kind:'list', items:['Reliable Wi-Fi internet access', 'Access to electrical outlet(s) reasonably close to the performance area', 'A suitable area for the safe setup and operation of karaoke equipment']});
  heading('ADDITIONAL SERVICE TIME');
  p('The booking covers karaoke service through the scheduled end time listed above.');
  p('If the client would like to extend the event beyond the scheduled end time, **additional service may be added in one-hour increments at the standard hourly rate of $100 per hour**, subject to availability and venue operating hours.');
  p("Additional service time will only be added with the client's approval. Requests for shorter extensions, such as an additional 15 or 30 minutes, are treated as a one-hour extension.");
  p('A song that begins before the scheduled end time will be allowed to finish without triggering an additional hour. Once the final song is complete, service concludes unless the client has approved an additional hour of service.');
  heading('EQUIPMENT & EVENT POLICY');
  p('Sing Your Heart Out uses professional audio, wireless microphones, computers, and related electronic equipment that is both valuable and sensitive.');
  p("For the safety of guests and equipment, **Sing Your Heart Out does not provide karaoke services for children's parties or events where lots of children may be present.**");
  p('The client and venue are asked to help provide a safe environment for the equipment and to prevent guests from intentionally mishandling, dropping, tampering with, or otherwise damaging equipment.');
  heading('PAYMENT');
  p('Payment is due at the conclusion of service unless other arrangements have been agreed upon in advance.');
  p('All outstanding balances must be paid **no later than five (5) calendar days following the event**.');
  heading('CANCELLATIONS & RESCHEDULING');
  p('Cancellations or requests to reschedule should be made **at least 24 hours before the scheduled start time**.');
  p('Requests made at least 24 hours in advance may be rescheduled to another available date without penalty.');
  p('**Any deposit paid toward the booking is non-refundable if the event is cancelled less than 24 hours before the scheduled start time.**');
  p("Requests to reschedule with less than 24 hours' notice may require a new deposit. Any new event date is subject to availability.");
  p('Any non-refundable expenses specifically incurred for the event may also remain the responsibility of the client.');
  heading('TRAVEL');
  p('Events requiring significant travel outside the normal service area may be subject to an additional travel fee.');
  p('Any applicable travel fee will be disclosed and agreed upon prior to confirmation of the booking and will be included in the estimated total above.');
  return blocks;
}
