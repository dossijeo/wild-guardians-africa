# Semilla, comandos y azar visual

QA-159 verificado sobre `6381643`: la misma semilla y política de comandos
producen el mismo dominio, aun intercalando azar y efectos de presentación.
Se añade un reproductor de QA compartido entre Node y navegador; no se cambia
el RNG ni el balance de producción.

## Escenario y entradas conservadas

tools/replay_campaign.mjs usa Navigation, terreno Sabana y poblado Mapungubwe
originales. Prepara un centro, diez mijo, cinco girasol y contratos de mujer mayor
y hombre joven mediante comandos pagados. Dispone de 10000 monedas explícitas
de QA, para que la comparación atraviese dos noches sin depender del presupuesto
de una apertura natural. No fuerza madurez, riego, ingresos, eventos ni incursiones.

El paso solicitado es de un segundo; Game.tick conserva sus pasos internos y
fronteras. Al amanecer se pagan los nuevos contratos; desde el segundo día se
ordenan las cosechas de mijo que realmente estén maduras. La ejecución conserva
girasoles vivos. Termina al alcanzar el tercer día o un resultado de partida.
Los IDs de comandos y ranura son explícitos para poder comparar el estado completo.

Se conservan semilla, bioma, cultura, comandos, cámara y volumen activo de
incursiones. Cambiar el volumen activo puede cambiar legalmente dónde nacen los
animales; aquí no se presenta como una variación puramente visual ni se altera.
El escenario no prueba todas las semillas o combinaciones de QA-001.

## Comprobación dirigida

[Dos pruebas](qa/seed-replay/directed.txt), cero fallos/omisiones, 113842,9061 ms,
para semillas 712 y 781. Cada una repite el terreno nativo y ambos ciclos diarios:

- La reproducción base sustituye Math.random por una función que lanza error:
  ninguna preparación, ruta, compra, tarea, cosecha, noche o ataque la utiliza.
- La segunda consume 200 llamadas al azar global por checkpoint, crea VFX
  nativos dig con distinta densidad/viento y evoluciona MusicMixer con su propio
  selector aleatorio. No pasa el RNG del dominio a esas capas.
- Se comparan comandos, todos los eventos recogidos, snapshots completos de
  checkpoints y serialización final. Hay dos amaneceres, incursión resuelta,
  cosechas y entregas físicas. La semilla 781 genera suelo fértil sin override.
- Deserialize conserva los siguientes 128 valores del RNG persistido.

Tras retirar una comprobación redundante de la prueba 781, se repite esa prueba
sobre el archivo final: [salida](qa/seed-replay/directed-final-781.txt), un caso
aprobado y el 712 omitido explícitamente por el filtro, 66139,2129 ms. El caso 712
y el código del reproductor no cambian respecto a la primera ejecución.

El RNG de simulación sigue persistido en state.rng. Los cambios de animación de
ataque se consideran dominio: su clip determina duración y golpe lógico; esta
prueba no los sustituye por animaciones cosméticas ni altera su selección.

## Renderer completo en navegador

La fixture tests/browser/seed-replay.html ejecuta dos reproducciones de la semilla
781 con WorldScene completo, modelos, terreno, trabajadores, cultivos, Toon,
VFX y chunks de producción. La segunda crea efectos decorativos adicionales y
añade seis frames por checkpoint. MusicMixer usa dobles de GainParam para esta
prueba de independencia; no se atribuye aquí reproducción WebAudio ni escucha.

[Resumen público](qa/seed-replay/browser-summary.json),
[datos completos](qa/seed-replay/browser-runs.json),
[comparación independiente](qa/seed-replay/comparison.json) y
[captura](qa/seed-replay/browser.png):

| Resultado | Ambas reproducciones |
| --- | --- |
| Comandos | 28 idénticos |
| Eventos | 114 idénticos |
| Checkpoints | 29 snapshots idénticos |
| Día final | 3, sin derrota |
| RNG final | 1618194146 |
| Diversidad añadida | 29 VFX y 174 frames adicionales en la segunda |
| Entregas | 10 cajas físicas de mijo |

El suelo fértil afecta las quince plantas y las cosechas posteriores conservan
sus valores exactos en ambos recorridos. La incursión de facóquero se genera y
resuelve con Navigation real. Antes y después de cada intervención visual se
exige también serialización idéntica. Los textos de snapshots se leen del
inspector público de la fixture; CUA no accede al estado privado de la aplicación.
Todos los snapshots registrados pasan deserialize de producción.

SHA-256 de la serialización final en ambas reproducciones:
1c8be743a28059c0a6ac7ec293673bcf4efa34e64dc7aff353c3afd5f5277d3d.

[Consola](qa/seed-replay/console.json): sin avisos ni errores. La fixture no escribe
ranuras, y su pestaña local de QA se cierra al terminar. No se modifica la pestaña
del usuario en 5173.
[Build](qa/seed-replay/build.txt): 15,16 s, aviso conocido de bundle grande.
[Paquete](qa/seed-replay/package.txt): 559 archivos / 379782379 bytes,
796 enlaces relativos y 20 GLB runtime sin originales duplicados.

La prueba comprueba reproducibilidad e independencia de presentación; no es una
medición de rendimiento, una campaña natural completa ni una auditoría visual
de todos los biomas/culturas. Esos requisitos conservan sus casos propios.
