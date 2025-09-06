# EVE Market Explorer

Local web application to query the EVE Online market and display availability by region.

## Requirements

- Python 3.8+
- Node.js is **not** required; the frontend uses CDN scripts.

## Installation

```bash
pip install -r requirements.txt
```

## Running

```bash
python server/app.py
```

Then open `http://localhost:5000` in a modern browser.

## Features

- Search any market item by name.
- Shows regions with sell orders, minimum price, total volume and best system.
- Client-side filters for volume, price and system name.
- Caches API responses and throttles requests to respect ESI limits.
- Handles API errors with clear messages.
