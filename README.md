# Atlas de arquitectura de software

Aplicación web educativa de una sola página para estudiar y comparar cinco estilos: Layered Architecture, Monolithic Architecture, Microservices Architecture, Microkernel Architecture y Event-Driven Architecture.

## Cómo usarla

Abre `index.html` en un navegador moderno. No requiere instalación, servidor, cuenta ni conexión a Internet para las actividades principales.

1. En **Inicio** verás tu progreso (KPI) y las cinco fichas. En escritorio el menú lateral siempre está visible; en tablet y móvil se abre con el botón de menú.
2. Cada ficha se organiza en pestañas: *Visión general*, *Fortalezas y límites*, *Cuándo usarlo*, *Calidad* y *Entrevista*. En **Calidad** puedes alternar entre barras y radar, seleccionar cualquiera de los seis atributos y comparar el estilo con otro.
3. Pulsa **Marcar como revisada** (tarjeta "Tu avance") al terminar la presentación.
4. Haz al menos una pregunta en **Entrevista** (hasta tres respondidas por estilo; Ctrl+Enter envía). Las preguntas ajenas al contenido no consumen un intento.
5. Completa los cinco estilos para desbloquear la evaluación final de cinco preguntas: tres de dificultad media y dos de dificultad alta.
6. Consulta la nota sobre 5.0, las respuestas correctas y las explicaciones. Puedes repetir la evaluación o reiniciar todo el avance.

En **Comparar estilos** hay un resumen con KPI, un ranking por atributo (con promedio de referencia y explicaciones opcionales), un mapa de calor 5 × 6 y la tabla cualitativa. Pulsar una celda o un encabezado del mapa cambia el atributo del ranking. El botón de la barra superior alterna tema claro/oscuro (por defecto sigue al sistema). Las animaciones respetan la preferencia de movimiento reducido.

El avance y el tema se guardan en el almacenamiento local del navegador. **Reiniciar** borra el progreso de esta aplicación en ese navegador (pide confirmación).

## Criterio didáctico

La entrevista usa un motor local por temas, basado exclusivamente en el contenido de la ficha abierta. No es un chat de inteligencia artificial ni consulta Internet. Si no reconoce una pregunta, explica qué temas puede responder sin consumir uno de los tres intentos.

Las estrellas son orientativas para una implementación típica. Cambian según el tamaño del sistema, los límites entre componentes, el equipo y la operación. Los estilos pueden combinarse: por ejemplo, una aplicación monolítica puede organizarse en capas.

## Criterio de color en las gráficas

- Gráficas de **un** estilo (perfil, radar): color de identidad del estilo (azul, naranja, verde azulado, violeta, rosa). Orden y tonos validados para daltonismo en tema claro y oscuro; la serie de comparación usa línea discontinua o rayado.
- Gráficas **entre** estilos (ranking, mapa de calor): color por nivel — verde = alto (4–5), gris = medio (3), rojo = bajo (1–2). Cada marca incluye también el número, un icono y una etiqueta, así que el color nunca es la única señal.

## Archivos

- `index.html`: estructura, estado de carga (skeleton) y diálogo de confirmación.
- `styles.css`: sistema visual con tokens (colores, tipografía, espaciado, radios, sombras), temas claro/oscuro y diseño adaptable.
- `icons.js`: conjunto de iconos SVG reutilizables.
- `content.js`: contenido de los cinco estilos y sus valoraciones.
- `quiz-content.js`: banco de preguntas y explicaciones de la evaluación.
- `charts.js`: barras, radar, ranking, mapa de calor, anillos, minigráficas y tooltip compartido, sin bibliotecas externas.
- `app.js`: navegación, vistas, diagramas, entrevista, progreso y evaluación.

## Fuentes de ampliación

- [Microsoft Learn: arquitectura N-tier](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/n-tier)
- [AWS: alternativas a aplicaciones monolíticas](https://docs.aws.amazon.com/prescriptive-guidance/latest/micro-frontends-aws/micro-frontend-alternatives.html)
- [Microsoft Learn: microservicios](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices)
- [Eclipse Platform: modelo de plug-ins](https://help.eclipse.org/latest/topic/org.eclipse.platform.doc.isv/guide/runtime_model.htm)
- [Microsoft Learn: arquitectura dirigida por eventos](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/event-driven)
