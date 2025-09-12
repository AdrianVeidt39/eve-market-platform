'use strict';

import * as Chart from 'chart.js';
import ArrayElementBase, {
  defaults
} from './base';


Chart.defaults.global.elements.boxandwhiskers = {
  ...defaults
};

function transitionBoxPlot(start, view, model, ease) {
  const keys = Object.keys(model);
  for (const key of keys) {
    const target = model[key];
    const origin = start[key];
    if (origin === target) {
      continue;
    }
    if (typeof target === 'number') {
      view[key] = origin + (target - origin) * ease;
      continue;
    }
    if (Array.isArray(target)) {
      const v = view[key];
      const common = Math.min(target.length, origin.length);
      for (let i = 0; i < common; ++i) {
        v[i] = origin[i] + (target[i] - origin[i]) * ease;
      }
    }
  }
}

const BoxAndWiskers = Chart.elements.BoxAndWhiskers = ArrayElementBase.extend({
  transition(ease) {
    const r = Chart.Element.prototype.transition.call(this, ease);
    const model = this._model;
    const start = this._start;
    const view = this._view;

    // No animation -> No Transition
    if (!model || ease === 1) {
      return r;
    }
    if (start.boxplot == null) {
      return r; // model === view -> not copied
    }

    // create deep copy to avoid alternation
    if (model.boxplot === view.boxplot) {
      view.boxplot = Chart.helpers.clone(view.boxplot);
    }
    transitionBoxPlot(start.boxplot, view.boxplot, model.boxplot, ease);

    return r;
  },
  draw() {
    const ctx = this._chart.ctx;
    const vm = this._view;

    const boxplot = vm.boxplot;

    ctx.save();

    ctx.fillStyle = vm.backgroundColor;
    ctx.strokeStyle = vm.borderColor;
    ctx.lineWidth = vm.borderWidth;

    this._drawBoxPlotHoriz(vm, boxplot, ctx);
    this._drawOutliers(vm, boxplot, ctx, false);

    ctx.restore();

    this._drawItems(vm, boxplot, ctx, false);

  },
  _drawBoxPlotHoriz(vm, boxplot, ctx) {
    const y = vm.y;
    const height = vm.height;
    const y0 = y - height / 2;

    if (boxplot.min === boxplot.max && boxplot.min === boxplot.q1 && boxplot.min === boxplot.median && boxplot.min === boxplot.q3) {
      const x = boxplot.min;
      const size = height / 2;
      ctx.beginPath();
      ctx.moveTo(x - size, y0);
      ctx.lineTo(x + size, y0 + height);
      ctx.moveTo(x - size, y0 + height);
      ctx.lineTo(x + size, y0);
      ctx.stroke();
      return;
    }

    // Draw the border around the main q1>q3 box
    if (boxplot.q3 > boxplot.q1) {
      ctx.strokeRect(boxplot.q1, y0, boxplot.q3 - boxplot.q1, height);
    } else {
      ctx.strokeRect(boxplot.q3, y0, boxplot.q1 - boxplot.q3, height);
    }

    // Draw the whiskers
    ctx.beginPath();
    ctx.moveTo(boxplot.whiskerMin, y0);
    ctx.lineTo(boxplot.whiskerMin, y0 + height);
    ctx.moveTo(boxplot.whiskerMin, y);
    ctx.lineTo(boxplot.q1, y);
    ctx.moveTo(boxplot.whiskerMax, y0);
    ctx.lineTo(boxplot.whiskerMax, y0 + height);
    ctx.moveTo(boxplot.whiskerMax, y);
    ctx.lineTo(boxplot.q3, y);
    ctx.closePath();
    ctx.stroke();

    // Draw the q1>q3 box
    if (boxplot.q3 > boxplot.q1) {
      ctx.fillRect(boxplot.q1, y0, boxplot.q3 - boxplot.q1, height);
    } else {
      ctx.fillRect(boxplot.q3, y0, boxplot.q1 - boxplot.q3, height);
    }

    // Draw the median line
    ctx.save();
    if (vm.medianColor) {
      ctx.strokeStyle = vm.medianColor;
    }
    ctx.beginPath();
    ctx.moveTo(boxplot.median, y0);
    ctx.lineTo(boxplot.median, y0 + height);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  },
  _getBounds() {
    const vm = this._view;

    const boxplot = vm.boxplot;

    if (!boxplot) {
      return {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0
      };
    }

    const {
      y,
      height
    } = vm;
    const y0 = y - height / 2;
    return {
      left: boxplot.whiskerMin,
      top: y0,
      right: boxplot.whiskerMax,
      bottom: y0 + height
    };
  },
  height() {
    const vm = this._view;
    return vm.height;
  },
  getArea() {
    const vm = this._view;
    const iqr = Math.abs(vm.boxplot.q3 - vm.boxplot.q1);
    return iqr * vm.height;
  },
  _getOutliers() {
    return this._view.boxplot ? this._view.boxplot.outliers || [] : [];
  },
});

export default BoxAndWiskers;
