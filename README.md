# Regularizazioa 2026

Formulario web publico para recoger solicitudes de ayuda sobre la regularizacion extraordinaria 2026 en Espana.

La pagina publica se publica en GitHub Pages, muestra una ficha ligera pensada para que la rellene directamente la persona interesada y envia los datos a Supabase despues de validar Cloudflare Turnstile en una Edge Function. El codigo del navegador es publico por diseno.

La logica completa de orientacion sigue en `logic.js` y sus tests, pero no se carga en la pagina publica. Queda disponible para un uso interno o local posterior sin hacer pesado el formulario publico.

## Desarrollo

```bash
npm install
npm run build:pages
npm test
```

`npm run build:pages` genera `dist/pages/`.

## GitHub Pages

El build genera estas entradas:

- `index.html` -> formulario publico completo con envio a Supabase
- `simulador.html` -> alias del mismo formulario publico

Para publicarlo en `https://github.com/erregularizazioa/erregularizazioa/`:

1. En GitHub, entra en **Settings -> Pages**.
2. En **Source**, elige **GitHub Actions**.
3. Haz push a `main`.

URL esperada:

```text
https://erregularizazioa.github.io/erregularizazioa/
```

## Seguridad

GitHub Pages solo sirve archivos estaticos. No puede guardar secretos ni verificar CAPTCHA por si mismo.

Por eso el navegador no escribe directamente en las tablas. El formulario llama a `public-submit`, una Supabase Edge Function que:

- verifica el token de Cloudflare Turnstile con `TURNSTILE_SECRET_KEY`
- inserta el caso en Supabase con `SUPABASE_SERVICE_ROLE_KEY`
- no expone datos guardados al publico

La clave `captchaSiteKey` de `pages/config.js` es publica por diseno. La clave secreta de Turnstile no va en GitHub ni en JavaScript.

La clave anon/publicable de Supabase en `pages/config.js` tampoco es un secreto. Las tablas deben seguir protegidas con RLS y sin permisos `anon`.

## Supabase

Aplica el esquema:

```bash
SUPABASE_DB_PASSWORD="[PASSWORD]" npm run supabase:apply
```

O con conexion completa:

```bash
SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" npm run supabase:apply
```

Despliega la Edge Function:

```bash
supabase functions deploy public-submit --project-ref fyvnthqkwoolfifnhdyu
```

Configura el secret de Turnstile en Supabase:

```bash
supabase secrets set TURNSTILE_SECRET_KEY="[SECRET]" --project-ref fyvnthqkwoolfifnhdyu
```

## Estructura

| Fichero / Carpeta | Descripcion |
|---|---|
| `index.html` | Formulario publico ligero |
| `app.js` | Controlador del formulario publico y envio |
| `logic.js` | Logica pura de elegibilidad y checklists, reservada para uso interno/local |
| `translations.js` | Textos ES/FR |
| `styles.css` | Estilos |
| `pages/config.js` | Configuracion publica de Supabase y CAPTCHA |
| `scripts/build-pages.js` | Genera `dist/pages/` |
| `supabase/schema.sql` | Esquema y politicas RLS |
| `supabase/functions/public-submit/` | Edge Function que verifica CAPTCHA e inserta casos |

## Aviso

Esta herramienta orienta segun la documentacion oficial disponible pero no sustituye asesoramiento juridico.
