# Gold Data API — Referencia de endpoints

**Base URL local:** `http://localhost:4000`  
**Base URL producción:** `https://gold-data-api.fly.dev` *(ajustar cuando se despliegue)*

**Autenticación:** todos los endpoints protegidos requieren el header `x-api-key` o el query param `?apiKey=`.  
Si `API_KEY` no está definida en el entorno, la autenticación está desactivada.

---

## GET /health

Verifica que el servidor esté corriendo. **No requiere autenticación.**

### Request

```
GET /health
```

### Response `200`

```json
{
  "status": "ok",
  "ts": "2026-06-01T14:30:00.000Z"
}
```

---

## GET /api/gold

Precio del oro en tiempo real desde `data-asg.goldprice.org`. Caché en memoria de 15 s.

### Request

```
GET /api/gold
x-api-key: tu-api-key
```

**cURL**
```bash
curl -X GET "http://localhost:4000/api/gold" \
  -H "x-api-key: tu-api-key"
```

### Response `200`

```json
{
  "xauPrice": "96558234.50",
  "xauCop": 3103421.85,
  "xagCopKg": 34820150.00,
  "goldUsdOz": 2345.60,
  "silverUsdOz": 29.15,
  "fetchedAt": "2026-06-01T14:30:00.000Z"
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `xauPrice` | string/number | Precio oro en COP/onza (raw) |
| `xauCop` | number | Precio oro en **COP/gramo** |
| `xagCopKg` | number | Precio plata en **COP/kilogramo** |
| `goldUsdOz` | number | Precio oro en **USD/onza troy** |
| `silverUsdOz` | number | Precio plata en **USD/onza troy** |
| `fetchedAt` | string ISO | Momento del fetch |

### Response `200` (caché vencida — `stale: true`)

```json
{
  "xauPrice": "96558234.50",
  "xauCop": 3103421.85,
  "xagCopKg": 34820150.00,
  "goldUsdOz": 2345.60,
  "silverUsdOz": 29.15,
  "fetchedAt": "2026-06-01T14:20:00.000Z",
  "stale": true
}
```

### Response `503`

```json
{ "error": "Service temporarily unavailable" }
```

---

## GET /api/usd

Tasa de cambio USD/COP de **Banco de Bogotá** (scraping Playwright). Caché en memoria de 60 s.

### Request

```
GET /api/usd
x-api-key: tu-api-key
```

**cURL**
```bash
curl -X GET "http://localhost:4000/api/usd" \
  -H "x-api-key: tu-api-key"
```

### Response `200`

```json
{
  "usd": ["USD: 4.250,32"],
  "image": null,
  "fecha": "Domingo, 01 de Junio de 2026",
  "fetchedAt": "2026-06-01T14:30:00.000Z"
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `usd` | string[] | Texto scrapeado del banner del banco, formato `"USD: X.XXX,XX"` |
| `image` | string\|null | Base64 de la imagen del ticker (si existe) |
| `fecha` | string\|null | Fecha que muestra el portal del banco |
| `fetchedAt` | string ISO | Momento del fetch |

> **Parseo del valor numérico:**  
> `usd[0].split(':')[1].trim().replaceAll(',', '.')` → `"4250.32"` → `Number(...)` → `4250.32`

---

## GET /api/latest

Combinación de gold + usd + cálculo del precio TRM del oro en COP/gramo. Caché de 15 s.

### Request

```
GET /api/latest
x-api-key: tu-api-key
```

**cURL**
```bash
curl -X GET "http://localhost:4000/api/latest" \
  -H "x-api-key: tu-api-key"
```

### Response `200`

```json
{
  "gold": {
    "xauPrice": "96558234.50",
    "xauCop": 3103421.85,
    "xagCopKg": 34820150.00,
    "goldUsdOz": 2345.60,
    "silverUsdOz": 29.15,
    "fetchedAt": "2026-06-01T14:30:00.000Z"
  },
  "usd": {
    "usd": ["USD: 4.250,32"],
    "image": null,
    "fecha": "Domingo, 01 de Junio de 2026",
    "fetchedAt": "2026-06-01T14:30:00.000Z"
  },
  "trmGoldOz": 320142.50
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `gold` | object | Ver `/api/gold` |
| `usd` | object | Ver `/api/usd` |
| `trmGoldOz` | number\|null | `(usdNum × goldUsdOz) / 31.1034768` — precio oro COP/gramo calculado con TRM real |

---

## GET /api/history

Historial de snapshots guardados en **Firestore** (colección `priceHistory`), más recientes primero.

### Request

```
GET /api/history?limit=50&from=2026-05-01&to=2026-06-01
x-api-key: tu-api-key
```

| Query param | Tipo | Default | Descripción |
|---|---|---|---|
| `limit` | number | `100` | Máximo de registros (tope 500) |
| `from` | string ISO/date | — | Filtro desde fecha (inclusive) |
| `to` | string ISO/date | — | Filtro hasta fecha (inclusive) |

**cURL — últimos 10 registros**
```bash
curl -X GET "http://localhost:4000/api/history?limit=10" \
  -H "x-api-key: tu-api-key"
```

**cURL — rango de fechas**
```bash
curl -X GET "http://localhost:4000/api/history?limit=200&from=2026-05-01&to=2026-06-01" \
  -H "x-api-key: tu-api-key"
```

### Response `200`

```json
{
  "count": 2,
  "data": [
    {
      "id": "abc123xyz",
      "timestamp": "2026-06-01T14:30:00.000Z",
      "gold": 3103421.85,
      "goldUsdOz": 2345.60,
      "silverCopKg": 34820150.00,
      "silverUsdOz": 29.15,
      "trmGoldOz": 320142.50,
      "dolar": 4250.32
    },
    {
      "id": "def456uvw",
      "timestamp": "2026-06-01T14:25:00.000Z",
      "gold": 3101800.00,
      "goldUsdOz": 2344.10,
      "silverCopKg": 34810000.00,
      "silverUsdOz": 29.10,
      "trmGoldOz": 319950.00,
      "dolar": 4248.80
    }
  ]
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | ID del documento en Firestore |
| `timestamp` | string ISO | Fecha/hora del snapshot (serverTimestamp de Firestore) |
| `gold` | number | Precio oro COP/gramo (de `data-asg`) |
| `goldUsdOz` | number | Precio oro USD/onza |
| `silverCopKg` | number | Precio plata COP/kg |
| `silverUsdOz` | number | Precio plata USD/onza |
| `trmGoldOz` | number | Precio TRM calculado COP/gramo |
| `dolar` | number | Tasa USD/COP de Banco de Bogotá |

### Response `500`

```json
{ "error": "Internal server error" }
```

---

## Errores de autenticación

Aplica a todos los endpoints excepto `/health`.

### `401 Unauthorized` — header faltante o key incorrecta

```json
{ "error": "Unauthorized" }
```

---

## Colección Postman (importar)

Guarda esto como `gold-api.postman_collection.json` e impórtalo en Postman:

```json
{
  "info": {
    "name": "Gold Data API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    { "key": "baseUrl", "value": "http://localhost:4000" },
    { "key": "apiKey",  "value": "tu-api-key" }
  ],
  "item": [
    {
      "name": "Health",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/health"
      }
    },
    {
      "name": "Gold Price",
      "request": {
        "method": "GET",
        "header": [{ "key": "x-api-key", "value": "{{apiKey}}" }],
        "url": "{{baseUrl}}/api/gold"
      }
    },
    {
      "name": "USD Rate",
      "request": {
        "method": "GET",
        "header": [{ "key": "x-api-key", "value": "{{apiKey}}" }],
        "url": "{{baseUrl}}/api/usd"
      }
    },
    {
      "name": "Latest (combinado)",
      "request": {
        "method": "GET",
        "header": [{ "key": "x-api-key", "value": "{{apiKey}}" }],
        "url": "{{baseUrl}}/api/latest"
      }
    },
    {
      "name": "History — últimos 50",
      "request": {
        "method": "GET",
        "header": [{ "key": "x-api-key", "value": "{{apiKey}}" }],
        "url": {
          "raw": "{{baseUrl}}/api/history?limit=50",
          "query": [{ "key": "limit", "value": "50" }]
        }
      }
    },
    {
      "name": "History — rango de fechas",
      "request": {
        "method": "GET",
        "header": [{ "key": "x-api-key", "value": "{{apiKey}}" }],
        "url": {
          "raw": "{{baseUrl}}/api/history?limit=200&from=2026-05-01&to=2026-06-01",
          "query": [
            { "key": "limit", "value": "200" },
            { "key": "from",  "value": "2026-05-01" },
            { "key": "to",    "value": "2026-06-01" }
          ]
        }
      }
    }
  ]
}
```
