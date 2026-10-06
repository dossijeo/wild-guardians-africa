# Precarga y conservación de programas VFX

Base: df7ea67. Continúa el [diagnóstico de primera activación](../first-attack-gl-profile/README.md). Objetivo: evitar recompilar las recetas de partículas/cintas/ondas durante la primera incursión y después de desaparecer los efectos temporales. No se declara resuelto todo el tirón.

## Cambio aplicado

- Una composición nativa aislada del facóquero a 1,4 s prepara las cuatro recetas compartidas: rígidos, sprites, cintas y profundidad. Se compila junto a los animales durante la pantalla de carga; sus luces puntuales se mantienen invisibles. Solo avanza su kernel privado, sin tick del juego ni eventos de gameplay.
- Al terminar se liberan geometrías, partículas, buffers y grupo. La biblioteca conserva únicamente sus cuatro materiales para mantener las referencias a los programas en Three.js. Las instancias activas no conservan el objeto de preparación. La biblioteca libera esos materiales al cerrar el mundo; disposición idempotente y sin retención tras fallar/cancelarse.
- Gran Cañón prepara la receta de ondas usando el mismo objeto que recibirán los pasos reales: cero contactos, cero anillos visibles y ningún avance de reloj.
- prepareDepth compila con las recetas originales de captura, sombras desactivadas y el destino smokeDepth. La salida de un render target usa otro espacio de color que la pantalla en la versión instalada de Three. La sustitución de materiales es síncrona y se restaura inmediatamente; después se espera la compilación. Target/sombras se restauran también tras fallo.
- La máscara nativa de apertura/daño del centro se compila también mientras el edificio intacto la mantiene oculta; el material pertenece al edificio, sin otra copia permanente.
- Los candidatos alpha/empty siguen desactivados por defecto. No se modifica el diseño de VFX, daño, navegación, velocidad ni simulación.

## Evidencia nativa

IAB desktop, Mapungubwe, seed 712, calidad media. Centro y brote pagados, contratación inicial legal sin trabajadores para aislar cada animal. spawnRaid controlado y pasos simulados de 50 ms hasta el primer contacto real. No es campaña natural ni prueba de móvil físico.

| Variante ejecutada | Caso | Nuevos programas durante movimiento/contacto |
| --- | --- | ---: |
| Solo captura de profundidad previa, commit base | Facóquero / Gran Cañón | 8 |
| Preparación de cuatro recetas + ondas | Facóquero / Gran Cañón | 2 Standard |
| Igual + compilar residentes para pantalla sin sombras (descartado) | Facóquero / Gran Cañón | 2 Standard |
| Preparación de cuatro recetas + ondas | Hiena / Gran Cañón | 2 Standard |
| Preparación de cuatro recetas + ondas | Rinoceronte / Gran Cañón | 2 Standard |
| Recetas/destino exactos de profundidad, antes de preparar máscara | Facóquero / Gran Cañón | 0 |
| Misma variante, antes de preparar máscara | Hiena / Sabana | 2 Standard; ningún shader VFX |

El modo original de cinco especies termina en 364 pasos con StructureHit real y centro 600→580: antes de preparar la máscara registra una compilación RawShaderMaterial de edificio en el golpe; después (opening-group.json.gz, versión final) registra cero compileShader y cero linkProgram en todo el recorrido, con cero errores/esperas. No acredita ataques de las cinco especies en ese grupo.

Todos terminan sin errores. Hiena: 401 pasos / 20,05 s / 12 sprites en Gran Cañón; rinoceronte: 399 / 19,95 s / 53; facóquero final: 399 / 19,95 s / 16; hiena Sabana: 523 / 26,15 s / 12. Los campos de contacto/eventos, actor/posición, HP, sprites y esperas del facóquero final coinciden exactamente con el informe previo warm-depth del commit base.

Los informes con contadores de propiedad muestran cuatro materiales y cuatro IDs de programa retenidos al finalizar carga/aparición, cero instancias de preparación activas. before/after se toman antes del recorrido de ataque; no confundirlos con el número de efectos posteriores de gameplay. Las recetas siguen disponibles cuando las instancias de polvo anteriores ya se han destruido.

La precompilación de residentes para pantalla no eliminó las dos variantes, por lo que se retira. La preparación con target/recetas reales sí elimina las llamadas compileShader/linkProgram en los 399 frames del caso final de Gran Cañón. Esto no prueba cero compilación en todos los biomas ni en chunks/objetos creados posteriormente: Sabana conserva dos compilaciones Standard en el paso 77, una con colorWrite=false y otra de color.

## Coste y límites

El facóquero final tarda 5261,90 ms en cargar en esta ejecución; Sabana 5396,80 ms. No son A/B controlados de tiempo de carga. Persiste un pico CPU de 113,90 ms en el primer polvo de Gran Cañón (paso 48), con cero compilaciones, siete bufferData, dos bufferSubData y una texSubImage2D. Los demás tres fotogramas más lentos de esa traza están alrededor de 20 ms. Sabana alcanza 231 ms y mantiene las dos compilaciones Standard señaladas.

La instrumentación mide llamadas API y el tramo CPU world.render, no tiempo GPU, bytes/RAM ni coste exclusivo de shaders. Las campañas congeladas independientes seguían vivas. No convertir estas trazas en porcentajes de FPS o afirmar eliminado el tirón: quedan subidas/primera ejecución, profundidad y variantes de nuevos residentes por investigar. Falta medir memoria/tiempo de carga y móvil, calidades, culturas y otros biomas con mayor cobertura.

## Verificación y procedencia

78 pruebas dirigidas correctas, incluidos propiedad/disposición de materiales, preparación fallida, cierre durante preparación, igualdad de recetas de las 18 composiciones, ondas sin contactos ficticios y restauración inmediata de materiales/target/sombras en fallo síncrono/asíncrono. Build final: 205 módulos, 9,38 s, aviso habitual de bundle >500 kB.

Informes gzip deterministas y hashes comprimidos/descomprimidos en proof.json. scene-primer-only.txt se reconstruye retirando exactamente el bloque experimental añadido en la variante siguiente; no es una captura contemporánea. scene-resident-experiment.txt es la copia del experimento descartado. Fuentes finales y fixture copiados literalmente. Los dos primeros casos usaron el fixture anterior sin el campo preparedVfx; el campo se añadió después solo para observar propiedad. Las recetas fuente comunes se conservan como TXT.

La preparación cambia el momento de creación de programas: el caso de cultivo en Gran Cañón tiene 45 programas al terminar carga/aparición, frente a 26 del informe base. No son bytes de RAM ni coste GPU medido. scene-before-opening.txt conserva la variante de recetas exactas sin máscara; scene-final.txt es la versión posterior que ejecutó opening-group. El ensayo para pantalla se descarta.
