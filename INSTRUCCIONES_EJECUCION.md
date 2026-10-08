# Abrir la página en otro dispositivo

## Con una copia de los archivos

1. Copia la carpeta completa `AppEducativa` al dispositivo. Si la recibes como ZIP, descomprímela; conserva juntos `index.html`, los archivos `.css` y `.js`, y `favicon.svg`.
2. Abre `index.html` en un navegador moderno con JavaScript habilitado. No necesitas instalar dependencias ni tener Internet para las actividades principales.

El progreso se guarda en el navegador de cada dispositivo; no se sincroniza entre equipos.

## Desde otro dispositivo en la misma red

1. En el equipo que tiene la carpeta, abre una terminal dentro de `AppEducativa` y ejecuta `py -m http.server 8000 --bind 0.0.0.0` (requiere Python).
2. Consulta la dirección IPv4 local del equipo con `ipconfig` y, desde el otro dispositivo conectado a la misma red, abre `http://IP_LOCAL:8000/` reemplazando `IP_LOCAL` por esa dirección. Si Windows lo solicita, permite el acceso en la red privada.
3. Para detener el servidor, pulsa `Ctrl+C` en la terminal.

Para abrirla desde otra red se debe publicar la carpeta en un servicio de alojamiento web estático; este proyecto no incluye una URL pública.
