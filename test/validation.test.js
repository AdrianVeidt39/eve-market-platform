const assert=require('assert');
const { logWarn, logInfo } = require('../client/logging');

function quantile(arr,q){
  const sorted=arr.slice().sort((a,b)=>a-b);
  const pos=(sorted.length-1)*q;
  const base=Math.floor(pos);
  const rest=pos-base;
  return sorted[base+1]!==undefined
    ? sorted[base]+rest*(sorted[base+1]-sorted[base])
    : sorted[base];
}

const boxStats=arr=>{
  if(!Array.isArray(arr) || arr.length===0) return null;
  const valid=arr.filter(v=>Number.isFinite(v));
  if(valid.length!==arr.length){
    logWarn('Valores no válidos descartados en boxStats:', arr.filter(v=>!Number.isFinite(v)));
  }
  if(valid.length===0){
    logWarn('boxStats: no hay datos válidos tras la validación.');
    return null;
  }
  const sorted=valid.slice().sort((a,b)=>a-b);
  return {
    min:sorted[0],
    q1:quantile(sorted,0.25),
    median:quantile(sorted,0.5),
    q3:quantile(sorted,0.75),
    max:sorted[sorted.length-1],
  };
};

const palette=['#fff'];
const flatLinePlugin=()=>({});
let note=null;
function showChartNote(id,msg){ note=[id,msg]; }
class Chart{ constructor(el,config){ this.el=el; this.config=config;} }
Chart.defaults={color:''};
let boxPlotAvailable=true;

function renderBoxChart(el, labels, boxData, title){
  if(!boxPlotAvailable){
    if(typeof showChartNote==='function' && el && el.id) showChartNote(el.id,'La gráfica de cajas no está disponible.');
    return null;
  }
  const pairs=labels.map((label,i)=>({label,data:boxData[i]}));
  const valid=pairs.filter(p=>{
    const d=p.data||{};
    return ['min','q1','median','q3','max'].every(k=>Number.isFinite(d[k]));
  });
  if(valid.length!==pairs.length){
    logWarn('Puntos de caja descartados por no ser finitos:', pairs.filter(p=>{
      const d=p.data||{};
      return !['min','q1','median','q3','max'].every(k=>Number.isFinite(d[k]));
    }));
  }
  if(valid.length===0){
    if(typeof showChartNote==='function' && el && el.id) showChartNote(el.id,'No hay datos válidos para esta gráfica.');
    return null;
  }
  labels=valid.map(p=>p.label);
  boxData=valid.map(p=>p.data);
  const gMin=Math.min(...boxData.map(d=>d.min));
  const gMax=Math.max(...boxData.map(d=>d.max));
  const colors=palette.slice(0,labels.length);
  if(gMin===gMax){
    const v=gMin;
    const delta=v===0?1:Math.abs(v)*0.05;
    return new Chart(el,{
      type:'bar',
      data:{labels,datasets:[{data:labels.map(()=>v),backgroundColor:'transparent',borderColor:'transparent'}]},
      options:{plugins:{legend:{display:false},title:{display:true,text:title}},scales:{y:{min:v-delta,max:v+delta}}},
      plugins:[flatLinePlugin(colors)]
    });
  }
  const dataAsArrays=boxData.map(d=>[d.min,d.q1,d.median,d.q3,d.max]);
  return new Chart(el,{
    type:'boxplot',
    data:{
      labels,
      datasets:[{
        data:dataAsArrays,
        backgroundColor:colors,
        borderColor:'#fff',
        borderWidth:1,
        medianColor:'#fff',
        quartileColor:'#fff'
      }]
    },
    options:{plugins:{legend:{display:false},title:{display:true,text:title}}}
  });
}

// Tests for boxStats
let stats=boxStats([1,null,2,Infinity,'3']);
assert(stats && stats.min===1 && stats.max===2);
assert.strictEqual(boxStats([null,'a',Infinity]), null);

// Tests for renderBoxChart
note=null;
let chart=renderBoxChart({id:'c'}, ['A','B','C','D'], [
  {min:1,q1:1,median:1,q3:1,max:1},
  {min:2,q1:2,median:2,q3:2,max:Infinity},
  {min:3,q1:null,median:3,q3:4,max:5},
  {min:4,q1:4,median:'bad',q3:5,max:6}
], 't');
assert(chart instanceof Chart);
assert.deepStrictEqual(chart.config.data.labels, ['A']);

note=null;
chart=renderBoxChart({id:'c2'}, ['A'], [
  {min:Infinity,q1:2,median:3,q3:4,max:5}
], 't');
assert.strictEqual(chart, null);
assert.deepStrictEqual(note, ['c2','No hay datos válidos para esta gráfica.']);

boxPlotAvailable=false;
note=null;
chart=renderBoxChart({id:'c3'}, ['A'], [
  {min:1,q1:1,median:1,q3:1,max:1}
], 't');
assert.strictEqual(chart, null);
assert.deepStrictEqual(note, ['c3','La gráfica de cajas no está disponible.']);

logInfo('Tests passed');
