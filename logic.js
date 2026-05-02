(function initLogic(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.RegularizacionLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function logicFactory() {
  const OFFICIAL_NOTE = "Orientacion basada en la documentacion oficial extraida del BOE, preguntas y respuestas publicas y folleto informativo incluido en esta carpeta.";

  const DEFAULT_ANSWERS = {
    personType: "adult",
    minorBirthPlace: "spain",
    minorGuardianStatus: "regular",
    minorSchoolingRequired: "yes",
    minorNeedsCustodyProof: "no",
    minorHasDisability: "no",
    validPermit: "no",
    ukraineProtection: "no",
    stateless: "no",
    publicOrderRisk: "no",
    publicHealthRisk: "no",
    rejectableRecord: "no",
    nonReturnCommitment: "no",
    pendingApplication: "no",
    beforeJan2026: "no",
    fiveMonths: "no",
    identityDocument: "no",
    criminalRecord: "unsure",
    piBefore2026: "no",
    irregularOptions: []
  };

  const CSV_HEADERS = [
    { key: "id", label: "ID" },
    { key: "caseName", label: "Nombre o alias" },
    { key: "phone", label: "Telefono" },
    { key: "email", label: "Email" },
    { key: "locality", label: "Municipio o provincia" },
    { key: "volunteer", label: "Persona voluntaria" },
    { key: "representativeName", label: "Representante" },
    { key: "representativePhone", label: "Telefono representante" },
    { key: "representativeEmail", label: "Email representante" },
    { key: "notificationTarget", label: "Notificaciones" },
    { key: "presentationByCollaborator", label: "Entidad colaboradora" },
    { key: "presentationPresenter", label: "Presentara" },
    { key: "presentationAuthorizationSigned", label: "Autorizacion firmada" },
    { key: "presentationDocumentsReady", label: "Documentacion completa" },
    { key: "presentationMercurioReady", label: "Lista para Mercurio" },
    { key: "presentationDate", label: "Fecha de presentacion" },
    { key: "presentationRegistryNumber", label: "Numero de registro" },
    { key: "route", label: "Ruta orientativa" },
    { key: "resultTitle", label: "Diagnostico" },
    { key: "caseStatus", label: "Estado del caso" },
    { key: "documentsPendingSummary", label: "Documentos pendientes" },
    { key: "stepsPendingSummary", label: "Pasos pendientes" },
    { key: "nextAction", label: "Proximo paso recomendado" },
    { key: "notes", label: "Notas" },
    { key: "createdAt", label: "Creado" },
    { key: "updatedAt", label: "Actualizado" }
  ];

  function buildResult(partial) {
    return {
      tone: "warn",
      title: "",
      summary: "",
      routeLabel: "",
      why: [],
      nextSteps: [],
      notes: [],
      ...partial
    };
  }

  function normalizeAnswers(rawAnswers) {
    return {
      ...DEFAULT_ANSWERS,
      ...rawAnswers,
      irregularOptions: Array.isArray(rawAnswers?.irregularOptions) ? rawAnswers.irregularOptions : []
    };
  }

  function normalizeChecks(rawChecks) {
    const nextChecks = {};
    Object.entries(rawChecks || {}).forEach(([key, value]) => {
      nextChecks[key] = Boolean(value);
    });
    return nextChecks;
  }

  function normalizeRepresentative(rawRepresentative) {
    return {
      id: String(rawRepresentative?.id || "").trim(),
      name: String(rawRepresentative?.name || rawRepresentative?.representativeName || "").trim(),
      phone: String(rawRepresentative?.phone || rawRepresentative?.representativePhone || "").trim(),
      email: String(rawRepresentative?.email || rawRepresentative?.representativeEmail || "").trim(),
      updatedAt: String(rawRepresentative?.updatedAt || "").trim()
    };
  }

  function normalizeCase(rawCase) {
    return {
      id: String(rawCase?.id || "").trim(),
      caseName: String(rawCase?.caseName || "").trim(),
      phone: String(rawCase?.phone || "").trim(),
      email: String(rawCase?.email || "").trim(),
      locality: String(rawCase?.locality || "").trim(),
      volunteer: String(rawCase?.volunteer || "").trim(),
      representativeName: String(rawCase?.representativeName || "").trim(),
      representativePhone: String(rawCase?.representativePhone || "").trim(),
      representativeEmail: String(rawCase?.representativeEmail || "").trim(),
      representativeId: String(rawCase?.representativeId || "").trim(),
      notificationTarget: String(rawCase?.notificationTarget || "persona").trim(),
      presentationByCollaborator: String(rawCase?.presentationByCollaborator || "").trim(),
      presentationPresenter: String(rawCase?.presentationPresenter || "").trim(),
      presentationAuthorizationSigned: String(rawCase?.presentationAuthorizationSigned || "").trim(),
      presentationDocumentsReady: String(rawCase?.presentationDocumentsReady || "").trim(),
      presentationMercurioReady: String(rawCase?.presentationMercurioReady || "").trim(),
      presentationDate: String(rawCase?.presentationDate || "").trim(),
      presentationRegistryNumber: String(rawCase?.presentationRegistryNumber || "").trim(),
      route: String(rawCase?.route || "").trim(),
      resultTitle: String(rawCase?.resultTitle || "").trim(),
      resultSummary: String(rawCase?.resultSummary || "").trim(),
      caseStatus: String(rawCase?.caseStatus || "Nuevo").trim(),
      nextDate: String(rawCase?.nextDate || "").trim(),
      nextAction: String(rawCase?.nextAction || "").trim(),
      notes: String(rawCase?.notes || "").trim(),
      documentsPendingSummary: String(rawCase?.documentsPendingSummary || "").trim(),
      stepsPendingSummary: String(rawCase?.stepsPendingSummary || "").trim(),
      answers: normalizeAnswers(rawCase?.answers),
      checks: normalizeChecks(rawCase?.checks),
      createdAt: String(rawCase?.createdAt || "").trim(),
      updatedAt: String(rawCase?.updatedAt || "").trim()
    };
  }

  function evaluateMinorAnswers(answers) {
    const bornInSpain = answers.minorBirthPlace === "spain";
    const guardianRegular = answers.minorGuardianStatus === "regular";
    const routeLabel = bornInSpain
      ? "Menor nacido en Espana con progenitor/tutor " + (guardianRegular ? "regular" : "irregular")
      : "Menor nacido en el extranjero con progenitor/tutor " + (guardianRegular ? "regular" : "irregular");
    const code = bornInSpain
      ? (guardianRegular ? "minor-spain-regular" : "minor-spain-irregular")
      : (guardianRegular ? "minor-abroad-regular" : "minor-abroad-irregular");
    const title = bornInSpain
      ? "Ruta especifica para menor nacido en Espana"
      : "Ruta especifica para menor nacido en el extranjero";
    const summary = guardianRegular
      ? "Este caso necesita una tramitacion especifica de menor con progenitor o tutor en situacion regular, con documentacion familiar y escolarizacion cuando corresponda."
      : "Este caso necesita una tramitacion especifica de menor con progenitor o tutor en situacion irregular, con documentacion familiar, escolarizacion y la via adecuada segun el supuesto.";
    const why = [
      bornInSpain
        ? "La documentacion oficial separa a menores nacidos en Espana de los nacidos en el extranjero."
        : "Para menores nacidos en el extranjero cambia la documentacion de nacimiento y, en su caso, su formalizacion.",
      guardianRegular
        ? "Tambien cambia la via cuando el progenitor o tutor ya esta en situacion regular."
        : "Tambien cambia la via cuando el progenitor o tutor esta en situacion irregular."
    ];
    const nextSteps = guardianRegular
      ? [
          "Confirmar el formulario y la documentacion del progenitor o tutor en situacion regular.",
          "Preparar nacimiento, representacion legal y escolarizacion antes de presentar."
        ]
      : [
          "Confirmar la subruta del menor junto con la situacion del progenitor o tutor en situacion irregular.",
          "Preparar nacimiento, representacion legal, escolarizacion y documentacion adicional antes de presentar."
        ];

    return buildResult({
      code,
      tone: "warn",
      title,
      summary,
      routeLabel,
      why,
      nextSteps,
      notes: [
        guardianRegular
          ? "La documentacion oficial remite estos casos a la via de menor con progenitor o tutor regular."
          : "La documentacion oficial exige afinar bien la ruta y no tratarlos como un simple caso familiar generico."
      ]
    });
  }

  function evaluateAnswers(rawAnswers) {
    const answers = normalizeAnswers(rawAnswers);

    if (answers.personType === "minor") {
      return evaluateMinorAnswers(answers);
    }

    if (answers.validPermit === "yes") {
      return buildResult({
        code: "valid-permit",
        tone: "stop",
        title: "Esta via no parece pensada para este caso",
        summary: "La regularizacion extraordinaria no esta dirigida a personas con autorizacion en vigor ni a expedientes de renovacion o prorroga.",
        routeLabel: "Otra via",
        why: [
          "Las guias publicas excluyen autorizaciones vigentes y renovaciones en curso."
        ],
        nextSteps: [
          "Revisar el expediente ya abierto por la via ordinaria.",
          "No duplicar solicitudes sin asesoramiento."
        ]
      });
    }

    if (answers.ukraineProtection === "yes" || answers.stateless === "yes") {
      return buildResult({
        code: "excluded",
        tone: "stop",
        title: "Corresponde otro procedimiento",
        summary: "La documentacion publica indica que esta regularizacion no es la via aplicable para proteccion temporal por Ucrania ni para apatridia.",
        routeLabel: "Otra via",
        why: [
          answers.ukraineProtection === "yes" ? "La proteccion temporal por Ucrania tiene una via separada." : null,
          answers.stateless === "yes" ? "La apatridia cuenta con normativa y procedimiento propios." : null
        ].filter(Boolean),
        nextSteps: [
          "Confirmar la via especifica que corresponde antes de presentar nada."
        ]
      });
    }

    if (
      answers.publicOrderRisk === "yes" ||
      answers.publicHealthRisk === "yes" ||
      answers.rejectableRecord === "yes" ||
      answers.nonReturnCommitment === "yes"
    ) {
      return buildResult({
        code: "advanced-exclusion",
        tone: "stop",
        title: "Hace falta revision especializada antes de seguir",
        summary: "Hay una exclusion o cautela grave en la documentacion oficial y no conviene orientar esta presentacion como un encaje ordinario sin revision especializada.",
        routeLabel: "Otra via",
        why: [
          answers.publicOrderRisk === "yes" ? "Puede existir una incidencia de orden o seguridad publica." : null,
          answers.publicHealthRisk === "yes" ? "Puede existir una incidencia de salud publica que requiere revision." : null,
          answers.rejectableRecord === "yes" ? "La persona puede figurar como rechazable en territorio con convenio." : null,
          answers.nonReturnCommitment === "yes" ? "La persona puede estar dentro del plazo de compromiso de no retorno." : null
        ].filter(Boolean),
        nextSteps: [
          "No presentar sin revisar antes el caso con una entidad especializada o asesoramiento juridico.",
          "Confirmar documentalmente cual es la exclusion activa y si existe alguna excepcion aplicable."
        ]
      });
    }

    if (answers.pendingApplication === "yes") {
      return buildResult({
        code: "pending-app",
        tone: "warn",
        title: "Primero hay que revisar el expediente ya presentado",
        summary: "Si ya existe una solicitud pendiente de arraigo u otras circunstancias excepcionales, lo normal es no duplicar la peticion.",
        routeLabel: "Revisar expediente previo",
        why: [
          "Las guias publicas indican que el expediente ya presentado sigue su curso.",
          "Conviene revisar el estado exacto antes de volver a solicitar."
        ],
        nextSteps: [
          "Localizar numero de expediente o resguardo.",
          "Confirmar con una entidad colaboradora si hace falta algun tramite adicional."
        ]
      });
    }

    if (answers.beforeJan2026 !== "yes" || answers.fiveMonths !== "yes") {
      return buildResult({
        code: "no-presence",
        tone: "stop",
        title: "Con estos datos no parece que encaje en esta via",
        summary: "La documentacion revisada exige presencia en Espana antes del 1 de enero de 2026 y 5 meses seguidos de permanencia antes de solicitar.",
        routeLabel: "Otra via",
        why: [
          "Ambos requisitos aparecen como condiciones generales del procedimiento."
        ],
        nextSteps: [
          "Revisar si se pueden conseguir mejores pruebas de estancia o permanencia.",
          "Si no es posible, estudiar otras vias ordinarias."
        ]
      });
    }

    if (answers.piBefore2026 === "yes") {
      if (answers.identityDocument !== "yes") {
        return buildResult({
          code: "pi-identity-warn",
          tone: "warn",
          title: "Puede encajar por Proteccion Internacional, pero antes hay que resolver la identidad",
          summary: "La via parece correcta, pero el simulador oficial exige pasaporte, cedula de inscripcion o titulo de viaje para poder solicitar.",
          routeLabel: "Proteccion Internacional",
          why: [
            "Las personas solicitantes de Proteccion Internacional anteriores al 1 de enero de 2026 estan incluidas.",
            "Sin documentacion de identidad no conviene dar la solicitud por preparada."
          ],
          nextSteps: [
            "Conseguir pasaporte, cedula de inscripcion o titulo de viaje.",
            "Revisar despues el resto de documentacion antes de presentar."
          ]
        });
      }

      if (answers.criminalRecord !== "yes") {
        return buildResult({
          code: "pi-warn",
          tone: "warn",
          title: "Puede encajar por Proteccion Internacional, pero antes hay que resolver penales",
          summary: "La via parece correcta, pero falta cerrar el requisito de antecedentes penales o su acreditacion.",
          routeLabel: "Proteccion Internacional",
          why: [
            "Las personas solicitantes de Proteccion Internacional anteriores al 1 de enero de 2026 estan incluidas.",
            "Aun asi, sigue siendo obligatorio acreditar la situacion penal."
          ],
          nextSteps: [
            "Pedir el certificado de antecedentes cuanto antes.",
            "Si tarda mas de un mes, preparar la via diplomatica excepcional."
          ]
        });
      }

      return buildResult({
        code: "pi-ok",
        tone: "ok",
        title: "Puede encajar por la via de Proteccion Internacional",
        summary: "Con estos datos, el caso puede entrar por la via de Proteccion Internacional si la documentacion queda completa.",
        routeLabel: "Proteccion Internacional",
        why: [
          "La solicitud de Proteccion Internacional anterior al 1 de enero de 2026 aparece expresamente incluida.",
          "Tambien deben cumplirse los requisitos generales de permanencia y situacion penal."
        ],
        nextSteps: [
          "Revisar la documentacion completa antes de presentar.",
          "Elegir via telematica o presencial con cita."
        ],
        notes: [
          "Si la resolucion es favorable, para pedir la TIE habra que desistir de la solicitud o recurso de Proteccion Internacional y aportar el resguardo."
        ]
      });
    }

    if (answers.irregularOptions.length === 0) {
      return buildResult({
        code: "irregular-no-criteria",
        tone: "warn",
        title: "Falta justificar la via por situacion administrativa irregular",
        summary: "Ademas de los requisitos generales, hace falta acreditar trabajo o intencion de trabajar, unidad familiar o vulnerabilidad.",
        routeLabel: "Situacion administrativa irregular",
        why: [
          "La guia exige al menos uno de esos tres supuestos."
        ],
        nextSteps: [
          "Definir cual de los tres supuestos se va a acreditar.",
          "Reunir pruebas de trabajo, familia o vulnerabilidad."
        ]
      });
    }

    if (answers.identityDocument !== "yes") {
      return buildResult({
        code: "irregular-identity-warn",
        tone: "warn",
        title: "Puede encajar por irregularidad, pero antes hay que resolver la identidad",
        summary: "La via parece posible, pero el simulador oficial exige pasaporte, cedula de inscripcion o titulo de viaje para poder solicitar.",
        routeLabel: "Situacion administrativa irregular",
        why: [
          "Ya hay al menos un supuesto especifico marcado para esta via.",
          "Sin documentacion de identidad no conviene dar la solicitud por preparada."
        ],
        nextSteps: [
          "Conseguir pasaporte, cedula de inscripcion o titulo de viaje.",
          "Revisar despues el resto de documentacion antes de presentar."
        ]
      });
    }

    if (answers.criminalRecord !== "yes") {
      return buildResult({
        code: "irregular-warn",
        tone: "warn",
        title: "Puede encajar por irregularidad, pero antes hay que resolver penales",
        summary: "La via parece posible, pero falta cerrar el requisito de antecedentes penales o su acreditacion.",
        routeLabel: "Situacion administrativa irregular",
        why: [
          "El certificado de antecedentes es obligatorio en esta via.",
          "Sin ese requisito no conviene dar la solicitud por preparada."
        ],
        nextSteps: [
          "Pedir el certificado de antecedentes cuanto antes.",
          "Si tarda mas de un mes, preparar la via diplomatica excepcional."
        ]
      });
    }

    return buildResult({
      code: "irregular-ok",
      tone: "ok",
      title: "Puede encajar por la via de situacion administrativa irregular",
      summary: "Con estos datos, el caso puede entrar por la via extraordinaria si se acredita correctamente la documentacion general y el supuesto especifico elegido.",
      routeLabel: "Situacion administrativa irregular",
      why: [
        "No hay otra autorizacion en vigor.",
        "Se puede acreditar presencia antes del 1 de enero de 2026 y permanencia de 5 meses.",
        "Hay al menos un supuesto especifico marcado."
      ],
      nextSteps: [
        "Revisar la documentacion completa antes de presentar.",
        "Elegir via telematica o presencial con cita."
      ],
      notes: [
        "La vulnerabilidad la acreditan servicios sociales o entidades colaboradoras, no el Gobierno Vasco.",
        "El resguardo de presentacion no habilita por si solo para trabajar."
      ]
    });
  }

  function makeChecklistItems(definitions, checks) {
    return definitions.map((definition) => ({
      key: definition.key,
      label: definition.label,
      done: Boolean(checks[definition.key])
    }));
  }

  function summarizePending(items) {
    const pendingItems = items.filter((item) => !item.done).map((item) => item.label);
    return pendingItems.length ? pendingItems.join(" | ") : "Nada pendiente";
  }

  function buildCaseGuidance(rawAnswers, rawChecks) {
    const answers = normalizeAnswers(rawAnswers);
    const checks = normalizeChecks(rawChecks);
    const result = evaluateAnswers(answers);
    let documentDefinitions = [];
    let stepDefinitions = [];
    const documentaryFormalities = [
      {
        key: "doc-translation-legalization",
        label: "Comprobar traduccion jurada y legalizacion o apostilla de los documentos extranjeros cuando corresponda."
      },
      {
        key: "doc-copies-originals",
        label: "Preparar copias y originales para la presentacion cuando hagan falta."
      },
      {
        key: "doc-previous-records",
        label: "Reunir documentacion previa util para acreditar estancia o expedientes anteriores, aunque fuera denegatoria."
      }
    ];

    if (result.code && result.code.startsWith("minor-")) {
      const minorBornInSpain = answers.minorBirthPlace === "spain";
      const guardianRegular = answers.minorGuardianStatus === "regular";

      documentDefinitions = [
        {
          key: guardianRegular ? "doc-form-minor-ex25" : "doc-form-minor-ex31-ex32",
          label: guardianRegular
            ? "Formulario oficial EX-25 para menor con progenitor o tutor en situacion regular."
            : "Formulario oficial EX-31 o EX-32 segun la presentacion simultanea del menor con progenitor o tutor en situacion irregular."
        },
        {
          key: "doc-fee-790-052",
          label: "Tasa 790-052 para menores (epigrafe 2.1.5, 10,94 euros) o la que corresponda segun la subruta concreta."
        },
        { key: "doc-minor-identity", label: "Documentacion de identidad del menor y de la persona progenitora o tutora." },
        { key: "doc-minor-legal-representation", label: "Prueba de representacion legal, tutela o patria potestad." }
      ];

      if (minorBornInSpain) {
        documentDefinitions.push({
          key: "doc-minor-birth-cert-spain",
          label: "Certificado de nacimiento en Espana del menor."
        });
      } else {
        documentDefinitions.push(
          {
            key: "doc-minor-passports-family",
            label: "Pasaporte completo o documento de viaje del menor y de la persona progenitora o tutora."
          },
          {
            key: "doc-minor-birth-cert-abroad",
            label: "Certificado de nacimiento extranjero debidamente traducido y legalizado o apostillado cuando corresponda."
          }
        );
      }

      if (guardianRegular) {
        documentDefinitions.push({
          key: "doc-minor-guardian-regular-status",
          label: "Permiso o situacion regular vigente del progenitor o tutor."
        });
      } else {
        documentDefinitions.push({
          key: "doc-minor-guardian-irregular-context",
          label: "Documentacion de la situacion del progenitor o tutor en situacion irregular y de la presentacion simultanea cuando corresponda."
        });
      }

      if (answers.minorSchoolingRequired === "yes") {
        documentDefinitions.push({
          key: "doc-minor-schooling",
          label: "Matricula o certificado de escolarizacion del menor y declaracion de cumplimiento escolar cuando corresponda."
        });
      }

      if (answers.minorNeedsCustodyProof === "yes") {
        documentDefinitions.push({
          key: "doc-minor-custody-proof",
          label: "Prueba de custodia exclusiva, autorizacion del otro progenitor o documento equivalente."
        });
      }

      if (answers.minorHasDisability === "yes") {
        documentDefinitions.push({
          key: "doc-minor-disability",
          label: "Documentacion acreditativa de la discapacidad del menor cuando proceda."
        });
      }

      documentDefinitions.push(...documentaryFormalities);

      stepDefinitions = guardianRegular
        ? [
            { key: "step-minor-regular-route", label: "Confirmar la via de menor con progenitor o tutor en situacion regular." },
            { key: "step-minor-regular-docs", label: "Preparar nacimiento, representacion legal y escolarizacion antes de presentar." },
            { key: "step-minor-regular-filing", label: "Presentar en la Oficina de Extranjeria correspondiente con la documentacion y formulario especificos del menor." },
            { key: "step-minor-regular-submit", label: "Seguir la resolucion y tramites posteriores del menor con progenitor o tutor regular." }
          ]
        : [
            { key: "step-minor-irregular-route", label: "Confirmar la via de menor con progenitor o tutor en situacion irregular." },
            { key: "step-minor-irregular-docs", label: "Preparar nacimiento, representacion legal, escolarizacion y custodia si hacen falta." },
            { key: "step-minor-irregular-filing", label: "Presentar presencialmente en Correos o Seguridad Social habilitada, o por Mercurio cuando corresponda." },
            { key: "step-minor-irregular-follow-up", label: "Presentar segun la subruta aplicable y revisar el seguimiento posterior." }
          ];
    } else if (result.routeLabel === "Revisar expediente previo") {
      documentDefinitions = [
        { key: "doc-existing-file", label: "Localizar el resguardo o numero del expediente ya presentado." },
        { key: "doc-existing-contact", label: "Comprobar que telefono, email y direccion del expediente son correctos." },
        { key: "doc-existing-extra", label: "Revisar si hay documentacion nueva que pueda ser util aportar." }
      ];
      stepDefinitions = [
        { key: "step-existing-status", label: "Consultar el estado del expediente actual antes de iniciar nada nuevo." },
        { key: "step-existing-advice", label: "Confirmar con una entidad colaboradora si hay que esperar, aportar algo o hacer desistimiento." }
      ];
    } else if (result.routeLabel === "Otra via") {
      stepDefinitions = result.nextSteps.map((label, index) => ({
        key: `step-other-${index + 1}`,
        label
      }));
    } else {
      documentDefinitions = [
        {
          key: answers.piBefore2026 === "yes" ? "doc-form-pi-ex31" : "doc-form-irregular-ex32",
          label: answers.piBefore2026 === "yes"
            ? "Formulario oficial EX-31 para solicitantes de Proteccion Internacional anteriores al 1 de enero de 2026."
            : "Formulario oficial EX-32 para la via de situacion administrativa irregular."
        },
        {
          key: "doc-fee-790-052",
          label: "Tasa 790-052 (epigrafe 2.3.1, 38,28 euros) dentro del plazo correspondiente."
        },
        { key: "doc-identity", label: "Pasaporte, titulo de viaje o cedula de inscripcion." },
        { key: "doc-presence", label: "Prueba de presencia en Espana antes del 1 de enero de 2026." },
        { key: "doc-stay", label: "Prueba de 5 meses seguidos antes de la solicitud." },
        { key: "doc-criminal", label: "Certificado de antecedentes penales o preparacion de la via diplomatica excepcional." },
        { key: "doc-contact", label: "Telefono, email y direccion bien revisados." }
      ];

      if (answers.piBefore2026 === "yes") {
        documentDefinitions.push({
          key: "doc-pi-proof",
          label: "Resguardo o prueba de solicitud de Proteccion Internacional anterior al 1 de enero de 2026."
        });
      } else if (answers.irregularOptions.length === 0) {
        documentDefinitions.push({
          key: "doc-irregular-proof",
          label: "Acreditar al menos uno de estos supuestos: trabajo, familia o vulnerabilidad."
        });
      } else {
        if (answers.irregularOptions.includes("work")) {
          documentDefinitions.push({
            key: "doc-work-proof",
            label: "Pruebas de trabajo realizado o de intencion real de trabajar por cuenta ajena o propia."
          });
        }

        if (answers.irregularOptions.includes("family")) {
          documentDefinitions.push({
            key: "doc-family-proof",
            label: "Pruebas de unidad familiar: libro de familia, certificados o convivencia."
          });
        }

        if (answers.irregularOptions.includes("vulnerability")) {
          documentDefinitions.push({
            key: "doc-vulnerability-proof",
            label: "Certificado de vulnerabilidad emitido por servicios sociales o entidad colaboradora."
          });
        }
      }

      documentDefinitions.push(...documentaryFormalities);

      stepDefinitions = [
        { key: "step-review-route", label: "Confirmar que la via y los requisitos estan bien encajados." },
        { key: "step-review-docs", label: "Revisar que toda la documentacion este completa y legible." },
        { key: "step-filing-window", label: "Confirmar que la solicitud se presenta dentro del plazo habilitado de la regularizacion extraordinaria." },
        { key: "step-filing-channels", label: "Elegir y preparar la presentacion por Correos o Seguridad Social habilitada, o por Mercurio si se hace telematicamente." },
        { key: "step-choose-channel", label: "Dejar claro quien presenta, por que canal y con que resguardo de presentacion." },
        { key: "step-submit", label: "Presentar la solicitud completa." },
        { key: "step-start-notice", label: "Esperar la comunicacion de inicio o admision a tramite del procedimiento." },
        { key: "step-provisional-permit", label: "Desde la admision a tramite, revisar el permiso provisional de residencia y trabajo cuando corresponda." },
        { key: "step-resolution-window", label: "Hacer seguimiento de la resolucion dentro del plazo maximo orientativo de 3 meses." },
        { key: "step-expulsion-review", label: "Si existe procedimiento de devolucion o expulsion, revisar el efecto del eventual permiso favorable sobre ese expediente." },
        { key: "step-tie", label: "Si la resolucion es favorable, pedir la TIE en el plazo de 1 mes." }
      ];

      if (answers.piBefore2026 === "yes") {
        stepDefinitions.push({
          key: "step-pi-desist",
          label: "Si hay resolucion favorable, desistir de la solicitud o recurso de Proteccion Internacional para tramitar la TIE."
        });
      }
    }

    const documents = makeChecklistItems(documentDefinitions, checks);
    const steps = makeChecklistItems(stepDefinitions, checks);

    return {
      result,
      documents,
      steps,
      documentsPendingSummary: summarizePending(documents),
      stepsPendingSummary: summarizePending(steps),
      recommendedAction:
        documents.find((item) => !item.done)?.label ||
        steps.find((item) => !item.done)?.label ||
        result.nextSteps[0] ||
        "Caso al dia"
    };
  }

  function mergeCases(existingCases, importedCases) {
    const casesById = new Map(existingCases.map((caseItem) => {
      const normalized = normalizeCase(caseItem);
      return [normalized.id, normalized];
    }));

    let added = 0;
    let updated = 0;

    importedCases.forEach((caseItem) => {
      const normalized = normalizeCase(caseItem);

      if (!normalized.id) {
        return;
      }

      if (casesById.has(normalized.id)) {
        updated += 1;
      } else {
        added += 1;
      }

      casesById.set(normalized.id, normalized);
    });

    const cases = Array.from(casesById.values()).sort((left, right) => {
      const rightDate = right.updatedAt || right.createdAt || "";
      const leftDate = left.updatedAt || left.createdAt || "";
      return rightDate.localeCompare(leftDate);
    });

    return { cases, added, updated };
  }

  function nextCaseId(currentCounter) {
    const nextCounter = Number(currentCounter || 0) + 1;
    return {
      id: `REG-2026-${String(nextCounter).padStart(5, "0")}`,
      counter: nextCounter
    };
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  }

  function buildCasesCsv(cases) {
    const rows = [CSV_HEADERS.map((column) => csvEscape(column.label)).join(";")];

    cases.forEach((caseItem) => {
      rows.push(CSV_HEADERS.map((column) => csvEscape(caseItem[column.key] || "")).join(";"));
    });

    return rows.join("\n");
  }

  return {
    DEFAULT_ANSWERS,
    OFFICIAL_NOTE,
    CSV_HEADERS,
    normalizeAnswers,
    normalizeChecks,
    normalizeRepresentative,
    normalizeCase,
    evaluateAnswers,
    buildCaseGuidance,
    mergeCases,
    nextCaseId,
    buildCasesCsv
  };
});
