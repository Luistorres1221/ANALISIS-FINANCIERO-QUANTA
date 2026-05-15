# Quanta · Mercado Algoritmico

**Plataforma de análisis algorítmico de series financieras** para un portafolio de 20 activos: acciones de la BVC (Bolsa de Valores de Colombia), ETFs e índices globales de EE.UU.

El sistema descarga datos históricos reales desde Yahoo Finance, los limpia y unifica, y expone seis módulos de análisis a través de un dashboard interactivo construido con React.

> **Proyecto académico** — Análisis Algorítmico Financiero · Quanta Ltda · 2025

---

## Tabla de contenidos

1. [¿Qué hace esta aplicación?](#qué-hace-esta-aplicación)
2. [Páginas del dashboard](#páginas-del-dashboard)
3. [Arquitectura del sistema](#arquitectura-del-sistema)
4. [Tecnologías utilizadas](#tecnologías-utilizadas)
5. [Requisitos previos](#requisitos-previos)
6. [Cómo ejecutar el proyecto](#cómo-ejecutar-el-proyecto)
7. [Endpoints de la API](#endpoints-de-la-api)
8. [Algoritmos implementados](#algoritmos-implementados)
9. [Los 20 activos del portafolio](#los-20-activos-del-portafolio)
10. [Estructura del proyecto](#estructura-del-proyecto)
11. [Autor](#autor)

---

## ¿Qué hace esta aplicación?

Quanta es un sistema de análisis financiero de extremo a extremo que:

- **Descarga** datos históricos diarios de los últimos 5 años para 20 activos directamente desde la API de Yahoo Finance.
- **Limpia** los datos automáticamente: detecta huecos en las fechas, interpola valores faltantes y corrige anomalías en precios OHLCV.
- **Analiza** similitud entre activos usando 4 algoritmos distintos: Pearson, Coseno, Euclidiana y DTW.
- **Clasifica** cada activo por nivel de riesgo (Conservador, Moderado, Agresivo) con base en su volatilidad anualizada.
- **Visualiza** gráficos de velas japonesas con medias móviles y una matriz de correlación 20×20.
- **Compara** 12 algoritmos de ordenamiento con benchmarks de tiempo en nanosegundos.

Todo en tiempo real, con una interfaz estilo terminal financiera profesional (Bloomberg dark).

---

## Páginas del dashboard

### 1. Resumen (`/`)
Vista general del portafolio con indicadores clave:
- **KPIs**: activos totales, observaciones en base de datos, mercados cubiertos y volatilidad promedio.
- **Tabla del portafolio**: precio de cierre, retorno diario y volatilidad anualizada de los 20 activos.
- **Ticker animado** con precios en tiempo real en la barra superior.

### 2. ETL (`/etl`)
Visualización del pipeline de datos con ejecución en vivo:
- **Botón "Ejecutar ETL"**: al presionarlo, conecta al backend por streaming (SSE — Server-Sent Events) y muestra en tiempo real cómo se carga cada activo uno por uno.
- **Cards animadas**: cada activo pasa por los estados *Pendiente → Extrayendo → Listo*, con un gráfico sparkline de los últimos 60 días y badge de fuente (Yahoo Finance o PRNG Fallback).
- **Barra de progreso** con contador de activos y timer en vivo.
- **Dataset unificado**: tabla con todas las fechas y columnas OHLCV de los 20 activos, con filtro y paginación.
- **Mapeo de tickers**: tabla de equivalencias entre tickers internos y símbolos de Yahoo Finance.

### 3. Gráficos (`/graficos`)
Análisis técnico visual:
- **Gráfico de velas japonesas**: selector de los 20 activos, últimos 90 días de datos OHLCV con velas verdes (alcistas) y rojas (bajistas), medias móviles SMA-20 (naranja) y SMA-50 (azul), y barras de volumen al fondo.
- **Matriz de correlación 20×20**: heatmap de correlación de Pearson sobre retornos diarios de 5 años. Colores: verde = correlación positiva, rojo = correlación negativa.

### 4. Similitud (`/similitud`)
Comparación algorítmica entre pares de activos:
- Selección de dos activos y ventana temporal (90, 252 o 504 días).
- Resultado con los 4 algoritmos simultáneamente: Pearson, Coseno, Euclidiana y DTW.
- Gráfico de series superpuestas normalizadas.
- Tarjetas de detalle algorítmico con fórmulas y complejidad computacional.

### 5. Riesgo (`/riesgo`)
Tabla de riesgo y patrones del portafolio:
- **σ diaria** (desviación estándar de retornos logarítmicos).
- **Volatilidad anualizada** (σ × √252).
- **Clasificación de riesgo**: Conservador (<15%), Moderado (15-30%), Agresivo (>30%).
- **Patrón ↑×3**: cantidad de rachas de 3 días consecutivos alcistas.
- **Patrón ↓×3**: cantidad de rachas de 3 días consecutivos bajistas.
- **Alta vol. (ventana)**: número de ventanas de 30 días con volatilidad por encima del promedio histórico.
- Ordenamiento interactivo por cualquier columna + filtro por ticker.

### 6. Ordenamiento (`/ordenamiento`)
Benchmark comparativo de algoritmos de ordenamiento:
- **12 algoritmos** implementados desde cero (sin `Array.sort()`): GnomeSort, BinaryInsertionSort, HeapSort, QuickSort, BitonicSort, TimSort, CombSort, SelectionSort, TreeSort, BucketSort, RadixSort y PigeonholeSort.
- **KPI cards**: algoritmo más rápido, más lento, ratio de diferencia y total evaluados.
- **Gráfica de barras**: comparación de tiempos en nanosegundos para el tamaño configurado.
- **Curva de escalabilidad**: gráfica de líneas mostrando cómo crece el tiempo de cada algoritmo al aumentar n (de 8 a 512 elementos).
- **Tabla de resultados**: ranking completo con tiempo, ratio, barra relativa, complejidad temporal, espacial, clase y si el algoritmo es estable.

---

## Arquitectura del sistema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         NAVEGADOR / USUARIO                             │
│                      http://localhost:8081                              │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ HTTP / SSE
┌──────────────────────────────▼──────────────────────────────────────────┐
│              FRONTEND — React 19 + TanStack Start                       │
│                         Puerto 8081                                     │
│                                                                         │
│   /         Resumen del portafolio                                      │
│   /etl       Pipeline ETL + Ejecución en tiempo real (SSE)              │
│   /graficos  Velas japonesas + Matriz de correlación                    │
│   /similitud Comparador de pares con 4 algoritmos                       │
│   /riesgo    Clasificación de riesgo + patrones                         │
│   /ordenamiento Benchmark de 12 algoritmos de ordenamiento              │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ REST + SSE (CORS habilitado)
┌──────────────────────────────▼──────────────────────────────────────────┐
│              BACKEND — Spring Boot 3.3.6 + Java 21                      │
│                         Puerto 8080                                     │
│                                                                         │
│   GET  /api/v1/assets                 Lista los 20 activos              │
│   GET  /api/v1/assets/{ticker}/ohlcv  Serie OHLCV completa              │
│   GET  /api/v1/etl/status             Estado del pipeline               │
│   POST /api/v1/etl/refresh            Re-ejecuta el ETL (síncrono)      │
│   GET  /api/v1/etl/stream             Stream SSE en tiempo real         │
│   GET  /api/v1/analysis/similarity    Similitud entre dos activos       │
│   GET  /api/v1/analysis/correlation   Matriz de correlación 20×20       │
│   GET  /api/v1/analysis/risk          Métricas de riesgo                │
│   GET  /api/v1/export/report          Descarga reporte PDF              │
│   POST /api/v1/auth/login             Autenticación JWT                 │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ HTTP con reintentos
┌──────────────────────────────▼──────────────────────────────────────────┐
│                     Yahoo Finance API v8                                │
│        https://query1.finance.yahoo.com/v8/finance/chart/{symbol}      │
│           Intervalo: 1d   ·   Rango: 5 años   ·   Timeout: 20s         │
│           3 reintentos con backoff lineal   ·   Fallback PRNG           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tecnologías utilizadas

### Backend
| Tecnología | Versión | Para qué se usa |
|------------|---------|-----------------|
| Java | 21 LTS | Lenguaje principal |
| Spring Boot | 3.3.6 | Framework de la API REST |
| Spring Security | incluido en Boot | Autenticación JWT |
| Lombok | 1.18.38 | Reduce código repetitivo (builders, getters) |
| Jackson | incluido en Boot | Serialización/deserialización JSON |
| SpringDoc (Swagger) | 2.x | Documentación automática de la API |
| Maven | 3.x | Gestor de dependencias y build |

### Frontend
| Tecnología | Versión | Para qué se usa |
|------------|---------|-----------------|
| React | 19 | UI reactiva por componentes |
| TanStack Start | 1.x | Framework full-stack + routing |
| TanStack Router | 1.x | Enrutamiento tipo archivo (file-based) |
| TypeScript | 5.x | Tipado estático |
| Tailwind CSS | 4 | Estilos utilitarios |
| Vite | 6.x | Bundler y servidor de desarrollo |
| Lucide React | - | Iconos SVG |
| SVG nativo | - | Todos los gráficos (sin Chart.js ni D3) |

### Infraestructura
| Tecnología | Para qué se usa |
|------------|-----------------|
| Docker + Docker Compose | Despliegue contenedorizado |
| SSE (Server-Sent Events) | Streaming de progreso ETL en tiempo real |
| JWT (JSON Web Tokens) | Autenticación sin estado del servidor |
| CORS | Comunicación segura entre puertos distintos |

---

## Requisitos previos

Antes de ejecutar el proyecto, asegúrate de tener instalado:

- **Java 21** o superior — [descargar](https://adoptium.net/)
- **Maven 3.6+** — [descargar](https://maven.apache.org/download.cgi) *(o usar el wrapper `./mvnw`)*
- **Node.js 18+** — [descargar](https://nodejs.org/)
- **npm o bun** — viene con Node.js

Opcional (para Docker):
- **Docker Desktop** — [descargar](https://www.docker.com/products/docker-desktop)

---

## Cómo ejecutar el proyecto

### Opción A: Ejecución manual (recomendada para desarrollo)

**Paso 1 — Clonar el repositorio**
```bash
git clone https://github.com/Luistorres1221/ANALISIS-FINANCIERO-QUANTA.git
cd ANALISIS-FINANCIERO-QUANTA
```

**Paso 2 — Iniciar el backend (Spring Boot)**
```bash
cd backend
mvn spring-boot:run -Dmaven.test.skip=true
```
El backend queda disponible en: `http://localhost:8080`

Si `mvn` no está en el PATH, usa la ruta completa:
```bash
# Windows
C:\tools\maven\bin\mvn.cmd spring-boot:run -Dmaven.test.skip=true

# Con el wrapper incluido en el proyecto
./mvnw spring-boot:run -Dmaven.test.skip=true
```

> Al arrancar, el backend carga automáticamente los 20 activos desde Yahoo Finance (puede tardar entre 30 y 90 segundos según la conexión). Si Yahoo Finance no responde para algún activo, ese activo usa datos sintéticos PRNG como fallback.

**Paso 3 — Iniciar el frontend (React)**

Abrir una segunda terminal:
```bash
cd frontend
npm install
npm run dev
```
El frontend queda disponible en: `http://localhost:5173` (o `http://localhost:8081` si ese puerto ya está en uso)

**Paso 4 — Iniciar sesión**

Al abrir el frontend, aparece la pantalla de login. Puedes registrar un usuario nuevo o usar las credenciales que hayas registrado previamente.

---

### Opción B: Docker Compose

```bash
git clone https://github.com/Luistorres1221/ANALISIS-FINANCIERO-QUANTA.git
cd ANALISIS-FINANCIERO-QUANTA
docker-compose up --build
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080`

Para detener:
```bash
docker-compose down
```

---

### Swagger UI (documentación interactiva de la API)

Con el backend corriendo, abre en el navegador:
```
http://localhost:8080/swagger-ui.html
```

---

## Endpoints de la API

### Autenticación

| Método | Ruta | Descripción | Body |
|--------|------|-------------|------|
| `POST` | `/api/v1/auth/register` | Registra un usuario nuevo | `{ "name": "...", "email": "...", "password": "..." }` |
| `POST` | `/api/v1/auth/login` | Inicia sesión y devuelve token JWT | `{ "email": "...", "password": "..." }` |

### Activos financieros

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/assets` | Lista los 20 activos con ticker, nombre, mercado, fuente de datos y último cierre |
| `GET` | `/api/v1/assets/{ticker}` | Detalle de un activo por ticker (ej: `ECOPETROL`, `AAPL`) |
| `GET` | `/api/v1/assets/{ticker}/ohlcv?days=90` | Serie histórica OHLCV. `days` es opcional (sin límite por defecto) |
| `GET` | `/api/v1/assets/{ticker}/sma?window=20&days=252` | Media Móvil Simple del activo |

### Pipeline ETL

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/etl/status` | Estado actual: activos cargados, observaciones totales, tiempo de carga |
| `POST` | `/api/v1/etl/refresh` | Re-ejecuta todo el pipeline (síncrono, mismo resultado por PRNG determinista) |
| `GET` | `/api/v1/etl/stream` | **SSE** — emite un evento JSON por cada activo que se carga en tiempo real |

**Formato de eventos SSE del endpoint `/stream`:**
```
event: inicio
data: {"tipo":"inicio","mensaje":"Iniciando pipeline ETL — 20 activos","total":20}

event: activo
data: {"tipo":"activo","ticker":"AAPL","nombre":"Apple Inc.","mercado":"NASDAQ",
       "fuente":"YAHOO_FINANCE","barras":1260,"ultimoCierre":182.63,
       "precios":[180.1,181.3,...],"progreso":15,"total":20}

event: completo
data: {"tipo":"completo","totalBarras":25200,"duracionMs":8432,
       "activosYahoo":19,"activosPrng":1}
```

### Análisis financiero

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/analysis/similarity?tickerA=AAPL&tickerB=MSFT&days=252` | Similitud entre dos activos (Pearson, Coseno, Euclidiana, DTW) |
| `GET` | `/api/v1/analysis/correlation` | Matriz de correlación de Pearson 20×20 |
| `GET` | `/api/v1/analysis/risk` | Métricas de riesgo de todos los activos |
| `GET` | `/api/v1/analysis/risk/{ticker}` | Métricas de riesgo de un activo específico |

### Exportación

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/export/report` | Genera y descarga un reporte PDF completo del análisis |

**Formato estándar de respuesta:**
```json
{
  "exitoso": true,
  "datos": { ... },
  "mensaje": "OK",
  "timestamp": "2025-05-15T14:30:45.123456"
}
```

---

## Algoritmos implementados

### Similitud entre series temporales

#### 1. Correlación de Pearson
Mide si dos activos se mueven en la misma dirección de forma lineal.

```
ρ = Σ(xᵢ - x̄)(yᵢ - ȳ) / √[Σ(xᵢ - x̄)² · Σ(yᵢ - ȳ)²]
```
- Rango: -1 (opuestos totales) a +1 (idénticos)
- Complejidad: O(n)

#### 2. Similitud Coseno
Mide el ángulo entre dos vectores de retornos en el espacio n-dimensional.

```
cos(θ) = (a · b) / (‖a‖ · ‖b‖)
```
- Ignora la magnitud, solo considera la dirección
- Complejidad: O(n)

#### 3. Distancia Euclidiana
Mide qué tan parecida es la *forma* de dos series de precios (normalizadas con z-score).

```
d = √[Σ(xᵢ - yᵢ)²]
```
- Se normaliza a [0, 1] para comparación
- Complejidad: O(n)

#### 4. DTW (Dynamic Time Warping)
Alinea temporalmente dos series, permitiendo que eventos similares ocurran en momentos ligeramente distintos. Usa la banda de Sakoe-Chiba para reducir la complejidad.

```
DTW(i,j) = dist(xᵢ, yⱼ) + min(DTW(i-1,j), DTW(i,j-1), DTW(i-1,j-1))
```
- Complejidad con banda w: O(n·w), donde w << n (por defecto w=20 días)
- Ideal para detectar patrones temporalmente desfasados

---

### Métricas de riesgo

#### Volatilidad anualizada
```
σ_anual = σ_diaria × √252
```
- σ_diaria = desviación estándar de los retornos logarítmicos diarios
- 252 = días hábiles de negociación por año

#### Clasificación de riesgo
| Categoría | Volatilidad anualizada |
|-----------|------------------------|
| Conservador | < 15% |
| Moderado | 15% – 30% |
| Agresivo | > 30% |

#### Detección de patrones
- **Rachas alcistas (↑×3)**: ventanas de 3 días consecutivos donde el cierre sube.
- **Rachas bajistas (↓×3)**: ventanas de 3 días consecutivos donde el cierre baja.
- **Alta volatilidad**: ventanas de 30 días con σ por encima del promedio histórico.

---

### Algoritmos de ordenamiento (benchmark)

Todos implementados desde cero en TypeScript, sin usar `Array.sort()`:

| Algoritmo | Complejidad temporal | Espacio | Estable |
|-----------|---------------------|---------|---------|
| GnomeSort | O(n²) | O(1) | Sí |
| BinaryInsertionSort | O(n²) | O(1) | Sí |
| HeapSort | O(n log n) | O(1) | No |
| QuickSort | O(n log n)* | O(log n) | No |
| BitonicSort | O(n log² n) | O(log² n) | No |
| TimSort | O(n log n) | O(n) | Sí |
| CombSort | O(n²) | O(1) | No |
| SelectionSort | O(n²) | O(1) | No |
| TreeSort | O(n log n) | O(n) | No |
| BucketSort | O(n + k) | O(n) | Sí |
| RadixSort | O(d · n) | O(n+k) | Sí |
| PigeonholeSort | O(n + rango) | O(rango) | Sí |

El tiempo se mide con `performance.now() × 1,000,000` para obtener nanosegundos. Se promedian 6 ejecuciones por algoritmo.

---

### Pipeline ETL

El pipeline tiene 4 etapas, todas implementadas en Java puro:

```
Extract   →  Transform  →  Load    →  Validate
Yahoo        align         Map<>       schema +
Finance      interpolate   OHLCV       outlier z
API          clean         memory      detection
```

1. **Extract**: peticiones HTTP nativas con `java.net.http.HttpClient` (Java 21). URL: `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=5y`. Hasta 3 reintentos con backoff lineal (1s, 2s, 3s). Si falla: PRNG mulberry32 con semilla fija por activo.

2. **Transform**: alineación de calendarios bursátiles (BVC / NYSE / NASDAQ), detección de huecos en fechas, interpolación lineal de valores faltantes (O(n)), corrección de anomalías OHLCV (High ≥ Low, precios > 0, etc.).

3. **Load**: almacenamiento en `ConcurrentHashMap<String, List<BarraOhlcv>>` para acceso O(1) por ticker, thread-safe para peticiones concurrentes.

4. **Validate**: verificación de esquema OHLCV, detección de cambios diarios >50%, generación de informe `DtoInformeLimpieza` por activo.

---

## Los 20 activos del portafolio

### BVC — Bolsa de Valores de Colombia
| Ticker | Empresa | Sector | Símbolo Yahoo |
|--------|---------|--------|---------------|
| ECOPETROL | Ecopetrol S.A. | Energía | EC |
| ISA | Interconexión Eléctrica | Utilities | ISA |
| GEB | Grupo Energía Bogotá | Utilities | GEB.CL |
| PFBCOLOM | Bancolombia Pref. | Financiero | CIB |
| GRUPOSURA | Grupo SURA | Financiero | GRUPOSURA.CL |
| NUTRESA | Grupo Nutresa | Consumo | NUTRESA.CL |
| CEMARGOS | Cementos Argos | Materiales | CEMARGOS.CL |
| PFAVAL | Grupo Aval Pref. | Financiero | AVAL |
| CELSIA | Celsia S.A. | Utilities | CELSIA.CL |
| EXITO | Almacenes Éxito | Consumo | PRNG Fallback |

### ETFs Internacionales
| Ticker | Fondo | Mercado | Símbolo Yahoo |
|--------|-------|---------|---------------|
| VOO | Vanguard S&P 500 ETF | AMEX | VOO |
| CSPX | iShares Core S&P 500 | AMEX | CSPX.L |
| QQQ | Invesco QQQ Trust | NASDAQ | QQQ |
| SPY | SPDR S&P 500 ETF | AMEX | SPY |

### Acciones — EE.UU.
| Ticker | Empresa | Sector | Símbolo Yahoo |
|--------|---------|--------|---------------|
| AAPL | Apple Inc. | Tecnología | AAPL |
| MSFT | Microsoft | Tecnología | MSFT |
| NVDA | NVIDIA | Tecnología | NVDA |
| TSLA | Tesla | Automotriz | TSLA |
| JPM | JPMorgan Chase | Financiero | JPM |
| XOM | Exxon Mobil | Energía | XOM |

> **Nota sobre EXITO**: El símbolo `EXTO.CL` no está disponible en Yahoo Finance, por lo que siempre usa el generador PRNG mulberry32 con semilla fija (reproducible).

---

## Estructura del proyecto

```
ANALISIS-FINANCIERO-QUANTA/
│
├── README.md                          ← Este archivo
├── docker-compose.yml                 ← Levanta backend + frontend con Docker
├── .gitignore
│
├── backend/                           ← API Spring Boot (Java 21)
│   ├── pom.xml                        ← Dependencias Maven
│   ├── Dockerfile
│   └── src/main/java/com/quanta/analisis/
│       ├── AplicacionQuanta.java      ← Punto de entrada
│       ├── controlador/
│       │   ├── ControladorActivos.java    ← GET /api/v1/assets
│       │   ├── ControladorAnalisis.java   ← GET /api/v1/analysis/*
│       │   ├── ControladorAutenticacion.java ← POST /api/v1/auth/*
│       │   ├── ControladorEtl.java        ← GET /api/v1/etl/stream (SSE)
│       │   └── ControladorExportacion.java ← GET /api/v1/export/report
│       ├── servicio/
│       │   ├── ServicioActivos.java       ← ETL principal + callback streaming
│       │   ├── ServicioYahooFinance.java  ← Descarga desde Yahoo Finance API
│       │   ├── ServicioLimpiezaDatos.java ← Transform: gaps, anomalías, interpolación
│       │   ├── ServicioEtl.java           ← Orquestador ETL + correlación
│       │   ├── ServicioSimilitud.java     ← Pearson, Coseno, Euclidiana, DTW
│       │   ├── ServicioRiesgo.java        ← Volatilidad, CAGR, patrones
│       │   └── ServicioExportacionPdf.java ← Generación de PDF
│       ├── dominio/modelo/
│       │   ├── Activo.java                ← Entidad activo financiero
│       │   └── BarraOhlcv.java            ← Barra OHLCV diaria
│       ├── dto/
│       │   ├── DtoActivo.java
│       │   ├── DtoBarraOhlcv.java
│       │   ├── DtoEstadoEtl.java
│       │   ├── DtoEventoEtl.java          ← Eventos SSE del stream
│       │   ├── DtoMatrizCorrelacion.java
│       │   ├── DtoMetricasRiesgo.java
│       │   └── DtoResultadoSimilitud.java
│       ├── algoritmo/
│       │   ├── AlgoritmosFinancieros.java ← Pearson, retornos, SMA, etc.
│       │   └── GeneradorDatos.java        ← PRNG mulberry32 fallback
│       └── configuracion/
│           ├── ConfiguracionCors.java     ← CORS para el frontend
│           └── ConfiguracionSeguridad.java ← Spring Security + JWT
│
└── frontend/                          ← SPA React 19 + TanStack
    ├── package.json
    ├── vite.config.ts
    ├── Dockerfile
    └── src/
        ├── rutas/                     ← Páginas (file-based routing)
        │   ├── __root.tsx             ← Layout raíz con AuthGuard
        │   ├── index.tsx              ← Resumen del portafolio
        │   ├── etl.tsx                ← ETL + ejecución en tiempo real
        │   ├── graficos.tsx           ← Velas + heatmap de correlación
        │   ├── similitud.tsx          ← Comparador de pares
        │   ├── riesgo.tsx             ← Tabla de riesgo y patrones
        │   └── ordenamiento.tsx       ← Benchmark de algoritmos
        ├── componentes/panel/
        │   ├── AppHeader.tsx          ← Barra de navegación con los 6 módulos
        │   ├── CandlestickChart.tsx   ← Gráfico de velas en SVG nativo
        │   ├── CorrelationHeatmap.tsx ← Heatmap 20×20 en SVG
        │   ├── RiskTable.tsx          ← Tabla de riesgo ordenable
        │   ├── SimilarityPanel.tsx    ← Panel de similitud
        │   └── Primitives.tsx         ← Ticker, StatCard, SectionTitle
        └── lib/
            ├── finance-data.ts        ← Datos PRNG + algoritmos del frontend
            └── auth.ts                ← JWT, login, API_BASE
```

---

## Variables de entorno

El proyecto funciona sin configuración adicional en entorno local. Las únicas variables relevantes son:

**Backend (`application.yml` — ya configurado):**
```yaml
server:
  port: 8080

quanta:
  jwt:
    secret: QuantaLtdaAlgorithmicMarketLabSecretKey2024!XYZ#AbCdEfGhIj
    expiration: 86400000   # Token válido 24 horas
  cors:
    allowed-origins: http://localhost:5173,http://localhost:8081
```

**Frontend:**  
La URL del backend está definida en `frontend/src/lib/auth.ts`:
```ts
export const API_BASE = 'http://localhost:8080/api/v1';
```

---

## Autor

**Luis Alberto Torres - Jhon Stivenson Mendez - Roginson Daniel Gañan**  
GitHub: [@Luistorres1221](https://github.com/Luistorres1221)  
Correo: pruebapruebatorres@gmail.com  
Proyecto: Quanta · Mercado Algoritmico — 2026
