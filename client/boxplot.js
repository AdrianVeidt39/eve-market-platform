(function(global){
  const Chart = global.Chart;
  if(!Chart){
    console.error('Chart.js not found');
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
      const x = v.x;
      const width = v.width;
      const x0 = x - width / 2;
      ctx.save();
      ctx.fillStyle = v.options.backgroundColor;
      ctx.strokeStyle = v.options.borderColor;
      ctx.lineWidth = v.options.borderWidth;
      const top = Math.min(b.q1, b.q3);
      const bottom = Math.max(b.q1, b.q3);

      // box
      ctx.fillRect(x0, top, width, bottom - top);
      ctx.strokeRect(x0, top, width, bottom - top);

      // whiskers
      ctx.beginPath();
      ctx.strokeStyle = v.options.borderColor;
      ctx.moveTo(x, b.min);
      ctx.lineTo(x, bottom);
      ctx.moveTo(x0, b.min);
      ctx.lineTo(x0 + width, b.min);
      ctx.moveTo(x, b.max);
      ctx.lineTo(x, top);
      ctx.moveTo(x0, b.max);
      ctx.lineTo(x0 + width, b.max);
      ctx.stroke();

      // median line
      ctx.beginPath();
      ctx.strokeStyle = v.options.medianColor || v.options.borderColor;
      ctx.moveTo(x0, b.median);
      ctx.lineTo(x0 + width, b.median);
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
