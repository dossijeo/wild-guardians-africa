# Pisadas nativas — comprobación visual parcial

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

El visor de finca `locomotion-vfx.html` se adapta a render explícito y pasos de
0,05 s para evitar un RAF continuo costoso. Su recorrido completo sobre
terreno real sigue pendiente de repetir; esta prueba aislada no acredita
todavía todas las bestias, transporte de cajas ni contactos en pendientes.
Las pruebas automáticas de locomoción ya publicadas cubren esos controladores
y la inmutabilidad del estado lógico, con el alcance documentado en ellas.
