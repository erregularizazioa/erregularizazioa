# Regularizazioa 2026

Herramienta de escritorio para voluntarios/as que acompañan casos de la **regularizacion extraordinaria 2026** en España.

Cada ficha reune en un solo sitio: datos del caso, analisis de elegibilidad paso a paso, lista de documentacion, pasos del proceso y seguimiento. Los datos se guardan en una base de datos SQLite local. El Excel se exporta con un clic y ahora tambien hay **copia/restauracion de la base local**.

---

## Arrancar en desarrollo

```bash
npm install
npm start
```

## Construir el ejecutable portable

```bash
# Windows → dist/Regularizazioa-2026-portable.exe
npm run build:win

# macOS → dist/Regularizazioa-2026-mac.zip
npm run build:mac

# Linux → dist/Regularizazioa-2026.AppImage
npm run build:linux
```

No requiere instalacion. En Windows basta con ejecutar el `.exe` directamente.

---

## Generar version estatica para GitHub Pages

```bash
npm run build:pages
```

Esto genera `dist/pages/` con una version **solo de consulta**: mantiene el simulador, las traducciones, la logica de orientacion y las opciones de imprimir/copiar resumen, pero **no guarda casos**, **no restaura copias** y **no exporta a Excel**.

### Publicacion automatica en GitHub Pages

El repositorio incluye `.github/workflows/deploy-pages.yml`, que publica automaticamente `dist/pages/` en GitHub Pages cuando haces push a `main`.

Para activarlo en el repo `joanesplazaola/erregularizazioa`:

1. Sube este proyecto al repositorio.
2. En GitHub, entra en **Settings → Pages**.
3. En **Source**, elige **GitHub Actions**.
4. Haz push a `main`.

La URL esperada sera:

```text
https://joanesplazaola.github.io/erregularizazioa/
```

---

## Estructura del proyecto

| Fichero / Carpeta | Descripcion |
|---|---|
| `main.js` | Proceso principal de Electron: ventana, IPC, arranque de la BD |
| `preload.js` | Puente seguro entre el proceso principal y la UI |
| `db.js` | Capa SQLite (`sql.js`): CRUD de casos, generacion de IDs, exportacion a Excel |
| `index.html` | Interfaz completa: ficha unica, wizard de analisis, tabla de casos |
| `styles.css` | Diseño visual |
| `logic.js` | Logica pura de elegibilidad y generacion de checklists (sin dependencias, testeable en Node) |
| `app.js` | Controlador de la UI: conecta la logica con el DOM y la API de Electron |
| `.github/workflows/deploy-pages.yml` | Workflow que construye `dist/pages/` y lo despliega en GitHub Pages |
| `scripts/build-pages.js` | Copia la UI compartida a `dist/pages/` para publicar una version estatica |
| `translations.js` | Traducciones ES/FR usadas por la UI |
| `tests/logic.test.js` | Tests de logica pura |
| `tests/app.test.js` | Tests DOM/integracion con jsdom |
| `tests/db.test.js` | Tests de base de datos, backup/restauracion y versionado |
| `tests/e2e/` | Tests Playwright de flujos reales en navegador |
| `docs/originals/` | PDFs originales de la normativa |
| `docs/extracted/` | Contenido de los PDFs extraido a Markdown |
| `docs/processed/` | Resumen operativo de las reglas en lenguaje claro |

---

## Tests

```bash
npm test
```

---

## Aviso

Esta herramienta orienta segun la documentacion oficial disponible pero **no sustituye asesoramiento juridico**.
