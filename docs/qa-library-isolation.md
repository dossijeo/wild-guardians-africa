# Biblioteca: aislamiento de la partida

QA-149 verificado sobre `67a260b`: abrir los cuatro laboratorios desde el menú
original, operar en ellos y volver no ejecuta economía ni modifica los guardados.
La comprobación usa la aplicación de producción, no un doble de escena.

## Preparación y recorrido

La fixture tests/browser/library-isolation.html prepara Sabana/Mapungubwe con
terreno original, semilla 712 y ranura qa-library-isolation. El crédito de QA es
1000 monedas explícitas; los comandos reales pagan 800 por el centro, 5 por mijo
y 100 por contratar una mujer mayor. [Estado preparado](qa/library-isolation/prepared.json):
saldo 95, planta plant-3, trabajadora worker-6 y tarea de siembra/primer riego.
No se acredita una apertura natural con el saldo inicial del juego.

La partida se carga mediante Continuar, se reconoce el mensaje del Espíritu,
se pausa y se elige Guardar y volver al menú. Se toma entonces la
[línea base](qa/library-isolation/baseline.json), con la trabajadora llegando,
el primer riego pendiente y una sola causa de pausa, menu. Las otras dos ranuras
de QA del mismo origen y todos sus backups se incluyen en la comparación.

El recorrido usa Biblioteca y los botones originales, esperando que las
transiciones habiliten el panel. Se ejercitan las cuatro demostraciones:

| Lab | Actividad comprobada | Evidencia pública |
| --- | --- | --- |
| Cultivos | Muestra de ocho especies, crecimiento ×25 hasta maduras y recolección de las ocho | [Captura](qa/library-isolation/crops.png), [DOM](qa/library-isolation/crops-ui.txt) |
| Bastión | Terreno nativo y galería de veinte piezas | [Captura](qa/library-isolation/walls.png), [DOM](qa/library-isolation/walls-ui.txt) |
| Destrucción | Casa Suajili, Derrumbar, colapso completo hasta cenizas | [Captura](qa/library-isolation/destruction.png), [DOM](qa/library-isolation/destruction-ui.txt) |
| Sonidos | 126 clips; reproducción del 125, victoria, con volumen del lab en cero | [Captura](qa/library-isolation/sounds.png), [DOM](qa/library-isolation/sounds-ui.txt), [controles](qa/library-isolation/sounds-controls.json) |

Cada salida usa Volver al santuario y presenta Regresando al santuario durante
la animación inversa. Tras terminar no queda ningún iframe de lab ni canvas
de la partida en el documento principal; permanece el diorama del menú.
[Estado final del menú](qa/library-isolation/menu-final.json) y
[DOM](qa/library-isolation/menu-final-ui.txt).

## Resultado

Durante 460,939 segundos desde el guardado de salida, los seis textos de las
ranuras y backups permanecen idénticos byte por byte en las cinco observaciones:
cultivos, murallas, destrucción, sonidos y retorno final. Se conservan también
savedAt, ledger, plantas, contratos, colas, RNG, supresiones y reloj; no se limita
la comparación al saldo mostrado. [Comparación y hashes](qa/library-isolation/comparison.json)
y [guardados finales](qa/library-isolation/final.json).

La lectura de snapshots se realiza en una segunda página visible de QA, mediante
SaveRepository/localStorage del mismo origen. CUA lee el resultado público del
inspector; no accede a variables privadas del juego. La verificación de los
artefactos usa assert de Node y deserialize de producción.

Al volver a Continuar y entrar en la misma ranura, el snapshot escrito al cargar
mantiene iguales diez campos de dominio: día, reloj, ledger, plantas, trabajadores,
tareas, RNG, comandos, estructuras y supresiones. No añade avance offline.
[Reentrada](qa/library-isolation/reentry.json). La [captura posterior](qa/library-isolation/reentry.png)
se toma después de reanudar la simulación y pausarla de nuevo: su hora visible
ya puede avanzar y no se usa como prueba de identidad del reloj al cargar.

La fuente de producción refuerza el alcance observado: menu guarda antes de
poner state a null y disponer WorldScene; frame solo avanza Game en screen=game.
Los reproductores/escenas de los labs viven en sus iframes, retirados al terminar
el regreso. Esta prueba acredita aislamiento del dominio; no acredita todavía
la auditoría completa de recursos y ciclos repetidos de QA-150.

[Consolas](qa/library-isolation/console.json): sin avisos ni errores.
[Build](qa/library-isolation/build.txt): 9,35 s, aviso conocido de bundle grande.
[Paquete web](qa/library-isolation/package.txt): 559 archivos / 379782379 bytes,
796 enlaces relativos y 20 GLB runtime sin duplicados originales.

El origen de QA es 127.0.0.1:5180. No se opera sobre la pestaña del usuario en
5173. Las dos pestañas temporales de QA se cierran al terminar.
