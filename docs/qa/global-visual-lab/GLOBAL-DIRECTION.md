# Decisión de dirección global

Estado: 19 de octubre de 2026, rama experimental `codex/global-visual-lab`. Referencias: seis mockups proporcionados y capturas del renderer real. No se integra en main ni cambia la opción por defecto.

## Alcance y pausa del atlas

La prioridad es la escena completa: iluminación, integración de suelo/objetos, lectura de volumen y vegetación desde cámara normal. **Quedan en pausa el retoque minucioso del atlas del taller y su automatización.** Se conservan sus variantes, archivos fuente, comparaciones y límites; no se revierten ni se presentan como acabadas. Solo se retomarán cuando exista una dirección global visualmente convincente y con coste aceptable.

## Primera comparación y variante elegida para continuar

La dirección con mejor relación entre impacto visible y coste es **el relleno diurno del suelo y la lectura de sombras proyectadas**. El ensayo demuestra que parte del aspecto plano procede del relleno del suelo, más claro que el de los props. Cambiar ese relleno recupera sombras amplias sin geometría, atlas, texturas o draw calls adicionales.

No se adopta la sustitución literal del perfil de sombra sobre todo el suelo: enfría zonas soleadas, oscurece demasiado Volcanes y no afecta a la rama toon del Desierto. Es una dirección para continuar, no una solución terminada en seis biomas.

| Intervención | Resultado visual | Coste verificado | Decisión |
|---|---|---|---|
| Contacto aplicado también a luz directa | Prácticamente invisible desde cámara normal | Sin recursos nuevos; una lectura lógica adicional del mapa | Descartar |
| Relleno del suelo con paleta de sombra de props | Mejor volumen en Sabana, Gran Río y Cañón; beneficios desiguales | ABBA sin regresión observada en Sabana/Gran Río; recursos iguales | Continuar con alcance controlado |
| Placas de basalto horneadas en Blender | Parecen pavimento; pierden detalle y lectura nocturna | Tres mapas 1024²; geometría y draws de Volcanes iguales | Descartar |
| Vegetación adicional o sustituta de rondas previas | Matas insuficientes o identidad incorrecta; una prueba empeoró GPU nocturna | Regresión observada de +2,19 ms en matas bajas | No generalizar ni aumentar densidad sin una propuesta artística distinta |

## Coste real del candidato de iluminación

ABBA aislado, calidad media, 1280×720, semilla 712, cámara fija, 180 muestras por fase. Medias de dos repeticiones:

| Escena | GPU original → variante | CPU envío original → variante |
|---|---:|---:|
| Sabana día | 18,199 → 18,158 ms | 5,359 → 5,210 ms |
| Sabana noche | 19,023 → 18,693 ms | 5,016 → 4,917 ms |
| Gran Río día | 14,446 → 14,097 ms | 5,991 → 5,654 ms |
| Gran Río noche | 14,955 → 14,829 ms | 5,654 → 5,348 ms |

Presupuesto previo: +0 mapas/draws/geometría y máximo +0,5 ms GPU. Cumple en estos casos. Las pequeñas diferencias negativas no prueban aceleración; el shader no reduce trabajo y la noche es esencialmente idéntica. No hay medición GPU de los otros cuatro biomas, latencia de carga ni VRAM residente. No confundir el número de recursos con bytes residentes.

## Decisión por bioma

| Bioma | Lo que merece conservar de la dirección | Condición para continuar |
|---|---|---|
| Sabana | Sombras amplias bajo copas y objetos más legibles | Mantener el amarillo cálido de zonas al sol; no añadir grano uniforme |
| Gran Río | Mejor agrupación visual bajo árboles | Evitar que la sombra funda plantas pequeñas con el tapiz |
| Manglares | Algo más de profundidad | Resolver integración de bases/musgo sin oscurecer toda la isla; no reclamar raíces nuevas mediante textura |
| Volcanes | El ensayo no justifica el nuevo relleno | Conservar su versión anterior; el albedo azul y la escala de fractura requieren una propuesta distinta a placas regulares |
| Gran Cañón | Mayor separación de planos del relieve | Validar también cámara normal transitable: la fixture amplia tiene una pared dominante |
| Desierto | Sirve de control sin cambios | Su rama toon necesita evaluación propia; no afirmar que comparte el resultado del suelo físico |

## Siguiente revisión concreta

Preparar una variante QA que reduzca el relleno **solo donde existe sombra proyectada**, usando la cobertura ya calculada en el shader. Mantener iluminación del suelo soleado y noche originales. Evaluar primero si conserva el beneficio de volumen sin la pérdida de calidez; no realizar un barrido ciego de constantes. Volcanes y Desierto deben mantenerse como controles hasta que haya evidencia específica para modificarlos.

Antes de adoptar: repetir seis biomas, cámara normal y baja, día/noche con encuadre/semilla/hora iguales; revisar transición sol/sombra y cambios de cámara. Solo si mejora claramente, coordinar ABBA GPU y validar streaming/calidad. Mantener los mismos presupuestos y documentar toda excepción.

## Evidencia revisable

- [Relleno: 48 capturas, evaluación artística y ABBA](ground-shade-coherence/README.md)
- [Sabana original](ground-shade-coherence/savanna-0-game-day.png) / [relleno candidato](ground-shade-coherence/savanna-ground-shade-coherence-game-day.png)
- [Gran Río original](ground-shade-coherence/grand-river-0-game-day.png) / [relleno candidato](ground-shade-coherence/grand-river-ground-shade-coherence-game-day.png)
- [Volcanes original](ground-shade-coherence/volcano-0-game-day.png) / [relleno candidato](ground-shade-coherence/volcano-ground-shade-coherence-game-day.png)
- [Contacto: 48 capturas y descarte](ground-contact-integration/README.md)
- [Basalto: 48 capturas, Blender y descarte](basalt-plates/README.md)

144 capturas de esta ronda, no 144 escenas de campaña. Son fixtures del renderer real; no equivalen a navegación o combate. Build correcto de 402 módulos en `54e3e0fd`; los cambios siguientes son QA/documentación y conservan runtime original.

## Pase de relleno restringido a sombras

[48 capturas y ABBA](ground-shadow-fill/README.md): mejora localizada visible sin enfriar el suelo soleado; noche idéntica en los biomas modificados. Se conserva como candidato QA, sin adoptarlo todavía: la ronda de Sabana diurna supera el presupuesto GPU y requiere una medición más estable. Gran Río y Cañón pasan el umbral en esta ronda, sin probarlo para todo el juego. Los seis mockups originales están localizados en [ART-REFERENCES.md](ART-REFERENCES.md).

La inspección de Cañón confirma que reforzar sombras de objetos no resuelve las del relieve: el terreno residente recibe sombra pero no la proyecta. Se prepara un experimento separado, `qa-terrain-shadow-volume.js`, reutilizando geometría y el pass existentes; todavía sin decisión de adopción ni coste aprobado.
