/* Dependency-free, safe SVG renderer for vetted, numerical illustrative plots. */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, text) => {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([name, value]) => node.setAttribute(name, String(value)));
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const fmt = n => {
    if (Math.abs(n) >= 1000) return n.toFixed(0);
    if (Math.abs(n) >= 10) return n.toFixed(1).replace(/\.0$/, '');
    if (Math.abs(n) >= .1 || n === 0) return n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    return n.toPrecision(2);
  };
  function render(plot) {
    if (!plot || !Array.isArray(plot.series)) return null;
    const rows = plot.series.slice(0, 3).map(series => ({name: series.name || '', points: (series.points || []).filter(p =>
      Array.isArray(p) && p.length === 2 && p.every(v => typeof v === 'number' && Number.isFinite(v)))})).filter(s => s.points.length);
    if (!rows.length) return null;
    const panel = document.createElement('figure');
    panel.className = 'generated-plot';
    const title = document.createElement('figcaption');
    title.className = 'plot-title'; title.textContent = plot.title || 'Illustrative graph';
    panel.appendChild(title);
    const all = rows.flatMap(row => row.points);
    let xmin = Math.min(...all.map(p => p[0])), xmax = Math.max(...all.map(p => p[0]));
    let ymin = Math.min(0, ...all.map(p => p[1])), ymax = Math.max(...all.map(p => p[1]));
    if (xmin === xmax) { xmin -= 1; xmax += 1; }
    if (ymin === ymax) { ymin -= 1; ymax += 1; }
    const xpad = (xmax - xmin) * .055, ypad = (ymax - ymin) * .09;
    xmin -= xpad; xmax += xpad; ymin -= ypad; ymax += ypad;
    const width = 760, height = 340;
    const left = 76, right = 20, top = 18, bottom = 62;
    const pw = width - left - right, ph = height - top - bottom;
    const sx = x => left + (x-xmin)/(xmax-xmin)*pw;
    const sy = y => top + (ymax-y)/(ymax-ymin)*ph;
    const svg = el('svg', {viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': `${plot.title || 'Graph'}. ${plot.x_label || 'x'} by ${plot.y_label || 'y'}`, class: 'plot-svg'});
    for (let i=0;i<=5;i++) {
      const xx = left + i*pw/5, yy = top + i*ph/5;
      svg.append(el('line',{x1:xx,y1:top,x2:xx,y2:top+ph,class:'plot-grid'}));
      svg.append(el('line',{x1:left,y1:yy,x2:left+pw,y2:yy,class:'plot-grid'}));
      svg.append(el('text',{x:xx,y:top+ph+24,'text-anchor':'middle',class:'plot-tick'},fmt(xmin+i*(xmax-xmin)/5)));
      svg.append(el('text',{x:left-10,y:yy+4,'text-anchor':'end',class:'plot-tick'},fmt(ymax-i*(ymax-ymin)/5)));
    }
    svg.append(el('line',{x1:left,y1:top,x2:left,y2:top+ph,class:'plot-axis'}));
    svg.append(el('line',{x1:left,y1:top+ph,x2:left+pw,y2:top+ph,class:'plot-axis'}));
    svg.append(el('text',{x:left+pw/2,y:height-12,'text-anchor':'middle',class:'plot-label'},plot.x_label || 'x'));
    const ylab=el('text',{x:19,y:top+ph/2,transform:`rotate(-90, 19, ${top+ph/2})`,'text-anchor':'middle',class:'plot-label'},plot.y_label || 'Value');
    svg.append(ylab);
    const palette = ['#007FA3','#1E3765','#6D247A'];
    rows.forEach((series,index) => {
      const color = palette[index%palette.length];
      const pts = (plot.type === 'line' || ['normal','t','chi_square','f'].includes(plot.type))
        ? [...series.points].sort((a,b)=>a[0]-b[0]) : series.points;
      if (plot.type === 'bar') {
        const ux = [...new Set(pts.map(p => p[0]))].sort((a,b)=>a-b);
        const gap = ux.length > 1 ? Math.min(...ux.slice(1).map((x,i)=>x-ux[i])) : (xmax-xmin)/5;
        const bw = Math.max(3, Math.min(48, gap/(xmax-xmin)*pw*.78/rows.length));
        pts.forEach(([x,y]) => {
          const zero = sy(0), v = sy(y);
          svg.append(el('rect',{x:sx(x)-bw*rows.length/2+index*bw,y:Math.min(zero,v),width:bw,height:Math.max(1,Math.abs(v-zero)),fill:color,opacity:'.87',rx:1.5}));
        });
      } else if (plot.type === 'scatter') {
        pts.forEach(([x,y]) => svg.append(el('circle',{cx:sx(x),cy:sy(y),r:4.3,fill:color,opacity:'.82'})));
      } else {
        const path = pts.map(([x,y],j)=>`${j?'L':'M'}${sx(x).toFixed(2)} ${sy(y).toFixed(2)}`).join(' ');
        svg.append(el('path',{d:path,fill:'none',stroke:color,'stroke-width':3,'stroke-linejoin':'round','stroke-linecap':'round'}));
      }
    });
    panel.appendChild(svg);
    if (rows.length > 1) {
      const legend = document.createElement('div'); legend.className='plot-legend';
      rows.forEach((row,i)=> { const entry=document.createElement('span'); const swatch=document.createElement('i');swatch.style.background=['#007FA3','#1E3765','#6D247A'][i];entry.append(swatch,document.createTextNode(row.name));legend.append(entry); });
      panel.appendChild(legend);
    }
    const note = document.createElement('p'); note.className = 'plot-note';
    note.textContent = `${plot.note || 'Illustrative data.'} · Newly generated; not from the STA258 ebook.`;
    panel.appendChild(note);
    return panel;
  }
  window.STA258Plots = {render};
})();
