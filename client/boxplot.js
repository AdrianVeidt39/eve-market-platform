(function(global){
  const Chart = global.Chart;
  if(!Chart){
    if(typeof logError === 'function') logError('Chart.js not found');
    else if(typeof console !== 'undefined' && console.error) console.error('Chart.js not found');
    return;
  }
  const {BarController, elements:{BarElement}} = Chart;

  class BoxAndWhiskers extends BarElement {
    draw(ctx){
      const v = this;
      const b = v.box;
      if(!b){
        return;
      }
      ctx.save();
      ctx.fillStyle = v.options.backgroundColor;
      ctx.strokeStyle = v.options.borderColor;
      const whiskerWidth = v.options.borderWidth;
      ctx.lineWidth = whiskerWidth;
      const align = p => Math.round(p) + 0.5;
      const y = v.y;
      const height = v.height;
      const half = Math.min(height / 4, 4);
      const y0 = align(y);
      const ymin = align(y - half);
      const ymax = align(y + half);
      const xmin = align(b.min);
      const xq1 = align(b.q1);
      const xmed = align(b.median);
      const xq3 = align(b.q3);
      const xmax = align(b.max);

      if(xmin === xmax && xmin === xq1 && xmin === xmed && xmin === xq3){
        const x = xmin;
        ctx.beginPath();
        ctx.moveTo(align(x - half), ymin);
        ctx.lineTo(align(x + half), ymax);
        ctx.moveTo(align(x - half), ymax);
        ctx.lineTo(align(x + half), ymin);
        ctx.stroke();
        ctx.restore();
        return;
      }

      // whisker line
      ctx.beginPath();
      ctx.moveTo(xmin, y0);
      ctx.lineTo(xmax, y0);
      ctx.stroke();

      // min/max caps
      ctx.beginPath();
      ctx.moveTo(xmin, ymin);
      ctx.lineTo(xmin, ymax);
      ctx.moveTo(xmax, ymin);
      ctx.lineTo(xmax, ymax);
      ctx.stroke();

      // q1-q3 box (outline only)
      const boxHeight = Math.max(2, half * 2);
      const top = align(y0 - boxHeight / 2);
      ctx.beginPath();
      ctx.strokeStyle = v.options.borderColor;
      ctx.lineWidth = v.options.borderWidth;
      ctx.rect(xq1, top, xq3 - xq1, boxHeight);
      ctx.stroke();

      // median line
      ctx.beginPath();
      ctx.strokeStyle = v.options.medianColor || v.options.borderColor;
      ctx.lineWidth = v.options.borderWidth;
      ctx.moveTo(xmed, top);
      ctx.lineTo(xmed, top + boxHeight);
      ctx.stroke();

      ctx.restore();
    }
  }
  BoxAndWhiskers.id = 'boxandwhiskers';
  BoxAndWhiskers.defaults = Object.assign({}, BarElement.defaults, {
    borderWidth: 1,
    borderColor: '#fff',
    medianColor: '#fff',
    quartileColor: '#fff'
  });

  class BoxPlotController extends BarController {
    static id = 'boxplot';
    static defaults = Object.assign({}, BarController.defaults);
    static overrides = Object.assign({}, BarController.overrides);

    parse(start, count){
      const meta = this._cachedMeta;
      const data = this.getDataset().data;
      const parsed = meta._parsed;
      for(let i=start; i<start+count; i++){
        const d = data[i];
        parsed[i] = Array.isArray(d) ? d[2] : d.median;
      }
    }

    updateElement(elem, index, properties, mode){
      super.updateElement(elem, index, properties, mode);
      elem.skip = false;

      const raw = this.getDataset().data[index];
      const [min,q1,median,q3,max] = Array.isArray(raw)
        ? raw
        : [raw.min, raw.q1, raw.median, raw.q3, raw.max];

      const scale = this._cachedMeta.vScale;
      elem.box = {
        min: scale.getPixelForValue(min),
        q1: scale.getPixelForValue(q1),
        median: scale.getPixelForValue(median),
        q3: scale.getPixelForValue(q3),
        max: scale.getPixelForValue(max)
      };
    }
  }
  BoxPlotController.prototype.dataElementType = BoxAndWhiskers;

  Chart.register(BoxAndWhiskers, BoxPlotController);
})(typeof window !== 'undefined' ? window : globalThis);
