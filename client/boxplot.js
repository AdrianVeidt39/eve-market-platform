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
      const horizontal = v.horizontal;
      ctx.save();
      ctx.fillStyle = v.options.backgroundColor;
      ctx.strokeStyle = v.options.borderColor;
      ctx.lineWidth = v.options.borderWidth;
      if(horizontal){
        const y = v.y;
        const height = v.height;
        const half = Math.min(height / 4, 4);
        // whisker line
        ctx.beginPath();
        ctx.moveTo(b.min, y);
        ctx.lineTo(b.max, y);
        ctx.stroke();

        // min/max caps
        ctx.beginPath();
        ctx.moveTo(b.min, y - half);
        ctx.lineTo(b.min, y + half);
        ctx.moveTo(b.max, y - half);
        ctx.lineTo(b.max, y + half);
        ctx.stroke();

        // q1-q3 bar
        ctx.beginPath();
        ctx.strokeStyle = v.options.backgroundColor;
        ctx.lineWidth = Math.max(2, half * 2);
        ctx.moveTo(b.q1, y);
        ctx.lineTo(b.q3, y);
        ctx.stroke();

        // median line
        ctx.beginPath();
        ctx.strokeStyle = v.options.medianColor || v.options.borderColor;
        ctx.lineWidth = v.options.borderWidth;
        ctx.moveTo(b.median, y - half);
        ctx.lineTo(b.median, y + half);
        ctx.stroke();
      } else {
        const x = v.x;
        const width = v.width;
        const half = Math.min(width / 4, 4);
        // whisker line
        ctx.beginPath();
        ctx.moveTo(x, b.min);
        ctx.lineTo(x, b.max);
        ctx.stroke();

        // min/max caps
        ctx.beginPath();
        ctx.moveTo(x - half, b.min);
        ctx.lineTo(x + half, b.min);
        ctx.moveTo(x - half, b.max);
        ctx.lineTo(x + half, b.max);
        ctx.stroke();

        // q1-q3 bar
        ctx.beginPath();
        ctx.strokeStyle = v.options.backgroundColor;
        ctx.lineWidth = Math.max(2, half * 2);
        ctx.moveTo(x, b.q1);
        ctx.lineTo(x, b.q3);
        ctx.stroke();

        // median line
        ctx.beginPath();
        ctx.strokeStyle = v.options.medianColor || v.options.borderColor;
        ctx.lineWidth = v.options.borderWidth;
        ctx.moveTo(x - half, b.median);
        ctx.lineTo(x + half, b.median);
        ctx.stroke();
      }

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

    parsePrimitiveData(meta, data, start, count){
      const parsed = meta._parsed;
      for(let i=0;i<count;i++){
        parsed[start+i] = data[start+i];
      }
    }

    updateElement(elem, index, properties, mode){
      super.updateElement(elem, index, properties, mode);
      const v = this.getParsed(index);
      const scale = this._cachedMeta.vScale;
      elem.box = {
        min: scale.getPixelForValue(v[0]),
        q1: scale.getPixelForValue(v[1]),
        median: scale.getPixelForValue(v[2]),
        q3: scale.getPixelForValue(v[3]),
        max: scale.getPixelForValue(v[4])
      };
    }
  }
  BoxPlotController.prototype.dataElementType = BoxAndWhiskers;

  Chart.register(BoxAndWhiskers, BoxPlotController);
})(typeof window !== 'undefined' ? window : globalThis);
