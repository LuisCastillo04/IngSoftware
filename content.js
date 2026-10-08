// Contenido didáctico local. Las puntuaciones son orientativas: cambian con el
// contexto, la implementación, el equipo y la operación del sistema.
window.APP_DATA = {
  criteria: [
    { id: "simplicity", label: "Simplicity", description: "Facilidad para comprender e iniciar la solución." },
    { id: "modularity", label: "Modularity", description: "Claridad de los límites entre responsabilidades." },
    { id: "maintainability", label: "Maintainability", description: "Facilidad para cambiar el sistema con seguridad." },
    { id: "deployability", label: "Deployability", description: "Facilidad para publicar cambios y operar versiones." },
    { id: "testability", label: "Testability", description: "Facilidad para comprobar el comportamiento." },
    { id: "scalability", label: "Scalability", description: "Capacidad de atender mayor carga de trabajo." }
  ],
  styles: [
    {
      id: "layered",
      name: "Layered Architecture",
      shortName: "Layered",
      eyebrow: "Responsabilidades por niveles",
      tagline: "Cada nivel tiene un trabajo claro.",
      intro: "Soy Layered Architecture. Organizo una aplicación en niveles con responsabilidades definidas. Así puedes seguir el recorrido de una solicitud desde la interfaz hasta los datos.",
      definition: "Organiza el sistema en capas, por ejemplo presentación, lógica de negocio y acceso a datos. Una capa ofrece servicios a la que está encima y normalmente depende de la que tiene debajo.",
      structure: "La interfaz recibe la solicitud; las reglas de negocio toman decisiones; el acceso a datos consulta o guarda información. Los límites entre capas ayudan a localizar los cambios.",
      diagram: {
        caption: "Recorrido habitual de una solicitud entre capas; la respuesta vuelve en sentido inverso.",
        steps: ["Interfaz", "Reglas de negocio", "Acceso a datos", "Base de datos"]
      },
      strengths: [
        "Separar responsabilidades facilita comprender y mantener funciones habituales.",
        "Las reglas de negocio se pueden probar sin depender de la interfaz.",
        "Permite reemplazar la interfaz o el acceso a datos si los límites están bien definidos."
      ],
      weaknesses: [
        "Demasiadas capas o pasos innecesarios pueden aumentar complejidad y latencia.",
        "Las dependencias mal controladas permiten que un cambio atraviese varias capas.",
        "Por sí sola no permite escalar cada función del sistema de manera independiente."
      ],
      recommended: [
        "Aplicaciones de negocio con reglas claras y operaciones sobre datos.",
        "Equipos que necesitan una estructura fácil de enseñar y mantener.",
        "Sistemas donde las responsabilidades de interfaz, negocio y persistencia se pueden separar."
      ],
      scenario: "En una matrícula universitaria, la interfaz recibe la solicitud, las reglas comprueban cupos y la capa de datos guarda el resultado.",
      example: {
        title: "Matrícula universitaria",
        scenario: "Un estudiante solicita una asignatura. La interfaz recoge la solicitud, las reglas verifican cupos y prerrequisitos, y la capa de datos guarda la matrícula.",
        why: "Cada responsabilidad queda en una capa reconocible, lo que facilita probar las reglas de inscripción."
      },
      ratingCaveat: "Estas estrellas suponen capas bien delimitadas; una implementación con dependencias cruzadas cambiaría el resultado.",
      ratings: {
        simplicity: { score: 4, reason: "La división en niveles es familiar, aunque demasiadas capas complican el recorrido." },
        modularity: { score: 4, reason: "Separa responsabilidades, siempre que cada capa respete sus límites." },
        maintainability: { score: 4, reason: "Los cambios suelen localizarse por responsabilidad; los acoplamientos la reducen." },
        deployability: { score: 3, reason: "La organización interna no garantiza publicar capas por separado." },
        testability: { score: 4, reason: "Las reglas pueden probarse de forma aislada con dependencias sustituibles." },
        scalability: { score: 2, reason: "Escalar una función concreta exige decisiones adicionales de despliegue." }
      },
      interviewAnswers: {
        overview: "Divido una aplicación en capas con tareas claras, como interfaz, reglas y datos. Mi valor está en ordenar las responsabilidades.",
        structure: "La solicitud suele pasar de la interfaz a las reglas de negocio y después al acceso a datos. Cada capa debería conocer solo las dependencias permitidas.",
        strengths: "Ayudo a localizar cambios y a probar reglas de negocio. Funciono mejor cuando mis límites entre capas se respetan.",
        weaknesses: "Puedo añadir pasos y acoplamiento si se crean capas sin propósito o se saltan sus límites. Tampoco escalo funciones por separado automáticamente.",
        useCases: "Soy útil para sistemas de negocio con reglas y datos bien definidos, por ejemplo la matrícula de asignaturas.",
        quality: "Suelo favorecer mantenimiento y pruebas. Mi capacidad de escalar depende de cómo se diseñe y despliegue el sistema."
      }
    },
    {
      id: "monolithic",
      name: "Monolithic Architecture",
      shortName: "Monolithic",
      eyebrow: "Una unidad de ejecución",
      tagline: "Una aplicación, un despliegue principal.",
      intro: "Soy Monolithic Architecture. Reúno las funciones de una aplicación en una sola unidad de despliegue. Puedo ser una forma rápida de empezar sin añadir coordinación entre servicios.",
      definition: "Construye y despliega la aplicación como una unidad principal. Sus módulos pueden estar bien separados en el código, pero una versión nueva normalmente publica el conjunto.",
      structure: "La interfaz, las reglas y otras funciones viven en un mismo proceso o paquete desplegable. Puede existir modularidad interna, incluso capas; ser monolítico describe principalmente el despliegue.",
      diagram: {
        caption: "Funciones internas distintas, empaquetadas y publicadas como una unidad principal.",
        steps: ["Usuario", "Aplicación única: interfaz + reglas + módulos", "Base de datos"]
      },
      strengths: [
        "Iniciar, depurar y desplegar una primera versión suele requerir poca infraestructura.",
        "Las llamadas internas evitan parte de la latencia y los fallos de red entre servicios.",
        "Las transacciones y las pruebas de un flujo completo pueden ser más directas."
      ],
      weaknesses: [
        "Publicar un cambio pequeño suele implicar desplegar toda la aplicación.",
        "Si crece sin módulos claros, aumenta el acoplamiento y se dificultan los cambios.",
        "No permite asignar recursos a cada función de forma independiente con facilidad."
      ],
      recommended: [
        "Productos nuevos que necesitan validar una idea con un equipo pequeño.",
        "Aplicaciones de tamaño moderado con requisitos de operación sencillos.",
        "Dominios donde las funciones están estrechamente relacionadas y no exigen escalar por separado."
      ],
      scenario: "Un equipo pequeño publica catálogo, inscripción y seguimiento de cursos como una sola aplicación durante un piloto.",
      example: {
        title: "Piloto de cursos",
        scenario: "Un equipo pequeño lanza inscripción, catálogo y seguimiento de cursos en una sola aplicación mientras valida la demanda.",
        why: "Puede concentrarse en las funciones y publicar una unidad, manteniendo módulos internos para crecer con orden."
      },
      ratingCaveat: "Estas estrellas describen un monolito moderado y modular; el tamaño y el acoplamiento modifican la valoración.",
      ratings: {
        simplicity: { score: 5, reason: "Una sola unidad reduce la coordinación y la infraestructura inicial." },
        modularity: { score: 3, reason: "Puede tener módulos internos claros, pero sus límites dependen de la disciplina del equipo." },
        maintainability: { score: 3, reason: "Es manejable al inicio; el acoplamiento puede dificultar cambios cuando crece." },
        deployability: { score: 4, reason: "Publicar una unidad es simple, aunque cualquier cambio suele requerir publicar el conjunto." },
        testability: { score: 4, reason: "Es fácil ejecutar flujos completos, si se mantienen módulos y datos de prueba controlables." },
        scalability: { score: 2, reason: "Puede replicarse completo, pero cuesta escalar solo la función con mayor demanda." }
      },
      interviewAnswers: {
        overview: "Concentro las funciones en una unidad principal de despliegue. Eso simplifica el comienzo y la operación inicial.",
        structure: "Puedo contener módulos y capas, pero normalmente se construyen y publican juntos. Mi forma de despliegue no impide organizar bien el código.",
        strengths: "Soy sencillo para empezar, depurar y publicar. Las llamadas internas también evitan parte de la complejidad de red.",
        weaknesses: "Un cambio puede obligar a publicar todo. Si mis módulos se acoplan demasiado, mantenerme y escalar una función concreta se vuelve difícil.",
        useCases: "Encajo en un producto inicial o de tamaño moderado con equipo pequeño, como un piloto de cursos universitarios.",
        quality: "Destaco en simplicidad y despliegue inicial. Mi mantenibilidad y escalabilidad dependen mucho del tamaño y de mi modularidad interna."
      }
    },
    {
      id: "microservices",
      name: "Microservices Architecture",
      shortName: "Microservices",
      eyebrow: "Servicios con límites propios",
      tagline: "Cada capacidad evoluciona a su ritmo.",
      intro: "Soy Microservices Architecture. Divido el sistema en servicios centrados en capacidades de negocio. Cada uno puede evolucionar y desplegarse con mayor independencia, a cambio de coordinar una red distribuida.",
      definition: "Estructura el sistema como servicios pequeños y autónomos alrededor de capacidades de negocio. Se comunican por contratos definidos y suelen gestionar sus propios datos y su ciclo de despliegue.",
      structure: "Una solicitud puede llegar a uno o varios servicios. Cada servicio contiene su lógica y una frontera de datos; la comunicación entre ellos requiere contratos, observación y manejo de fallos.",
      diagram: {
        caption: "Servicios con responsabilidades propias que se comunican mediante contratos; las fronteras de datos evitan acoplamiento directo.",
        steps: ["Cliente", "Servicio de cursos", "Servicio de matrículas", "Servicio de pagos"]
      },
      strengths: [
        "Permite desplegar y escalar capacidades distintas de manera independiente.",
        "Las fronteras de servicio pueden apoyar equipos autónomos y cambios localizados.",
        "Un fallo puede aislarse mejor si se diseñan límites y mecanismos de recuperación."
      ],
      weaknesses: [
        "La red introduce latencia, fallos parciales y coordinación entre servicios.",
        "Las pruebas integradas, los datos distribuidos y la observación son más complejos.",
        "Exige más automatización y capacidad operativa que una aplicación pequeña suele necesitar."
      ],
      recommended: [
        "Sistemas grandes con capacidades de negocio bien delimitadas.",
        "Equipos que necesitan ciclos de entrega independientes.",
        "Productos donde algunas capacidades reciben cargas muy diferentes y existe madurez operativa."
      ],
      scenario: "Una plataforma grande mantiene catálogo, matrículas y pagos como servicios con equipos y cargas diferentes.",
      example: {
        title: "Plataforma universitaria a gran escala",
        scenario: "El catálogo recibe muchas consultas, mientras matrículas y pagos tienen reglas y picos de carga diferentes. Equipos separados mantienen cada capacidad.",
        why: "Cada servicio puede evolucionar y recibir recursos según su demanda, con el costo de coordinar contratos y datos."
      },
      ratingCaveat: "Estas estrellas suponen límites de negocio claros y buena automatización; dividir servicios sin esas condiciones puede empeorar la solución.",
      ratings: {
        simplicity: { score: 2, reason: "La distribución y la operación de varios servicios añaden complejidad." },
        modularity: { score: 5, reason: "Las fronteras de servicio hacen explícitas las capacidades y sus contratos." },
        maintainability: { score: 3, reason: "Los cambios locales ayudan, pero compatibilidad y coordinación entre servicios cuestan." },
        deployability: { score: 4, reason: "Un servicio puede publicarse solo si contratos y automatización están bien gestionados." },
        testability: { score: 3, reason: "Las pruebas unitarias son manejables; validar interacciones distribuidas es más difícil." },
        scalability: { score: 5, reason: "Puede asignar recursos a las capacidades con mayor carga de manera independiente." }
      },
      interviewAnswers: {
        overview: "Organizo capacidades de negocio en servicios con contratos propios. Gano independencia a cambio de complejidad distribuida.",
        structure: "Cada servicio contiene una capacidad y normalmente gestiona sus datos. Nos comunicamos mediante contratos que hay que mantener compatibles.",
        strengths: "Puedo desplegar y escalar capacidades por separado. También ayudo a equipos autónomos cuando las fronteras de negocio están claras.",
        weaknesses: "Tengo fallos de red, datos repartidos y pruebas integradas complejas. Necesito observación, automatización y coordinación.",
        useCases: "Soy apropiado para sistemas grandes con capacidades y equipos independientes, como una plataforma universitaria con catálogo, matrículas y pagos.",
        quality: "Suelo puntuar alto en modularidad y escalabilidad. La simplicidad baja porque operar muchos servicios exige más trabajo."
      }
    },
    {
      id: "microkernel",
      name: "Microkernel Architecture",
      shortName: "Microkernel",
      eyebrow: "Núcleo más extensiones",
      tagline: "Una base estable admite nuevas funciones.",
      intro: "Soy Microkernel Architecture. Conservo en un núcleo pequeño las reglas esenciales y dejo que los complementos agreguen variantes sin modificar ese núcleo cada vez.",
      definition: "Separa un núcleo con funciones esenciales de extensiones que añaden capacidades. Las extensiones interactúan con el núcleo mediante puntos de extensión o contratos definidos.",
      structure: "El núcleo coordina el ciclo de vida y ofrece servicios comunes. Cada complemento implementa una variación: un formato, un tipo de actividad o una integración.",
      diagram: {
        caption: "Un núcleo estable ofrece puntos de extensión a varios complementos; estos dependen del contrato del núcleo.",
        steps: ["Núcleo y contratos", "Complemento de cuestionarios", "Complemento de simulaciones", "Complemento de informes"]
      },
      strengths: [
        "Permite añadir variantes mediante complementos sin reescribir el núcleo.",
        "Los contratos definidos separan funciones centrales y extensiones.",
        "Favorece productos que ofrecen personalización o un ecosistema de extensiones."
      ],
      weaknesses: [
        "Diseñar contratos de extensión estables requiere anticipar variaciones reales.",
        "La compatibilidad y las versiones de los complementos necesitan control.",
        "No es una ventaja si el producto casi no tiene extensiones o variantes."
      ],
      recommended: [
        "Herramientas que admiten complementos instalables.",
        "Plataformas con un flujo central estable y variantes frecuentes.",
        "Productos que necesitan incorporar formatos o funciones de terceros mediante contratos."
      ],
      scenario: "Una plataforma educativa agrega tipos de actividad mediante complementos sobre un núcleo de usuarios y permisos.",
      example: {
        title: "Plataforma de actividades",
        scenario: "Una plataforma educativa conserva usuarios, permisos y seguimiento en el núcleo; nuevos complementos agregan cuestionarios, simulaciones o informes.",
        why: "Las nuevas clases de actividad usan contratos compartidos sin duplicar las funciones centrales."
      },
      ratingCaveat: "Estas estrellas suponen un núcleo estable y extensiones bien delimitadas; contratos débiles o pocos complementos reducen el beneficio.",
      ratings: {
        simplicity: { score: 3, reason: "El núcleo puede ser claro, pero diseñar extensiones añade conceptos." },
        modularity: { score: 5, reason: "La frontera entre núcleo y complementos separa variaciones con claridad." },
        maintainability: { score: 4, reason: "Las variantes cambian en complementos; hay que cuidar la compatibilidad del contrato." },
        deployability: { score: 4, reason: "Algunos complementos pueden instalarse por separado, según la plataforma." },
        testability: { score: 4, reason: "Núcleo y complementos se prueban aisladamente, además de comprobar su integración." },
        scalability: { score: 3, reason: "Extender funciones no implica escalar carga; depende del núcleo y del despliegue." }
      },
      interviewAnswers: {
        overview: "Combino un núcleo de funciones esenciales con complementos para las variantes. Mi ventaja principal es la extensibilidad.",
        structure: "El núcleo ofrece contratos y servicios comunes. Los complementos se conectan a esos puntos y añaden funciones concretas.",
        strengths: "Puedo incorporar nuevas funciones sin cambiar continuamente el núcleo. También mantengo separadas las variantes.",
        weaknesses: "Mis contratos deben evolucionar con cuidado. La compatibilidad de los complementos añade trabajo y, si no hay variantes, puedo ser excesivo.",
        useCases: "Sirvo para plataformas extensibles, como una herramienta educativa que agrega tipos de actividad mediante complementos.",
        quality: "Favorezco modularidad y mantenimiento cuando el núcleo es estable. Mi escalabilidad no mejora por el simple hecho de añadir complementos."
      }
    },
    {
      id: "event-driven",
      name: "Event-Driven Architecture",
      shortName: "Event-Driven",
      eyebrow: "Reacciones a acontecimientos",
      tagline: "Un evento puede activar varias respuestas.",
      intro: "Soy Event-Driven Architecture. Cuando ocurre algo importante, publico un evento para que otros componentes reaccionen. Así desacoplo al emisor de quienes necesitan conocer ese cambio.",
      definition: "Organiza la comunicación alrededor de eventos que representan hechos ocurridos. Un productor emite un evento y uno o varios consumidores reaccionan, a menudo de manera asíncrona.",
      structure: "Un productor publica un evento en un canal o intermediario. Los consumidores procesan el hecho con independencia relativa; deben manejar duplicados, retrasos y fallos según el caso.",
      diagram: {
        caption: "Un hecho publicado puede activar varios consumidores sin que el productor los invoque directamente.",
        steps: ["Productor", "Evento de matrícula", "Canal de eventos", "Notificaciones + analítica"]
      },
      strengths: [
        "Un productor puede incorporar nuevos consumidores sin conocerlos directamente.",
        "El procesamiento asíncrono ayuda a absorber picos de trabajo.",
        "Un mismo hecho puede activar varias funciones sin bloquear el flujo principal."
      ],
      weaknesses: [
        "El orden, los retrasos y el procesamiento duplicado requieren diseño explícito.",
        "Seguir una operación completa y probarla puede ser difícil sin buena observación.",
        "La consistencia entre componentes puede tardar; no siempre sirve para respuestas inmediatas."
      ],
      recommended: [
        "Flujos donde un cambio debe activar varias reacciones independientes.",
        "Procesamiento asíncrono de tareas o picos de actividad.",
        "Integración entre componentes que no necesitan respuesta inmediata de todos los participantes."
      ],
      scenario: "La confirmación de una matrícula emite un evento que activa avisos y actualizaciones de analítica.",
      example: {
        title: "Confirmación de matrícula",
        scenario: "Al confirmarse una matrícula, se publica un evento. Notificaciones envía un aviso y analítica actualiza sus indicadores por separado.",
        why: "El proceso principal no necesita llamar directamente a cada reacción adicional."
      },
      ratingCaveat: "Estas estrellas suponen eventos bien definidos y manejo de fallos; los requisitos de respuesta inmediata pueden cambiar la conveniencia.",
      ratings: {
        simplicity: { score: 2, reason: "El flujo asíncrono y el manejo de eventos requieren más razonamiento." },
        modularity: { score: 4, reason: "Productores y consumidores se relacionan mediante eventos, aunque comparten contratos." },
        maintainability: { score: 3, reason: "Añadir consumidores es sencillo; rastrear efectos y evolucionar eventos cuesta." },
        deployability: { score: 3, reason: "Los consumidores pueden evolucionar por separado, pero el canal y los contratos se coordinan." },
        testability: { score: 2, reason: "Hay que probar retrasos, duplicados, orden e interacciones asíncronas." },
        scalability: { score: 5, reason: "Las colas y los consumidores permiten absorber picos y procesar trabajo en paralelo." }
      },
      interviewAnswers: {
        overview: "Comunico hechos mediante eventos. Un productor publica lo que ocurrió y otros componentes deciden cómo reaccionar.",
        structure: "El productor emite un evento hacia un canal. Los consumidores lo reciben y procesan; deben prever retrasos, duplicados y errores.",
        strengths: "Desacoplo al productor de sus consumidores y ayudo a absorber picos mediante procesamiento asíncrono.",
        weaknesses: "Puede costar seguir el flujo completo. También debo manejar orden, duplicados y consistencia entre componentes.",
        useCases: "Encajo cuando un hecho activa varias reacciones, como avisos y analítica después de confirmar una matrícula.",
        quality: "Puedo escalar muy bien el procesamiento asíncrono. Mis pruebas y mi simplicidad se ven afectadas por el tiempo y la coordinación de los eventos."
      }
    }
  ]
};
