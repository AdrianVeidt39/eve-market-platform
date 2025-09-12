(function(global){
  const STORAGE_KEY = 'esiLogs';

  function serialize(args){
    return args.map(a=>{
      if(typeof a === 'string') return a;
      try { return JSON.stringify(a); } catch(e) { return String(a); }
    }).join(' ');
  }

  function save(level,args){
    const entry = { level, message: serialize(args), ts: new Date().toISOString() };
    if(typeof localStorage !== 'undefined'){
      try{
        const logs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        logs.push(entry);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
      }catch(_){/* ignore */}
    }
    if(typeof navigator !== 'undefined' && navigator.sendBeacon){
      try{ navigator.sendBeacon('/logs', JSON.stringify(entry)); }catch(_){/* ignore */}
    }
  }

  function logInfo(...args){
    if(typeof console !== 'undefined' && console.log) console.log(...args);
    save('info', args);
  }
  function logWarn(...args){
    if(typeof console !== 'undefined' && console.warn) console.warn(...args);
    save('warn', args);
  }
  function logError(...args){
    if(typeof console !== 'undefined' && console.error) console.error(...args);
    save('error', args);
  }

  function getStoredLogs(){
    if(typeof localStorage === 'undefined') return [];
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch(_){ return []; }
  }

  global.logInfo = logInfo;
  global.logWarn = logWarn;
  global.logError = logError;
  global.getStoredLogs = getStoredLogs;

  if(typeof module !== 'undefined'){
    module.exports = { logInfo, logWarn, logError, getStoredLogs };
  }
})(typeof window !== 'undefined' ? window : globalThis);
