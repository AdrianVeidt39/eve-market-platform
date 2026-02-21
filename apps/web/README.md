# apps/web

Aplicacion frontend estatica.

Estado incremental:

- El UI fuente sigue en `client/index.html` para evitar romper funcionalidad existente.
- La app ahora consume backend via `/v1/*` y ya no llama ESI directo.
- Este workspace encapsula el runtime local del frontend y prepara la migracion total de `client/` a `apps/web/`.

## Desarrollo local

```bash
npm run dev:web
```

Abre `http://localhost:4173/`.
