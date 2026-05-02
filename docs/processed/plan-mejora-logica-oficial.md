# Plan de mejora de la logica oficial

## Objetivo

Convertir las reglas extraidas de la documentacion oficial en una logica de orientacion **mas precisa, prudente y trazable**, reduciendo el riesgo de simplificaciones peligrosas en casos reales.

## Fuentes revisadas

- `docs/originals/ARRAIGO EXTRAORDINARIO hojas Informativas.docx.pdf`
- `docs/originals/REGULARIZACIÓN EXTRAORDINARIA.pdf`

## Estado actual resumido

La app ya incorpora parte importante del arbol principal:

- ruta de **Proteccion Internacional** anterior al 01/01/2026
- ruta de **situacion administrativa irregular**
- identificacion de **menores** como caso diferenciado
- requisitos generales de **presencia antes del 01/01/2026** y **5 meses continuados**
- criterios especificos de irregularidad: **trabajo**, **unidad familiar** y **vulnerabilidad**
- controles basicos de **identidad**, **antecedentes penales**, **permiso en vigor** y **expediente pendiente**

Eso da una buena base de orientacion inicial, pero **todavia no equivale a la logica completa de los documentos oficiales**.

## Principios de mejora

1. **Prudencia primero**: si una regla no esta claramente soportada por la documentacion, la app debe advertir, no asumir.
2. **Trazabilidad**: cada nueva regla debe poder vincularse a una fuente documental concreta.
3. **Granularidad util**: distinguir rutas que cambian formularios, documentos o consecuencias.
4. **Cobertura integral**: cada mejora debe revisar logica, UI y tests.
5. **No sustituir asesoramiento juridico**: la app orienta; no decide de forma definitiva.

## Carencias y mejoras detectadas

### 1. Ruta de menores demasiado simplificada

**Situacion actual**

La app trata a menores como un caso generico de "caso familiar".

**Problema**

Los documentos oficiales distinguen al menos:

- menor nacido en Espana
- menor nacido en el extranjero
- progenitor/tutor en situacion regular
- progenitor/tutor en situacion irregular
- requisitos de escolarizacion
- acreditacion de representacion legal, tutela, custodia o autorizacion del otro progenitor
- discapacidad cuando corresponda
- efectos distintos de vigencia y formulario

**Riesgo**

Esta simplificacion puede ocultar documentos clave o inducir a elegir la via incorrecta.

**Mejora propuesta**

- crear una ruta de menores especifica, no solo un aviso generico
- distinguir subcasos relevantes en el wizard
- generar checklist y pasos propios para cada subruta
- reflejar formularios y documentos segun el supuesto

**Prioridad**

Muy alta.

---

### 2. Formularios oficiales no modelados con precision

**Situacion actual**

La app habla de "formulario oficial" sin concretar el modelo.

**Problema**

La documentacion diferencia:

- **EX-31** para solicitantes de Proteccion Internacional en la via indicada
- **EX-32** para arraigo extraordinario por actividad laboral, unidad familiar, vulnerabilidad y ciertos supuestos de menores
- **EX-25** para menor con progenitor/tutor en situacion regular

**Riesgo**

Un formulario incorrecto invalida la preparacion practica del caso.

**Mejora propuesta**

- determinar formulario exacto por ruta
- mostrarlo en diagnostico, checklist y exportacion
- cubrirlo con tests por cada escenario

**Prioridad**

Muy alta.

---

### 3. Checklists documentales todavia demasiado genericos

**Situacion actual**

La app ya pide documentos comunes y algunos especificos, pero no aterriza todos los requisitos relevantes.

**Problema**

Faltan o estan poco definidos, segun la via:

- justificante de tasa con mas precision
- documentacion acreditativa del vinculo familiar
- documentacion acreditativa de convivencia
- certificado de vulnerabilidad
- declaracion responsable de trabajo por cuenta propia
- escolarizacion obligatoria de menores
- certificado de nacimiento en Espana o en el extranjero
- tutela, patria potestad, custodia o consentimiento del otro progenitor
- discapacidad cuando proceda
- documentacion previa recomendable para agilizar tramitacion

**Mejora propuesta**

- separar documentos comunes y documentos especificos por subruta
- reflejar el nombre practico del documento a reunir
- marcar con claridad que documentos extranjeros deben traducirse/legalizarse cuando aplique

**Prioridad**

Muy alta.

---

### 4. Falta de condiciones generales de exclusion o cautela

**Situacion actual**

La app controla algunas exclusiones, pero no todas las mencionadas en los PDFs.

**Faltan especialmente**

- amenaza para el orden publico
- seguridad publica
- salud publica
- figurar como rechazable en territorio con convenio
- estar dentro del plazo de compromiso de no retorno

**Riesgo**

La app puede mostrar un encaje demasiado optimista.

**Mejora propuesta**

- introducir preguntas o banderas de cautela
- cuando no pueda orientarse con seguridad, mostrar derivacion a revision especializada

**Prioridad**

Alta.

---

### 5. Procedimiento y consecuencias practicas incompletas

**Situacion actual**

La app orienta sobre presentar por via telematica o presencial, pero no cubre bien el resto del flujo.

**Faltan especialmente**

- plazo de solicitud
- presentacion presencial concreta y telematica
- admision a tramite
- permiso provisional de residencia y trabajo desde la admision
- plazo maximo de resolucion
- efecto sobre devolucion o expulsion
- TIE y pasos posteriores

**Mejora propuesta**

- convertir estas reglas en pasos del proceso segun la ruta
- revisar mensajes para no inducir a error donde haya variaciones territoriales o practicas administrativas

**Prioridad**

Alta.

---

### 6. Tratamiento de expedientes pendientes mejorable

**Situacion actual**

La app avisa de no duplicar solicitud si hay expediente pendiente.

**Problema**

La documentacion habla de exclusiones y procedimientos interesados con un alcance mas fino que el actual.

**Mejora propuesta**

- revisar si la pregunta actual cubre bien renovacion, prorroga, modificacion u otras solicitudes en tramite
- ajustar mensajes para diferenciar mejor "no encaja", "revisar antes" y "derivar"

**Prioridad**

Media-alta.

---

### 7. Reglas formales de presentacion documental no reflejadas

**Faltan especialmente**

- traduccion jurada cuando aplique
- legalizacion/apostilla cuando corresponda
- aportacion de copias y exhibicion de originales

**Mejora propuesta**

- añadir notas estructurales comunes al checklist
- distinguir entre documento principal y requisito formal del documento

**Prioridad**

Media-alta.

---

### 8. Informacion util para acelerar el caso no se esta aprovechando

Los documentos recomiendan aportar material previo de estancia o expediente, incluso si fue denegatorio, para agilizar la tramitacion:

- solicitudes previas
- acuerdos de devolucion
- estancias en CIE/CETI cuando aplique
- cartas de invitacion
- denegaciones previas de proteccion internacional
- expedientes de expulsion por estancia irregular

**Mejora propuesta**

- incluir una seccion de documentacion complementaria recomendable
- no tratarla como requisito duro, sino como acelerador o soporte

**Prioridad**

Media.

## Orden recomendado de implementacion

### Fase 1. Menores y subrutas familiares

Objetivo: eliminar la simplificacion mas peligrosa.

Cambios esperados:

- ampliar `logic.js` con una ruta especifica de menores
- ampliar preguntas en `index.html`
- adaptar `app.js` para nuevas respuestas y checklists
- añadir tests unitarios y de UI

### Fase 2. Formularios y documentacion exacta por ruta

Objetivo: pasar de orientacion general a preparacion documental mas fiable.

Cambios esperados:

- formulario correcto por ruta
- checklist comun + especifico por supuesto
- notas de traduccion/legalizacion/originales
- exportacion y resumen mas precisos

### Fase 3. Exclusiones y cautelas avanzadas

Objetivo: reducir falsos positivos de encaje.

Cambios esperados:

- nuevas preguntas de exclusion/cautela
- resultados mas prudentes
- derivaciones claras cuando no sea seguro orientar

### Fase 4. Flujo procedimental y seguimiento

Objetivo: reflejar mejor lo que ocurre despues de preparar el expediente.

Cambios esperados:

- pasos del procedimiento segun la via
- hitos de admision, resolucion, TIE y efectos asociados
- mejor seguimiento operativo del caso

## Criterios de aceptacion para cada mejora

No deberiamos dar una mejora por cerrada si no cumple todo esto:

1. la regla esta respaldada por documentacion oficial revisada
2. la UI hace la pregunta correcta o muestra la cautela correcta
3. el resultado cambia de forma coherente en `logic.js`
4. el checklist documental y los pasos se actualizan
5. hay tests que cubren el nuevo comportamiento

## Primera conclusion operativa

La app **ya sirve como orientacion inicial**, pero necesita una segunda etapa de desarrollo para ser **mas segura en los detalles que cambian la tramitacion real**.

La primera mejora recomendada es **rehacer la logica de menores**. Despues, el siguiente bloque critico es **formularios y checklist exactos por ruta**.
