const API_BASE = 'https://esi.evetech.net/latest';
let lastCall = 0;
const cache = { names: {}, constellations: {}, systems: {}, stations: {} };

async function throttle() {
  const wait = 300 - (Date.now() - lastCall);
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }
  lastCall = Date.now();
}

async function fetchESI(endpoint, options = {}, retries = 3) {
  await throttle();
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(API_BASE + endpoint, options);
      if ([420, 429, 503].includes(res.status)) throw new Error('rate');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.status === 204 ? null : await res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
}

async function getNames(ids) {
  const unknown = ids.filter((id) => !(id in cache.names));
  if (unknown.length) {
    const data = await fetchESI('/universe/names/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(unknown),
    });
    data.forEach((n) => (cache.names[n.id] = n.name));
  }
  const map = {};
  ids.forEach((id) => (map[id] = cache.names[id]));
  return map;
}

document.addEventListener('DOMContentLoaded', async () => {
  const regionSel = document.getElementById('region');
  const constSel = document.getElementById('constellation');
  const systemSel = document.getElementById('system');
  const productInput = document.getElementById('product');
  const searchBtn = document.getElementById('search');
  const tbody = document.querySelector('#results tbody');

  try {
    const regionIds = await fetchESI('/universe/regions/');
    const regionNames = await getNames(regionIds);
    regionSel.append(new Option('-- Región --', ''));
    Object.entries(regionNames)
      .sort((a, b) => a[1].localeCompare(b[1]))
      .forEach(([id, name]) => regionSel.append(new Option(name, id)));
  } catch {
    tbody.innerHTML = '<tr><td colspan="5">Error cargando regiones</td></tr>';
  }

  regionSel.addEventListener('change', async () => {
    const regionId = regionSel.value;
    constSel.innerHTML = '';
    systemSel.innerHTML = '';
    tbody.innerHTML = '';
    constSel.disabled = true;
    systemSel.disabled = true;
    if (!regionId) return;
    try {
      let constIds = cache.constellations[regionId];
      if (!constIds) {
        const data = await fetchESI(`/universe/regions/${regionId}/`);
        constIds = data.constellations;
        cache.constellations[regionId] = constIds;
      }
      const constNames = await getNames(constIds);
      constSel.append(new Option('-- Constelación --', ''));
      Object.entries(constNames)
        .sort((a, b) => a[1].localeCompare(b[1]))
        .forEach(([id, name]) => constSel.append(new Option(name, id)));
      constSel.disabled = true;
      constSel.disabled = false;
    } catch {
      tbody.innerHTML = '<tr><td colspan="5">Error cargando constelaciones</td></tr>';
    }
  });

  constSel.addEventListener('change', async () => {
    const constId = constSel.value;
    systemSel.innerHTML = '';
    tbody.innerHTML = '';
    systemSel.disabled = true;
    if (!constId) return;
    try {
      let sysIds = cache.systems[constId];
      if (!sysIds) {
        const data = await fetchESI(`/universe/constellations/${constId}/`);
        sysIds = data.systems;
        cache.systems[constId] = sysIds;
      }
      const sysNames = await getNames(sysIds);
      systemSel.append(new Option('-- Sistema --', ''));
      Object.entries(sysNames)
        .sort((a, b) => a[1].localeCompare(b[1]))
        .forEach(([id, name]) => systemSel.append(new Option(name, id)));
      systemSel.disabled = false;
    } catch {
      tbody.innerHTML = '<tr><td colspan="5">Error cargando sistemas</td></tr>';
    }
  });

  let currentStations = [];
  systemSel.addEventListener('change', async () => {
    tbody.innerHTML = '';
    const sysId = systemSel.value;
    if (!sysId) return;
    try {
      let stations = cache.stations[sysId];
      if (!stations) {
        const sysData = await fetchESI(`/universe/systems/${sysId}/`);
        stations = sysData.stations || [];
        cache.stations[sysId] = stations;
      }
      currentStations = stations;
    } catch {
      tbody.innerHTML = '<tr><td colspan="5">Error cargando estaciones</td></tr>';
    }
  });

  searchBtn.addEventListener('click', async () => {
    tbody.innerHTML = '';
    const regionId = Number(regionSel.value);
    const systemId = Number(systemSel.value);
    if (!regionId || !systemId) {
      tbody.innerHTML = '<tr><td colspan="5">Selecciona región y sistema</td></tr>';
      return;
    }
    let itemName = productInput.value.trim();
    if (!itemName) itemName = 'Antimatter Charge';
    let searchData;
    try {
      searchData = await fetchESI(
        `/search/?categories=inventory_type&search=${encodeURIComponent(
          itemName
        )}&strict=false`
      );
    } catch {
      tbody.innerHTML = '<tr><td colspan="5">Error buscando producto</td></tr>';
      return;
    }
    const ids = searchData.inventory_type || [];
    if (!ids.length) {
      tbody.innerHTML = '<tr><td colspan="5">Producto no encontrado</td></tr>';
      return;
    }
    const typeId = ids[0];
    let orders = [];
    try {
      orders = await fetchESI(
        `/markets/${regionId}/orders/?order_type=sell&type_id=${typeId}`
      );
    } catch {
      tbody.innerHTML = '<tr><td colspan="5">Error consultando mercado</td></tr>';
      return;
    }
    const systemOrders = orders.filter((o) => o.system_id === systemId);
    const stationNames = await getNames(currentStations);
    const byStation = {};
    systemOrders.forEach((o) => {
      if (!byStation[o.location_id]) byStation[o.location_id] = [];
      byStation[o.location_id].push(o);
    });
    if (!currentStations.length) {
      tbody.innerHTML = '<tr><td colspan="5">Sistema sin estaciones públicas</td></tr>';
      return;
    }
    currentStations.forEach((stId) => {
      const orders = byStation[stId];
      if (!orders) {
        const row = tbody.insertRow();
        row.classList.add('no-orders');
        row.insertCell().textContent = stationNames[stId] || stId;
        const cell = row.insertCell();
        cell.colSpan = 4;
        cell.textContent = 'Sin órdenes';
      } else {
        orders
          .sort((a, b) => a.price - b.price)
          .forEach((o) => {
            const row = tbody.insertRow();
            row.insertCell().textContent = stationNames[stId] || stId;
            row.insertCell().textContent = o.price.toFixed(2);
            row.insertCell().textContent = o.volume_remain;
            row.insertCell().textContent = o.range;
            row.insertCell().textContent = o.duration;
          });
      }
    });
  });
});
