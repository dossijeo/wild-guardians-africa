# Cinco contactos de especies renderizados en Gran Cañón

Sobre `1729e5b`, visor nativo `animal-preload.html`, semilla 712, Gran Cañón/Mapungubwe, calidad media. Se amplía la prueba de precarga con `attack-species=<id>&motion=1`. Cada caso utiliza una nueva partida, un centro y un mijo colocados y pagados legalmente, y contratación inicial de cero. No hay crédito, daño, golpes ni eventos fabricados. La incursión de una especie se solicita explícitamente mediante `spawnRaid`; no es una noche alcanzada jugando la campaña. Para aislar el ataque se desactivan los planes de otras incursiones, sin cambiar movimiento, navegación, elección de blanco, animación o daño.

Se renderiza y espera la barrera `raidReady()` antes de cada paso simulado de 50 ms. El modo nuevo se detiene en el primer `AnimalLogicalHit` real de la especie elegida contra un blanco pagado. Los cinco golpes corresponden al mijo, no a daño del centro. Cada reporte conserva posición global/Y renderizada, actor listo, geometría de la pose actual, caja en el frustum y mesh visible; los VFX originales de impacto tienen instancias activas.

| Especie | Segundos simulados hasta golpe | Sprites de VFX activos |
| --- | ---: | ---: |
| Facóquero | 19,95 | 16 |
| Hiena | 20,05 | 12 |
| Búfalo | 20,05 | 25 |
| León | 20,10 | 18 |
| Rinoceronte | 19,95 | 53 |

Los cinco reportes terminan `ok:true`, sin errores, sin frames retenidos por actores durante el movimiento. La aparición inicial conserva siete descargas GLB antes/después y cero programas de shader animal nuevos; todos los modelos se habían preparado durante `WorldScene.load`. Estos contadores se toman antes de avanzar al ataque: **no demuestran ausencia de compilación de shaders VFX en el primer golpe**, ni ausencia de tirón, ni carga fría de red. CPU de Game.tick y duración de aparición son diagnósticos de una ejecución, no GPU/FPS/móvil.

Los modelos conservan meshes y están dentro del frustum al contacto. Eso no prueba que no haya oclusión por rocas/paredes ni que se vea el cuerpo completo desde toda cámara. Las capturas iniciales de facóquero/león incluyen oclusión y el panel QA; no se presentan como aceptación completa de visibilidad. La inspección cercana del rinoceronte, iniciada mediante un botón del visor después del golpe, muestra el modelo 3D y conserva exactamente el estado lógico; el encuadre corta su parte superior. No se modifica la cámara de producción ni se acredita el caso del jugador que aleja la cámara y regresa durante un ataque.

## La prueba anterior se conserva

Sin `attack-species`, `motion=1` sigue exigiendo **daño al centro**, no se sustituye por un golpe a un cultivo. La ejecución final con cinco especies pasa: centro 600→580, contacto estructural del facóquero a 18,20 s simulados. Las otras cuatro especies ya estaban `gone` por las reglas de aquella incursión al observar el primer golpe. No se declara que las cinco atacaran en ese grupo: los casos individuales anteriores son los que acreditan sus contactos.

El nuevo muestreo geométrico inicialmente intentaba medir actores que ya habían salido y carecían de mesh. Se corrige solo el diagnóstico para registrar su ausencia y limitar la exigencia de estar en cámara al nuevo caso individual. La prueba estructural original se vuelve a ejecutar y pasa; no se relajan sus condiciones.

## Procedencia y límites

Se conservan los cuatro textos exactos del visor ejecutado. v1 corresponde a facóquero/hiena/búfalo; v2 cambia solo la altura/scroll del panel para león/rinoceronte; v3 añade inspección UI y separa correctamente el modo original de daño estructural; v4 contempla actores `gone` en el diagnóstico. Reconstrucción v1 comprobada contra el hash capturado antes de cambiar el CSS. Los cambios v3/v4 no alteran el movimiento/daño del modo individual. No hubo ediciones durante una ejecución en curso. El módulo pasa comprobación de sintaxis y los modos final e inspección se ejecutan en navegador nativo.

Un primer intento de preparación omitía el brote obligatorio para abrir contratación; se corrigió el flujo legal antes de obtener los cinco reportes. El resultado preliminar que no exponía los contactos no se utiliza como evidencia final.

Esta revisión añade únicamente QA, no runtime. QA-155 sigue pendiente: trabajadores y bestias simultáneos, varios colapsos, HUD, escucha, carga fría y dispositivo físico. Falta medir la primera activación de VFX y completar incursiones naturales/retirada en otras combinaciones. Las campañas de cien noches conservan sus fuentes congeladas y no se acreditan con estos casos.

[Reportes individuales](proof.json), [rinoceronte con inspección](rhino-inspection.json), [prueba estructural conservada](original-five-structure.json) y [captura próxima](rhino-inspection.png).
