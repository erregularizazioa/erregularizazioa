# Regularizazioa 2026

Formulario web publico para orientar casos de la regularizacion extraordinaria 2026 en Espana.

La pagina publica es estatica y no guarda datos. Sirve para rellenar la ficha, revisar la orientacion, imprimirla o copiar un resumen. El codigo es publico por diseno porque se publica en GitHub Pages.

## Desarrollo

```bash
npm install
npm run build:pages
npm test
```

`npm run build:pages` genera `dist/pages/`.

## GitHub Pages

El build genera estas entradas:

- `index.html` -> formulario publico completo, sin login ni guardado
- `simulador.html` -> alias del mismo formulario publico
- `private.html` -> formulario privado con login de Supabase para el equipo

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

La pagina publica no escribe en ninguna base de datos, asi que no hay endpoint publico que proteger. La parte sensible es `private.html`: ahi la proteccion real depende de Supabase Auth, RLS y CAPTCHA verificado por Supabase.

Para activar CAPTCHA en el login privado:

1. Crea un widget de Cloudflare Turnstile para `erregularizazioa.github.io`.
2. En Supabase, ve a **Authentication -> Bot and Abuse Protection**, activa CAPTCHA, elige Turnstile y pega el secret key.
3. En `pages/config.js`, pega el site key publico en `captchaSiteKey`.

La clave anon/publicable de Supabase en `pages/config.js` no es un secreto. Las tablas deben seguir protegidas con RLS.

## Supabase Privado

Aplica el esquema:

```bash
SUPABASE_DB_PASSWORD="[PASSWORD]" npm run supabase:apply
```

O con conexion completa:

```bash
SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" npm run supabase:apply
```

Despues crea manualmente las cuentas autorizadas en **Authentication -> Users**.

## Estructura

| Fichero / Carpeta | Descripcion |
|---|---|
| `index.html` | Formulario y orientacion principal |
| `app.js` | Controlador de UI |
| `logic.js` | Logica pura de elegibilidad y checklists |
| `translations.js` | Textos ES/FR |
| `styles.css` | Estilos |
| `pages/config.js` | Configuracion publica de Supabase y CAPTCHA |
| `pages/supabase-web.js` | Login y guardado privado con Supabase |
| `scripts/build-pages.js` | Genera `dist/pages/` |
| `supabase/schema.sql` | Esquema y politicas RLS |

## Aviso

Esta herramienta orienta segun la documentacion oficial disponible pero no sustituye asesoramiento juridico.
