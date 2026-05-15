# Quanta · Algorithmic Market Lab

**Plataforma de análisis algorítmico de series financieras** para activos de la BVC (Bolsa de Valores de Colombia), ETFs e índices globales. Implementa desde cero — sin librerías de alto nivel — un pipeline ETL, métricas de similitud entre series temporales, detección de patrones, clasificación de riesgo y un dashboard bursátil interactivo.

> Proyecto académico de **Análisis Algorítmico Financiero**. La UI usa datos sintéticos deterministas para demostrar los algoritmos de forma reproducible.

---

## 🎯 Objetivo del proyecto

El análisis financiero moderno requiere procesar grandes volúmenes de datos históricos para detectar patrones en el comportamiento de los activos. Este proyecto construye un sistema integral que cubre cinco requerimientos:

1. **ETL automatizado** — extracción, limpieza y unificación de datos OHLCV.
2. **Similitud entre series temporales** — comparación algorítmica de activos.
3. **Análisis de volatilidad y patrones** — clasificación de riesgo y detección de eventos recurrentes.
4. **Visualización avanzada** — gráficos de velas, medias móviles y matriz de correlación.
5. **Arquitectura reproducible** — pipeline ejecutable extremo a extremo.

---

## 🧩 Requerimientos implementados

### REQ 01 · Pipeline ETL
Pipeline visual de cuatro etapas (`Extract → Transform → Load → Validate`):
- **Extract** — peticiones HTTP nativas a APIs financieras públicas con backoff y reintentos.
- **Transform** — alineación de calendarios bursátiles, manejo de festivos, interpolación de NaN.
- **Load** — consolidación en dataset maestro (`master_dataset.parquet`).
- **Validate** — verificación de esquema y detección algorítmica de outliers (z-score).

### REQ 02 · Similitud entre series temporales
Cuatro algoritmos implementados a mano en TypeScript puro (`src/lib/finance-data.ts`):

| Algoritmo | Qué mide | Complejidad |
|-----------|----------|-------------|
| **Pearson** | Correlación lineal entre retornos | O(n) |
| **Coseno** | Similitud direccional de vectores | O(n) |
| **Euclidiana** | Distancia entre precios normalizados (z-score) | O(n) |
| **DTW** (Dynamic Time Warping) | Alineación temporal con banda Sakoe-Chiba | O(n·w) |

El panel permite seleccionar cualquier par de activos, ver sus series superpuestas (normalizadas) y comparar las cuatro métricas simultáneamente.

### REQ 03 · Volatilidad, riesgo y patrones
- **Volatilidad anualizada (σ)** calculada sobre retornos logarítmicos.
- **Clasificación de riesgo**: Conservador / Moderado / Agresivo.
- **Detección de patrones por sliding window**:
  - `countUpStreaks` — rachas alcistas consecutivas.
  - `countVShapes` — patrones en V (caída + recuperación).

### REQ 04 · Visualización
- **Candlestick chart** con medias móviles SMA-20 y SMA-50 calculadas algorítmicamente, renderizado en SVG nativo.
- **Heatmap de correlación 20×20** sobre retornos diarios de 5 años (Pearson).
- **Ticker** de precios animado en tiempo real.
- **StatCards** con KPIs del portafolio.

### REQ 05 · Arquitectura
Stack moderno desplegable en edge:
- **Frontend**: TanStack Start · React 19 · Tailwind CSS v4
- **Algoritmos**: TypeScript puro, sin dependencias numéricas
- **ETL**: `fetch` HTTP nativo, parsing JSON/CSV, backoff exponencial
- **Visualización**: SVG nativo (sin Chart.js / D3)
- **Despliegue**: Edge Worker con CDN global

---

## 📁 Estructura del proyecto

```text
src/
├── lib/
│   └── finance-data.ts          # Algoritmos: pearson, cosine, euclidean,
│                                #   dtw, annualVol, countUpStreaks, etc.
│                                #   + generador sintético determinista (mulberry32)
├── components/dash/
│   ├── Primitives.tsx           # Ticker, StatCard, SectionTitle
│   ├── CandlestickChart.tsx     # Velas + SMA en SVG
│   ├── CorrelationHeatmap.tsx   # Matriz 20×20 Pearson
│   ├── SimilarityPanel.tsx      # Comparador de pares con 4 algoritmos
│   └── RiskTable.tsx            # Volatilidad + clasificación + patrones
├── routes/
│   ├── __root.tsx               # Layout raíz
│   └── index.tsx                # Dashboard principal
└── styles.css                   # Design tokens (oklch) · tema Bloomberg dark
```

---

## 🎨 Diseño

Estética inspirada en terminales financieras profesionales (Bloomberg / Refinitiv):
- Modo oscuro con acentos en **ámbar** (primario) y **cyan** (secundario).
- Colores semánticos `bull` (verde) y `bear` (rojo) para movimientos de precio.
- Tipografía monoespaciada para datos numéricos; sans-serif para títulos.
- Tokens definidos en `oklch` dentro de `src/styles.css` — sin colores hardcodeados.

---

## 🚀 Ejecución local

```bash
# Instalar dependencias
bun install

# Servidor de desarrollo
bun run dev

# Build de producción
bun run build
```

La aplicación estará disponible en `http://localhost:5173`.

---

## 📊 Datos

Para esta entrega de UI, los datos se generan **sintéticamente de forma determinista** usando `mulberry32` (PRNG con seed fija). Esto garantiza:

- Reproducibilidad total entre ejecuciones.
- Demostración de los algoritmos sin dependencia de APIs externas.
- 20 activos con ~5 años de OHLCV diario cada uno (≈ 25 000 observaciones).

El pipeline ETL real (`Extract`) está diseñado para consumir endpoints públicos tipo Yahoo Finance / Alpha Vantage; basta con reemplazar el generador por las llamadas HTTP correspondientes.

---

## 📐 Detalles algorítmicos

### Pearson
$$\rho_{X,Y} = \frac{\sum (x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum (x_i - \bar{x})^2 \sum (y_i - \bar{y})^2}}$$

### Coseno
$$\cos(\theta) = \frac{\mathbf{a} \cdot \mathbf{b}}{\|\mathbf{a}\| \, \|\mathbf{b}\|}$$

### DTW con banda Sakoe-Chiba
Programación dinámica con restricción de ventana `w` para reducir la complejidad de O(n²) a O(n·w), donde `w << n`.

### Volatilidad anualizada
$$\sigma_{anual} = \sigma_{diaria} \cdot \sqrt{252}$$

---

## 📄 Licencia

Proyecto académico — uso educativo.

## 👤 Autor

Luis Torres · [@Luistorres1221](https://github.com/Luistorres1221)
