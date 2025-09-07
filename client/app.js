function App() {
  const [item, setItem] = React.useState("");
  const [results, setResults] = React.useState([]);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [minVolume, setMinVolume] = React.useState(0);
  const [maxPrice, setMaxPrice] = React.useState(Infinity);
  const [systemFilter, setSystemFilter] = React.useState("");

  const fetchData = async () => {
    if (!item) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/search?item=${encodeURIComponent(item)}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setResults(data.results);
    } catch (e) {
      setError(e.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = results.filter((r) =>
    r.volume >= Number(minVolume) &&
    r.min_price <= Number(maxPrice) &&
    r.system_name.toLowerCase().includes(systemFilter.toLowerCase())
  );

  return (
    <div>
      <header>
        <h1>EVE Market Explorer</h1>
      </header>
      <div>
        <input
          value={item}
          onChange={(e) => setItem(e.target.value)}
          placeholder="Item name"
        />
        <button onClick={fetchData}>Search</button>
      </div>
      <div>
        <label>
          Min Volume:
          <input
            type="number"
            value={minVolume}
            onChange={(e) => setMinVolume(e.target.value)}
          />
        </label>
        <label>
          Max Price:
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value || Infinity)}
          />
        </label>
        <label>
          System Filter:
          <input
            value={systemFilter}
            onChange={(e) => setSystemFilter(e.target.value)}
            placeholder="System name"
          />
        </label>
      </div>
      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Region</th>
                <th>Min Price</th>
                <th>Total Volume</th>
                <th>Best System</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.region_id}>
                  <td>{r.region_name}</td>
                  <td>{r.min_price.toFixed(2)}</td>
                  <td>{r.volume}</td>
                  <td>{r.system_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
