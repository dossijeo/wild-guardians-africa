# Wild Guardians — Plan Maestro consolidado 2.0

Edición del 1 de octubre de 2026. La entrada principal es [el Plan Maestro](Wild_Guardians_Plan_Maestro_Definitivo.md).

## Cómo usarlo

El Markdown contiene todo el diseño consolidado, arquitectura propuesta, ejecución por fases, catálogos, 159 casos de aceptación y una lista acotada de verificaciones. Los JSON facilitan pasar los mismos datos a configuración y manifiestos del futuro repositorio.

`balance_confirmado.json` separa valores aprobados de campos aún no acreditados. Un `null` en una capacidad significa ausencia de tope artificial; en una importación o contrato significa dato por verificar, nunca cero.

Los identificadores de SFX/VFX son reales. Sus disparadores y destinos son propuestas de integración, no afirmaciones de funcionalidad implementada. Las reservas no eliminan tomas ni autorizan nuevas mecánicas.

## Verificación numérica

Solo requiere Python 3.10 o posterior; no usa paquetes externos ni red:

```bash
python verificar_reglas.py
```

Genera `resultado_verificaciones.json`. Se verifican mayor resto, conservación de plantilla, composiciones legales de incursión, costes de poblados, golpes de colapso y consistencia de manifiestos. No ejecuta un videojuego ni demuestra su balance completo.

La extracción inicial cotejó los 126 MP3 con sus hashes/tamaños declarados, y decodificó los inventarios geométricos de cultivos. El script de referencia no reextrae los HTML, que no se incluyen en este paquete.

## Fuentes y límites

Se auditó código/datos de ocho labs y el borrador anterior. `fuentes_auditadas.json` identifica los originales con SHA-256. Se conserva la última regla de diseño frente a cualquier valor demo contradictorio. El apartado 26 del Markdown identifica los detalles no recuperados y los assets pesados que faltan importar.

No contiene modelos, audio binario, texturas ni fuentes tipográficas; es un paquete de documentación e integración, no el build del juego. Las licencias mencionadas reproducen las fuentes recibidas, no una auditoría jurídica actualizada.
