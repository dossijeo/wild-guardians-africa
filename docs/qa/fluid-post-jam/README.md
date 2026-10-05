# Restricciones de fluidos y pisadas del Gran Cañón

Cambios posteriores a la Jam, autorizados para `main`; no publicación en itch.io.

## Colocación y navegación

- Centros y nuevos poblados comprueban contorno e interior de sus huellas nativas contra `waterInfo`, con muestras cada 0,25 m. No se usa la exclusión conservadora de vegetación como si todo ese suelo fuese líquido.
- Una colocación que roza el líquido busca una ubicación válida dentro del 20 % de la dimensión horizontal mayor de la huella, conservando colisiones, pendientes, cultivos y acceso. El centro/poblado, sus eventos, supresiones y guardado usan las coordenadas finales.
- Las murallas permiten contacto parcial y omiten una pieza enteramente sobre agua/lava. La comprobación sucede al soltar el trazo; una pieza omitida no se cobra ni genera su propio aviso.
- Trabajadores y bestias evitan agua/lava. En Gran Cañón pueden cruzar el río: la navegación usa la superficie del agua y la presentación baja el anclaje 10 cm, conservando el ajuste de pies de los modelos originales.
- Se conserva la llegada cerca de la cámara/finca. Las sondas laterales alcanzables que exceden esa distancia se descartan antes de gastar búsquedas A*; esto corrige la regresión encontrada con rinoceronte en Gran Cañón.

Pruebas dirigidas aprobadas, sin cancelaciones ni omisiones:

| Salida | Casos | Alcance |
| --- | ---: | --- |
| [Colocación](placement-tests.txt) | 42 | Cinco culturas, dos orientaciones, agua/lava, dinero y guardado; hidrología nativa con plataformas planas declaradas junto a ambas orillas y aperturas originales de volcanes. |
| [Murallas y apertura](opening-wall-tests.txt) | 35 | Seis biomas, piezas parciales y enteras, cinco materiales, puertas, poblados del cañón, rutas y jornadas pagadas con decisiones buenas/malas. |
| [Incursiones y poblados](raid-village-tests.txt) | 47 | Cinco especies × seis biomas, cercanía y presupuesto de búsqueda; fundación y costes de poblados. La prueba de unidad inválida usa una pendiente no admisible, porque un roce pequeño con agua debe poder desplazarse ahora. |
| [VFX, audio e idiomas](effects-audio-tests.txt) | 100 | Contactos de clips originales, nueve modelos, agua/tierra, carrera, pausa, carga, disposición, catálogo y traducciones. |

## Ondas y sonidos

Las ondas usan un único `InstancedMesh`, hasta 128 anillos de 24 segmentos. No tienen texturas, luces, sombras ni captura adicional de profundidad. Se actualizan con tiempo simulado, suben solo el rango ocupado y desaparecen a los 0,85 s. El polvo no se genera en esas pisadas.

El usuario autorizó después el SFX **012 Pasos barro** para esas pisadas, incluidos trabajadores y bestias en marcha/carrera. Al salir del agua vuelve la selección habitual. El SFX **006 Agua de río** ya estaba conectado como ambiente local: se verifica su bucle único y su atenuación al alejar la cámara, sin añadir un segundo reproductor.

[Prueba visible](canyon-water-steps.png), [datos](canyon-water-steps.json) y [consola](browser-console.json). La página `tests/browser/canyon-water-steps.html` carga terreno y modelos originales, paga centro, mijo y trabajador, y prepara posiciones/fases para inspeccionar el cruce; **no es una campaña física completa**. En la muestra final el agua está a 3,28 m, el mínimo de la geometría del trabajador a 3,228599 y el de la bestia a 3,227: ambos conservan los modelos visibles con aproximadamente 5 cm de pies sumergidos. Tres ondas comparten un dibujo. Web Audio creó un bucle `amb_river` y tres fuentes `step_mud`, todas a velocidad 1. El bus está silenciado: prueba de ejecución/decodificación, no escucha perceptual. La prueba libera mundo y audio al cerrar.

## Compilación y límites

[Build](build.txt) aprobado; conserva la advertencia de bundle grande de Vite. [Paquete web](web-package.txt): 586 archivos, 407.013.274 bytes, 839 enlaces relativos y 20 GLB de ejecución, sin originales ni recursos sustituidos duplicados. [Hashes de fuentes](source-hashes.json).

La primera batería general terminó con 1.983 aprobados y 11 fallos de 1.994 pruebas. Cinco casos conservaban el rechazo antiguo del roce con agua y uno detectó la entrada lejana del rinoceronte; ambos grupos ya se corrigieron. Los restantes detectaron prioridad incorrecta del aviso de cultivos en dos culturas y tres expectativas antiguas de navegación/colocación sobre fluidos. Se conserva el diagnóstico: ese resultado no acredita una batería general verde.

La corrección de prioridad conserva el indicador de líquido para buscar un desplazamiento seguro. Las pruebas del cañón mantienen retirada física, guardado/carga, amanecer, daños y contabilidad; solo cambia la expectativa de poder cruzar el río. [Regresión dirigida](regression-corrections-tests.txt): 60/60 aprobadas, cero fallos, cancelaciones u omisiones; [fuentes verificadas](regression-corrections-hashes.json). Una nueva batería general está en ejecución sobre estas fuentes; su resultado todavía está pendiente.

No se acredita rendimiento de móvil físico, escucha, todas las poses de pies en todos los modelos ni campañas de 100 noches con estas reglas nuevas. Los ensayos largos congelados en `b0d19a5` conservan su procedencia y no sustituyen esas comprobaciones.
