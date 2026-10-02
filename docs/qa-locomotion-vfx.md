# Pisadas nativas — comprobación visual

2 de octubre de 2026. `tests/browser/locomotion-flat.html` usa contratación,
centro y semilla pagados con comandos de Game, navegación plana explícita y
los modelos y clips originales. No accede a guardados del usuario. El visor
aislado conserva iluminación Standard para examinar partículas por separado.

Se comprobaron los cuatro perfiles de trabajadores en marcha de llegada:
cada pisada creó cuatro sprites de polvo y cuatro sólidos de tierra. En la
vista cercana aparecen los fragmentos y el humo suave original, sin aumentar
su tamaño ni opacidad. Las capturas locales son
`test-results/locomotion-feet-older-male.png` y
`test-results/locomotion-feet-young-female.png`.

Con la mujer mayor, recargar en memoria conservó tiempo y saldo y eliminó las
partículas anteriores; una pisada posterior volvió a emitir normalmente. Con
la mujer joven, dos observaciones separadas mantuvieron tiempo 0,65 s y edad
del efecto 0,139 s durante la pausa. La consola consultada no tenía avisos ni
errores. Ambos visores pasan la comprobación sintáctica de JavaScript.

El visor de finca `locomotion-vfx.html` usa render explícito y pasos de 0,05 s.
La repetición sobre terreno real Sabana/Suajili, semilla 712, con African Toon
fusionado en main, completó la llegada desde el poblado, siembra/riego,
crecimiento, cosecha, transporte y una entrega pagada. El saldo pasó de 95 a
106 y el contador de entregas a uno a los 228,90 s simulados. La cosecha se
solicita desde el visor cuando madura, utilizando el comando de Game.

La cámara cercana permite inspeccionar polvo y sólidos a los pies, sin
alterar la cámara del juego. Durante la marcha a los 42,35 s había una pisada
de 0,11 s con cuatro sprites y cuatro sólidos sobre el terreno dibujado.
Recargar mantuvo tiempo/saldo/marcha y limpió todos los efectos; la próxima
pisada a los 42,95 s volvió a emitir cuatro sprites y cuatro sólidos.

Una segunda ejecución detuvo el recorrido específicamente en un efecto cuya
clave contiene `Carry_Crate`, a los 211,50 s. Se inspeccionaron caja, pose de
transporte y pisada cercana a los 211,60 s, edad del efecto 0,15 s. Una segunda
observación durante la pausa conservó esos valores. Consola sin avisos ni
errores. Capturas locales: `locomotion-native-world-feet.png`,
`locomotion-native-world-delivery.png`, `locomotion-native-world-carry.png` y
`locomotion-native-world-carry-feet.png`, bajo `test-results/`.

Esta prueba de finca acredita un perfil y una combinación; no acredita
visualmente todas las bestias, los cuatro perfiles en terreno real, todos
los biomas ni todos los contactos en pendientes. Las pruebas automáticas de
locomoción ya publicadas cubren los controladores y la inmutabilidad del
estado lógico, con el alcance documentado en ellas. Sigue pendiente medir
rendimiento móvil.
