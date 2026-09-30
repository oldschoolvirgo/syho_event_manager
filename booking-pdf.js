import {pdfBytes} from './core.js';

export function makeBookingPdf(blocks, filename) {
  const pages = [];
  let canvas, ctx, y;
  const left = 44, width = 524, bottom = 738;
  function newPage() {
    canvas = document.createElement('canvas');
    canvas.width = 1530; canvas.height = 1980;
    ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.scale(2.5, 2.5);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 612, 792);
    ctx.fillStyle = '#ff4fa3'; ctx.fillRect(0, 0, 306, 5);
    ctx.fillStyle = '#9b7cff'; ctx.fillRect(306, 0, 306, 5);
    y = 42;
  }
  function finish() {
    ctx.font = '9px Inter'; ctx.fillStyle = '#655775';
    ctx.fillText(`Sing Your Heart Out · Booking Confirmation · ${pages.length + 1}`, left, 766);
    const raw = atob(canvas.toDataURL('image/jpeg', .95).split(',')[1]);
    pages.push({width: canvas.width, height: canvas.height, bytes: Uint8Array.from(raw, c => c.charCodeAt(0))});
  }
  function ensure(height) { if (y + height > bottom) { finish(); newPage(); } }
  function font(size, bold) { ctx.font = `${bold ? 'bold ' : ''}${size}px Inter`; }
  function wrap(segments, size, available) {
    const lines = []; let line = [], used = 0;
    const flush = () => { lines.push(line); line = []; used = 0; };
    for (const segment of segments) {
      font(size, segment.bold);
      for (const token of segment.text.split(/(\n|[^\S\n]+|[^\s]+)/u).filter(Boolean)) {
        if (token === '\n') { flush(); continue; }
        const space = /^\s+$/.test(token);
        let tokenWidth = ctx.measureText(token).width;
        if (!space && used + tokenWidth > available && line.length) flush();
        if (space && !line.length) continue;
        if (tokenWidth <= available) {
          line.push({text:token, bold:segment.bold, width:tokenWidth}); used += tokenWidth;
        } else {
          for (const char of token) {
            tokenWidth = ctx.measureText(char).width;
            if (used + tokenWidth > available && line.length) flush();
            line.push({text:char, bold:segment.bold, width:tokenWidth}); used += tokenWidth;
          }
        }
      }
    }
    if (line.length) flush();
    return lines;
  }
  function text(segments, {size=10, gap=7, indent=0, keepNext=0, color='#251b38'} = {}) {
    const lines = wrap(segments, size, width - indent), lineHeight = size * 1.4;
    // Keep a paragraph together whenever it fits on a fresh page.
    ensure(Math.min(lines.length * lineHeight + gap + keepNext, bottom - 42));
    for (const line of lines) {
      ensure(lineHeight);
      let x = left + indent;
      for (const segment of line) {
        font(size, segment.bold); ctx.fillStyle = color;
        ctx.fillText(segment.text, x, y + size); x += segment.width;
      }
      y += lineHeight;
    }
    y += gap;
  }
  const rich = value => value.split('**').map((text, i) => ({text, bold:i % 2 === 1}));
  function blockHeight(block) {
    if (!block) return 0;
    if (block.kind === 'list') return block.items.reduce((sum, item) => sum + wrap([{text:`• ${item}`}],10,width-8).length * 14 + 4, 6);
    if (block.kind === 'paragraph') return wrap(rich(block.text),10,width).length * 14 + 7;
    if (block.label) {
      const size = block.kind === 'total' ? 13 : 10;
      return wrap([{text:`${block.label}: `,bold:true},{text:block.value,bold:block.kind === 'total'}],size,width).length * size * 1.4 + 3;
    }
    return 34;
  }
  newPage();
  for (const [index, block] of blocks.entries()) {
    if (block.kind === 'brand') text([{text:block.text, bold:true}], {size:23, gap:8});
    else if (block.kind === 'title') text([{text:block.text, bold:true}], {size:16, gap:22, keepNext:45});
    else if (block.kind === 'heading') {
      let sectionHeight = 34;
      for (let next = index + 1; next < blocks.length && blocks[next].kind !== 'heading'; next++) sectionHeight += blockHeight(blocks[next]);
      if (sectionHeight < 190) ensure(sectionHeight);
      y += 8;
      text([{text:block.text, bold:true}], {size:11, gap:8, keepNext:Math.min(blockHeight(blocks[index+1]), 150)});
    } else if (block.kind === 'detail' || block.kind === 'total') {
      text([{text:`${block.label}: `, bold:true}, {text:block.value, bold:block.kind === 'total'}], {size:block.kind === 'total' ? 13 : 10, gap:3});
    } else if (block.kind === 'list') {
      ensure(Math.min(blockHeight(block), bottom - 42));
      for (const item of block.items) text([{text:`• ${item}`, bold:false}], {indent:8, gap:4});
      y += 6;
    } else text(rich(block.text));
  }
  finish();
  return new File([pdfBytes(pages)], filename, {type:'application/pdf'});
}
