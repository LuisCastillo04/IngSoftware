// Preguntas basadas en los casos y compromisos enseñados en content.js.
window.QUIZ_BANK = [
    {
      id: "m-layered", level: "media",
      prompt: "Un sistema de matrículas necesita separar la interfaz, las reglas de cupos y el acceso a datos para ubicar y probar los cambios. ¿Qué estilo organiza directamente esas responsabilidades?",
      options: ["Event-Driven Architecture", "Layered Architecture", "Microkernel Architecture", "Microservices Architecture", "Monolithic Architecture"],
      answer: 1,
      explanation: "Layered Architecture distribuye las responsabilidades en capas; eso no determina por sí mismo cuántas unidades se despliegan."
    },
    {
      id: "m-monolithic", level: "media",
      prompt: "Un equipo pequeño valida un producto y quiere publicar una sola aplicación con poca infraestructura. ¿Qué estilo encaja mejor en esta etapa?",
      options: ["Microservices Architecture", "Event-Driven Architecture", "Microkernel Architecture", "Monolithic Architecture", "Ninguno: toda aplicación debe empezar distribuida"],
      answer: 3,
      explanation: "Un monolito permite empezar con una unidad de despliegue y puede mantener módulos internos bien definidos."
    },
    {
      id: "m-microservices", level: "media",
      prompt: "Catálogo, matrículas y pagos tienen equipos y cargas diferentes. Se quiere publicar y escalar cada capacidad por separado. ¿Qué estilo ofrece esa independencia?",
      options: ["Layered Architecture", "Monolithic Architecture", "Microservices Architecture", "Microkernel Architecture", "Event-Driven Architecture"],
      answer: 2,
      explanation: "Microservices Architecture permite desplegar y escalar capacidades de negocio independientes, a cambio de mayor complejidad distribuida."
    },
    {
      id: "m-microkernel", level: "media",
      prompt: "Una plataforma conserva usuarios y permisos en un núcleo estable, mientras terceros agregan nuevos tipos de actividad como complementos. ¿Qué estilo describe mejor la solución?",
      options: ["Microkernel Architecture", "Monolithic Architecture", "Event-Driven Architecture", "Layered Architecture", "Microservices Architecture"],
      answer: 0,
      explanation: "Microkernel Architecture usa un núcleo mínimo y puntos de extensión para conectar complementos."
    },
    {
      id: "m-events", level: "media",
      prompt: "Tras confirmar una matrícula, notificaciones y analítica deben reaccionar sin que la matrícula espere por ambas tareas. ¿Qué estilo representa este flujo?",
      options: ["Layered Architecture", "Monolithic Architecture", "Microkernel Architecture", "Event-Driven Architecture", "Microservices Architecture"],
      answer: 3,
      explanation: "Event-Driven Architecture conecta productores y consumidores mediante eventos, frecuentemente con procesamiento asíncrono."
    },
    {
      id: "h-combination", level: "alta",
      prompt: "Un compañero afirma que una aplicación con Layered Architecture no puede ser Monolithic Architecture. ¿Cuál es la mejor respuesta?",
      options: [
        "Es correcto: una capa siempre se publica como servicio independiente.",
        "Es correcto: un monolito no puede separar responsabilidades internas.",
        "Es incorrecto: las capas organizan responsabilidades y el monolito describe principalmente la unidad de despliegue.",
        "Es incorrecto: ambos nombres significan exactamente lo mismo.",
        "Depende únicamente del lenguaje de programación."
      ],
      answer: 2,
      explanation: "Son decisiones sobre aspectos distintos. Un monolito puede estar organizado en capas."
    },
    {
      id: "h-small-team", level: "alta",
      prompt: "Un equipo de tres personas no tiene automatización ni observabilidad, pero considera migrar su piloto a decenas de servicios para mejorar mantenibilidad. ¿Qué decisión está mejor justificada?",
      options: [
        "Dividirlo inmediatamente: más servicios siempre significan menos complejidad.",
        "Mantener una unidad modular, medir sus problemas y separar servicios solo cuando existan límites y capacidad operativa claros.",
        "Convertir cada función en un complemento sin definir contratos.",
        "Introducir eventos en todas las llamadas, incluso si se requiere respuesta inmediata.",
        "Eliminar las pruebas para poder entregar más rápido."
      ],
      answer: 1,
      explanation: "La distribución agrega coordinación, pruebas y operación. Conviene justificarla con necesidades reales y prepararse para mantenerla."
    },
    {
      id: "h-event-tradeoff", level: "alta",
      prompt: "Una plataforma usa eventos para que varios componentes reaccionen a una compra. ¿Qué compromiso técnico debe gestionar especialmente?",
      options: [
        "Que todos los consumidores se desplieguen como un único archivo.",
        "Que cada evento solo pueda tener un consumidor.",
        "Que los datos jamás puedan estar temporalmente desactualizados.",
        "Retrasos, duplicados y seguimiento de flujos asíncronos mediante contratos y manejo de fallos.",
        "Que el núcleo prohíba instalar complementos."
      ],
      answer: 3,
      explanation: "El procesamiento asíncrono aporta desacoplamiento, pero exige tratar entrega, orden, duplicados y observabilidad."
    },
    {
      id: "h-extensions", level: "alta",
      prompt: "Una universidad quiere que terceros añadan simuladores sin modificar el núcleo de su plataforma. El núcleo deberá seguir estable durante años. ¿Cuál es el riesgo más importante de la solución elegida?",
      options: [
        "No poder organizar reglas de negocio por capas.",
        "No poder usar una base de datos.",
        "Que los contratos entre núcleo y complementos pierdan compatibilidad al evolucionar.",
        "Que todos los complementos deban ser microservicios.",
        "Que toda función nueva exija una cola de eventos."
      ],
      answer: 2,
      explanation: "En Microkernel Architecture, los puntos de extensión y su compatibilidad son esenciales para mantener la plataforma ampliable."
    }
  ];
