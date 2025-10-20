# Visualizar y exportar el diagrama del backend (guía para principiantes)

Este archivo muestra formas fáciles de ver y exportar el diagrama Mermaid que está en `backend-diagram.mmd`.

Opciones sencillas (elige una):

- Opción A — Ver en el navegador con Mermaid Live Editor (rápido):
  1. Abre https://mermaid.live
  2. Copia y pega el contenido de `docs/architecture/backend-diagram.mmd` en el panel de la izquierda.
  3. Verás el diagrama a la derecha; puedes exportar a PNG/SVG desde la UI.

- Opción B — Ver en VS Code (recomendado si editas con VS Code):
  1. Abre el repo en VS Code.
  2. Instala una extensión de Mermaid preview (por ejemplo "Mermaid Preview" o "Mermaid Markdown Preview").
  3. Abre `docs/architecture/backend-diagram.mmd` y usa el comando "Open Preview" o el atajo de la extensión.

- Opción C — Exportar localmente a PNG/SVG con `mermaid-cli` (línea de comandos):

  - Requisitos: Node.js + npm instalados.
  - Instalar `mermaid-cli` (una sola vez):

```cmd
npm install -g @mermaid-js/mermaid-cli
```

  - Exportar a PNG (desde `cmd.exe`) — ajusta las rutas si es necesario:

```cmd
cd C:\Users\Lenovo\Documents\pruebaDeBkupLidr\bkupTestforge
mmdc -i docs\architecture\backend-diagram.mmd -o docs\architecture\backend-diagram.png
```

  - Para SVG:

```cmd
mmdc -i docs\architecture\backend-diagram.mmd -o docs\architecture\backend-diagram.svg
```

  - Nota: `mmdc` puede pedir dependencias del sistema para renderizar (por ejemplo, librerías de Chromium). Si hay problemas, usa Mermaid Live Editor o la extensión de VS Code.

- Opción D — Dibujar/ajustar manualmente en Draw.io / Excalidraw:
  - Si quieres un diagrama más estilizado o con anotaciones manuales, exporta la imagen desde Mermaid y luego impórtala en Draw.io (https://app.diagrams.net/) o en Excalidraw.

Consejos para elegir:
- Si sólo quieres ver rápido y no instalar nada: usa Mermaid Live Editor.
- Si trabajas a diario en VS Code y editarás el diagrama: instala la extensión de Mermaid en VS Code.
- Si quieres archivos PNG/SVG en el repo (para documentación o presentaciones): usa `mermaid-cli` para generar y commitea las imágenes.

¿Quieres que genere ahora una imagen PNG/SVG y la deje en `docs/architecture/`? Puedo intentarlo aquí (si el entorno tiene Node.js y `mmdc` disponible) o te doy los comandos para que lo hagas localmente; dime cuál prefieres.
