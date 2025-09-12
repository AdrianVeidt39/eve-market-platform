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
      const x0 = x - width/2;
      ctx.save();
      ctx.fillStyle = v.options.backgroundColor;
      ctx.strokeStyle = v.options.borderColor;
      ctx.lineWidth = v.options.borderWidth;
      // box
      ctx.fillRect(x0, b.q1, width, b.q3 - b.q1);
      ctx.strokeRect(x0, b.q1, width, b.q3 - b.q1);
      // median
      ctx.beginPath();
      ctx.moveTo(x0, b.median);
      ctx.lineTo(x0 + width, b.median);
      // whiskers
      ctx.moveTo(x, b.min);
      ctx.lineTo(x, b.q1);
      ctx.moveTo(x0, b.min);
      ctx.lineTo(x0 + width, b.min);
      ctx.moveTo(x, b.max);
      ctx.lineTo(x, b.q3);
      ctx.moveTo(x0, b.max);
      ctx.lineTo(x0 + width, b.max);
      ctx.stroke();
      ctx.restore();
    }
  }
  BoxAndWhiskers.id = 'boxandwhiskers';
  BoxAndWhiskers.defaults = Object.assign({}, BarElement.defaults);

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
