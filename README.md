# Atlas de arquitectura de software

Aplicación web educativa de una sola página para estudiar y comparar cinco estilos: Layered Architecture, Monolithic Architecture, Microservices Architecture, Microkernel Architecture y Event-Driven Architecture.

## Cómo usarla

Abre `index.html` en un navegador moderno. No requiere instalación, servidor, cuenta ni conexión a Internet para las actividades principales.

1. Abre una ficha y revisa su definición, diagrama, fortalezas, compromisos y casos. En el radar, selecciona cualquiera de los seis atributos para ver su valoración y explicación.
2. Pulsa **Marcar como revisada** al terminar la presentación.
3. Haz al menos una pregunta en **Entrevístame**. Se permiten hasta tres preguntas respondidas por estilo. Las preguntas ajenas al contenido no consumen un intento.
4. Completa los cinco estilos para desbloquear la evaluación final de cinco preguntas: tres de dificultad media y dos de dificultad alta.
5. Consulta la nota sobre 5.0, las respuestas correctas y las explicaciones. Puedes repetir la evaluación o reiniciar todo el avance.

En **Comparar estilos**, usa los filtros de la gráfica de barras para ordenar los cinco estilos por un atributo de calidad. La tabla inferior ofrece una comparación de estructura y contexto. Las animaciones respetan la preferencia de movimiento reducido del sistema.

El avance se guarda en el almacenamiento local del navegador. **Reiniciar avance** borra el progreso de esta aplicación en ese navegador.

## Criterio didáctico

La entrevista usa un motor local por temas, basado exclusivamente en el contenido de la ficha abierta. No es un chat de inteligencia artificial ni consulta Internet. Si no reconoce una pregunta, explica qué temas puede responder sin consumir uno de los tres intentos.

Las estrellas son orientativas para una implementación típica. Cambian según el tamaño del sistema, los límites entre componentes, el equipo y la operación. Los estilos pueden combinarse: por ejemplo, una aplicación monolítica puede organizarse en capas.

## Archivos

- `index.html`: estructura de la página.
- `styles.css`: diseño adaptable para escritorio y móvil.
- `content.js`: contenido de los cinco estilos y sus valoraciones.
- `quiz-content.js`: banco de preguntas y explicaciones de la evaluación.
- `charts.js`: radar y gráfica comparativa interactivos, sin bibliotecas externas.
- `app.js`: navegación, diagramas, entrevista, progreso y evaluación.

## Fuentes de ampliación

- [Microsoft Learn: arquitectura N-tier](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/n-tier)
- [AWS: alternativas a aplicaciones monolíticas](https://docs.aws.amazon.com/prescriptive-guidance/latest/micro-frontends-aws/micro-frontend-alternatives.html)
- [Microsoft Learn: microservicios](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices)
- [Eclipse Platform: modelo de plug-ins](https://help.eclipse.org/latest/topic/org.eclipse.platform.doc.isv/guide/runtime_model.htm)
- [Microsoft Learn: arquitectura dirigida por eventos](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/event-driven)
