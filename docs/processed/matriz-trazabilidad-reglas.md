# Matriz de trazabilidad de reglas

## Objetivo

Vincular la logica implementada en la app con las fuentes documentales revisadas, para que cada regla relevante pueda auditarse, discutirse y validarse con mas seguridad.

## Fuentes base

- `docs/extracted/folleto-castellano-v3.md`
- `docs/extracted/preguntas-y-respuestas-actualizado.md`
- `docs/extracted/real-decreto-316-2026-boe.md`

## Leyenda de estado

- **Implementado**: ya existe en la app con preguntas, diagnostico o checklist.
- **Implementado con cautela**: existe, pero su aplicacion en la realidad puede requerir revision especializada.
- **Parcial**: la app cubre una parte util, pero no toda la precision del texto fuente.
- **Pendiente de validacion experta**: implementado a nivel de producto, pero todavia conviene contraste con casos reales o revision especializada.

## Matriz

| Regla / bloque | Estado | Fuente documental | App actual | Ficheros principales | Confianza | Siguiente validacion |
|---|---|---|---|---|---|---|
| Presencia en Espana antes del 01/01/2026 | **Implementado** | `folleto-castellano-v3.md:56-58` | Se pregunta en el wizard y bloquea la via si no se acredita. | `index.html`, `app.js`, `logic.js` | Alta | Verificar con casos reales que los mensajes distinguen bien falta de prueba vs. falta de requisito. |
| Permanencia ininterrumpida de 5 meses | **Implementado** | `folleto-castellano-v3.md:56-58`, `real-decreto-316-2026-boe.md:1400-1405` | Se pregunta y se usa como corte duro en adultos; en menores se refleja en la ruta simultanea. | `index.html`, `logic.js` | Alta | Revisar si en menores conviene pedirla explicitamente tambien en UI cuando la subruta lo exija. |
| Solicitante de Proteccion Internacional antes del 01/01/2026 | **Implementado** | `folleto-castellano-v3.md:75-84` | Ruta especifica PI con formulario, prueba documental y pasos posteriores. | `logic.js`, `translations.js` | Alta | Contrastar con ejemplos de PI denegada, recurrida y aun en tramite. |
| Via por situacion administrativa irregular con trabajo / familia / vulnerabilidad | **Implementado** | `folleto-castellano-v3.md:88-103`, `preguntas-y-respuestas-actualizado.md:263-273`, `real-decreto-316-2026-boe.md:976-999` | Se exige al menos uno de los tres supuestos y se generan documentos especificos por criterio. | `index.html`, `logic.js` | Alta | Validar wording de “intencion de trabajar” y declaracion responsable en casos reales. |
| Identidad: pasaporte / cedula / titulo de viaje | **Implementado** | `folleto-castellano-v3.md:134-145` | Si falta identidad, la via no se da por preparada y se marca como advertencia. | `logic.js`, `index.html` | Alta | Revisar si conviene distinguir mejor ausencia total de documento vs. documento caducado admisible. |
| Antecedentes penales | **Implementado** | `folleto-castellano-v3.md:59-60`, `folleto-castellano-v3.md:140-141` | Se usa como requisito de cautela en PI e irregularidad. | `logic.js`, `index.html` | Media-alta | Contrastar con practica de certificado extranjero, demoras y supuestos de via diplomatica. |
| Orden publico / seguridad publica / salud publica | **Implementado con cautela** | `folleto-castellano-v3.md:66-67`, `real-decreto-316-2026-boe.md:660-667`, `real-decreto-316-2026-boe.md:960-965` | La app ya no orienta positivamente: deriva a revision especializada. | `index.html`, `logic.js`, `translations.js` | Media | Revisar con perfiles expertos si el texto debe explicar mejor que no toda incidencia policial implica denegacion automatica. |
| Rechazable en territorio con convenio | **Implementado con cautela** | `folleto-castellano-v3.md:68-69`, `real-decreto-316-2026-boe.md:668-669`, `real-decreto-316-2026-boe.md:966-967` | Se pregunta y bloquea la orientacion ordinaria. | `index.html`, `logic.js` | Media | Contrastar con asesoria especializada para afinar el mensaje. |
| Compromiso de no retorno | **Implementado con cautela** | `folleto-castellano-v3.md:70`, `real-decreto-316-2026-boe.md:670`, `real-decreto-316-2026-boe.md:968-969` | Se pregunta y obliga a revision especializada. | `index.html`, `logic.js` | Media | Validar si conviene distinguir “seguro que si” de “hay indicios / no esta claro”. |
| Menores con progenitor/tutor regular vs. irregular | **Implementado** | `folleto-castellano-v3.md:108-125`, `real-decreto-316-2026-boe.md:1363-1413` | La vieja ruta generica se sustituyo por subrutas de menor con preguntas propias. | `index.html`, `app.js`, `logic.js` | Media-alta | Validar con expedientes tipo: menor con progenitor regular, menor con progenitor irregular y presentacion simultanea. |
| Menor nacido en Espana vs. en el extranjero | **Implementado** | Hojas informativas y lectura operativa reflejada en `docs/processed/plan-mejora-logica-oficial.md`; soporte normativo general en `real-decreto-316-2026-boe.md:1392-1405` | La app pregunta el origen del nacimiento y adapta documentacion y pasos. | `index.html`, `logic.js` | Media | Confirmar con documentacion operativa oficial si conviene reflejar aun mas claramente apostilla/traduccion solo para nacimiento en el extranjero. |
| Escolarizacion de menores | **Implementado** | Hojas informativas incorporadas al analisis previo; apoyo operativo en documentacion de menores ya resumida en repo | La app pregunta si aplica y lo mete en checklist. | `index.html`, `logic.js` | Media | Verificar wording exacto del documento esperado y si debe distinguir matricula vs. declaracion. |
| Custodia / tutela / autorizacion del otro progenitor | **Implementado** | Hojas informativas incorporadas al analisis previo | La app permite marcar si hace falta y lo incorpora al checklist. | `index.html`, `logic.js` | Media | Contrastar con casos reales para evitar sobrepedir documentacion cuando no aplica. |
| Discapacidad en menores / unidad familiar | **Implementado** | `folleto-castellano-v3.md:112-125`, `real-decreto-316-2026-boe.md:988-990`, `real-decreto-316-2026-boe.md:1389-1391` | Aparece en criterios familiares y en checklist de menores cuando procede. | `logic.js`, `index.html` | Media-alta | Revisar si hay que separar discapacidad del menor vs. familiar dependiente adulto. |
| Formularios EX-31 / EX-32 / EX-25 | **Implementado** | Hojas informativas revisadas + reglas operativas consolidadas en `docs/processed/plan-mejora-logica-oficial.md` | La app ya no usa un “formulario oficial” generico. | `logic.js`, `tests/logic.test.js` | Media-alta | Confirmar con revision experta el encaje exacto de EX-31 / EX-32 en menores con progenitor irregular. |
| Tasa 790-052 | **Implementado** | `folleto-castellano-v3.md:71`, `real-decreto-316-2026-boe.md:672-676`, hojas informativas para menores | Se refleja en checklist para adultos y menores. | `logic.js` | Media-alta | Afinar importes/epigrafes si cambia normativa o si hay subruta especial. |
| Traduccion jurada / legalizacion / apostilla | **Implementado** | Hojas informativas revisadas; reflejado como formalidad comun en el trabajo actual | Ya aparece como bloque documental comun y en nacimientos extranjeros. | `logic.js` | Alta para utilidad operativa, media para exhaustividad | Validar si conviene distinguir por documento concreto. |
| Copias y originales | **Implementado** | Hojas informativas revisadas | Reflejado como formalidad comun de presentacion. | `logic.js` | Alta | Revisar si debe mostrarse tambien en UI como nota fija. |
| Documentacion previa util (denegaciones, devolucion, etc.) | **Implementado** | Hojas informativas revisadas | Reflejada como documentacion complementaria recomendable. | `logic.js` | Media-alta | Quizas separarla visualmente de los requisitos duros. |
| Presentacion por Mercurio / Correos / Seguridad Social | **Implementado** | `folleto-castellano-v3.md:150-162`, `real-decreto-316-2026-boe.md:744-758`, `real-decreto-316-2026-boe.md:1065-1089` | Ya forma parte de los pasos de procedimiento y del resumen de guidance. | `logic.js` | Alta | Añadir despues textos mas diferenciados segun subruta. |
| Comunicacion de inicio y permiso provisional de residencia y trabajo | **Implementado** | `folleto-castellano-v3.md:167-170`, `preguntas-y-respuestas-actualizado.md:332-345`, `real-decreto-316-2026-boe.md:683-699`, `real-decreto-316-2026-boe.md:1029-1047` | Se refleja como hito de seguimiento, no como simple “resguardo”. | `logic.js` | Alta | Puede merecer una alerta visual separada en la ficha. |
| Plazo maximo de resolucion de 3 meses | **Implementado** | `real-decreto-316-2026-boe.md:697-724`, `real-decreto-316-2026-boe.md:1043-1059` | Ya aparece en pasos del procedimiento. | `logic.js` | Alta | Valorar luego una fecha objetivo automatica en seguimiento de caso. |
| Archivo de devolucion / expulsion en caso favorable | **Implementado con cautela** | `real-decreto-316-2026-boe.md:738-742`, `real-decreto-316-2026-boe.md:1060-1064` | Se incluye como paso de revision del expediente, no como promesa automatica. | `logic.js` | Media-alta | Contrastar con practica administrativa y comunicacion a usuarios. |
| Desistimiento de PI para tramitar TIE favorable | **Implementado** | `real-decreto-316-2026-boe.md:733-737` | Ya aparece como paso especifico solo en la ruta PI. | `logic.js` | Alta | Verificar wording con asesoria especializada. |
| Datos de contacto y notificaciones | **Parcial** | `preguntas-y-respuestas-actualizado.md:310-317` | La app recuerda revisar telefono, email y direccion, pero no distingue suficientemente representacion y canal de notificacion. | `logic.js`, `index.html` | Media | Mejorar despues la ficha de contacto / representante. |
| No exigir automaticamente lo que ya esta en poder de la Administracion | **Pendiente de validacion experta** | `folleto-castellano-v3.md:142-145` | La app lo menciona solo indirectamente; no se ha convertido en logica visible. | N/A | Baja-media | Decidir si debe aparecer como nota fija de checklist o como recordatorio operativo. |

## Riesgos aun abiertos

1. **Exactitud operativa de algunas subrutas de menores**: la app ya es mucho mejor, pero aun conviene revisar con expedientes reales si el modelo simplifica demasiado algunos casos.
2. **Formularios en menores con progenitor irregular**: ahora se informa como `EX-31 o EX-32 segun la presentacion simultanea`, pero esta es una zona que debe revisarse con especial cuidado.
3. **Exclusiones avanzadas**: el producto actua con prudencia y deriva, pero el detalle juridico de cada exclusion no esta modelado mas alla de esa cautela.
4. **Expedientes pendientes**: el tratamiento ha quedado relativamente conservador, pero aun puede afinarse mejor frente a renovacion, prorroga o modificacion.

## Siguiente bloque recomendado

El siguiente trabajo de mas valor ya no es añadir logica a ciegas, sino **validar esta matriz contra casos reales o semi-reales**, por ejemplo:

1. PI anterior al 01/01/2026 con identidad completa.
2. Irregularidad por trabajo con antecedentes aun pendientes.
3. Menor nacido en Espana con progenitor regular.
4. Menor nacido en el extranjero con progenitor irregular y custodia exclusiva.
5. Caso con posible no retorno o rechazable.

Eso permitiria revisar si la salida de la app coincide con lo que un equipo experto esperaria en cada escenario.
