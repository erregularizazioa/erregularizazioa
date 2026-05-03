# Casos de validacion controlada

## Objetivo

Comprobar la salida actual de la app frente a escenarios representativos que puedan revisarse internamente o por personas expertas.

Estos casos no sustituyen expedientes reales, pero sirven como bateria controlada para detectar simplificaciones peligrosas o regresiones.

## Caso 1. PI anterior al 01/01/2026 con documentacion completa

**Entrada**

- persona adulta
- solicitud de Proteccion Internacional antes del 01/01/2026
- presencia previa y 5 meses acreditables
- identidad disponible
- sin antecedentes detectados

**Salida esperada**

- ruta: **Proteccion Internacional**
- tono: **ok**
- documentos clave:
  - `doc-form-pi-ex31`
  - `doc-pi-proof`
  - `doc-fee-790-052`
- pasos clave:
  - `step-provisional-permit`
  - `step-pi-desist`

**Motivo**

Es el caso base de PI bien preparado y permite verificar que la app no lo mezcle con la via por irregularidad.

---

## Caso 2. Irregularidad por trabajo con penales aun pendientes

**Entrada**

- persona adulta
- no PI
- presencia previa y 5 meses acreditables
- criterio especifico: trabajo
- identidad disponible
- antecedentes aun no cerrados

**Salida esperada**

- ruta: **Situacion administrativa irregular**
- tono: **warn**
- documentos clave:
  - `doc-form-irregular-ex32`
  - `doc-work-proof`
- pasos clave:
  - `step-filing-window`
  - `step-expulsion-review`

**Motivo**

Comprueba que la app mantiene la via correcta pero no da el caso por listo si falta un requisito penal.

---

## Caso 3. Menor nacido en Espana con progenitor/tutor regular

**Entrada**

- menor
- nacimiento en Espana
- progenitor o tutor en situacion regular
- escolarizacion aplicable

**Salida esperada**

- ruta: **Menor nacido en Espana con progenitor/tutor regular**
- tono: **warn**
- documentos clave:
  - `doc-form-minor-ex25`
  - `doc-minor-birth-cert-spain`
  - `doc-minor-guardian-regular-status`
- pasos clave:
  - `step-minor-regular-route`
  - `step-minor-regular-filing`

**Motivo**

Valida que la app ya no absorbe este supuesto dentro de un “caso familiar” generico.

---

## Caso 4. Menor nacido en el extranjero con progenitor/tutor irregular y custodia exclusiva

**Entrada**

- menor
- nacimiento en el extranjero
- progenitor o tutor en situacion irregular
- custodia o autorizacion del otro progenitor necesaria
- escolarizacion aplicable

**Salida esperada**

- ruta: **Menor nacido en el extranjero con progenitor/tutor irregular**
- tono: **warn**
- documentos clave:
  - `doc-form-minor-ex31-ex32`
  - `doc-minor-birth-cert-abroad`
  - `doc-minor-custody-proof`
- pasos clave:
  - `step-minor-irregular-filing`
  - `step-minor-irregular-follow-up`

**Motivo**

Es uno de los supuestos con mas riesgo de quedarse corto documentalmente.

---

## Caso 5. Posible compromiso de no retorno

**Entrada**

- persona adulta
- por lo demas podria encajar en irregularidad
- hay indicio claro de compromiso de no retorno vigente

**Salida esperada**

- ruta: **Otra via**
- tono: **stop**
- resultado de cautela: derivacion a revision especializada

**Motivo**

Sirve para comprobar que la app no sigue orientando como si fuera un encaje ordinario cuando hay una exclusion relevante.

## Uso recomendado

1. Revisar cada caso en la app.
2. Comparar la salida real con esta ficha.
3. Si una persona experta discrepa, registrar:
   - que regla discrepa
   - que salida esperaba
   - si el problema es de logica, wording o checklist

## Relacion con tests

Estos cinco casos estan reflejados tambien en `tests/logic.test.js`, para que la validacion controlada no dependa solo de revision manual.
