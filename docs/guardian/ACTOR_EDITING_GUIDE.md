# EdiciÃ³n de actores 3D: fallos, soluciones y puertas de validaciÃ³n

Registro de trabajo solicitado por el usuario. Se actualiza con evidencia nueva; no es una declaraciÃ³n de que todos los actores estÃ©n terminados. Las comprobaciones pendientes se mantienen pendientes aunque el GLB exporte o una prueba numÃ©rica pase.

## QuÃ© ha fallado y quÃ© hemos aprendido

| Fallo observado | DiagnÃ³stico / evidencia | SoluciÃ³n Ãºtil y lÃ­mite de aplicaciÃ³n |
| --- | --- | --- |
| Apertura cortada por la barbilla | El corte horizontal no seguÃ­a los dientes ni la comisura originales. Se rechazÃ³ tras revisiÃ³n del usuario. | Marcar los bordes dentales y las comisuras en el original antes de cortar. La altura del corte cambia hacia las esquinas. No reutilizar coordenadas de una especie en otra. El constructor antiguo falla explÃ­citamente para no regenerarlo. |
| Colmillo que se estira o queda pegado al hocico | En la hiena, dos piezas dentales estaban conectadas a la piel por vÃ©rtices de articulaciÃ³n; no eran componentes independientes completos. | Examinar componentes biconectados y separar sus caras originales. `actor_dentition.py` identifica las tres piezas de 57/90/91 vÃ©rtices. Esos recuentos son especÃ­ficos de esta fuente, no una regla general. Rechazar selecciÃ³n por color o cercanÃ­a como sustituto de inspecciÃ³n anatÃ³mica. |
| Dientes aparentemente rÃ­gidos solo en los extremos | La interpolaciÃ³n lineal de un morph rotatorio contrae aristas en posiciones intermedias. | Medir 0, 0.5 y 1. La hiena tiene error rÃ­gido cero en apertura mÃ¡xima, pero contracciÃ³n mÃ¡xima aproximada del 1.28% a mitad. Para exigencias mayores, valorar un hueso mandibular; no afirmar rigidez exacta durante todo el recorrido. |
| Doble colmillo: uno geomÃ©trico y otro pintado | Ocultar temporalmente el colmillo real revelÃ³ su impresiÃ³n en el albedo del hocico. | ReparaciÃ³n local del pelaje, excluyendo todas las piezas dentales. Conservar la imagen original y la procedencia del parche. Comprobar ambos lados: reparar uno no valida el otro. |
| Boca tapada por una superficie negra | Las caras entre los labios cubrÃ­an la entrada; una bolsa oscura no aportaba profundidad anatÃ³mica. | Modelar paladar, suelo, lengua con volumen, garganta y paredes laterales hacia el fondo. No tender una cortina entre los bordes frontales. Inspeccionar frente y perfiles, no solo el color oscuro de la abertura. |
| Interior que sobresale por debajo de la mandÃ­bula | Las dimensiones del suelo y la lengua se extendÃ­an demasiado hacia atrÃ¡s; rayos sobre el render identificaron las caras responsables. | Ajustar la cavidad dentro del volumen real del hocico. Usar raycast de diagnÃ³stico para localizar objeto/cara/vÃ©rtices, no seguir cambiando parÃ¡metros a ciegas. |
| Paredes interiores con aspecto de cortina | Las paredes estaban orientadas transversalmente cerca de la entrada. | Orientarlas hacia el fondo, curvar su borde y ocultar el borde del paladar detrÃ¡s del hocico. Mantener libre el acceso frontal. Un test de topologÃ­a por sÃ­ solo no prueba una cavidad visualmente correcta. |
| Pliegue triangular entre cuello y colmillo del collar | Estaba presente en el GLB preparado de origen. Sus vÃ©rtices tenÃ­an desplazamiento de boca exactamente cero. La pieza aislada mostraba triÃ¡ngulos estirados. | Comparar original, preparado y editado antes de culpar al morph. Restaurar posiciones originales por correspondencia de caras UV y transformaciÃ³n verificada. `restore_hyena_collar.py` recupera 1,298 vÃ©rtices, conserva pesos rÃ­gidos de Neck y exige correspondencia completa. No suavizar el cuello para ocultar una pieza de collar daÃ±ada. |
| Correspondencia incorrecta al restaurar geometrÃ­a | Un mismo punto UV puede pertenecer a distintas islas o superficies. El primer intento por UV individual dejÃ³ vÃ©rtices ambiguos. | Usar la firma UV de la cara completa y su esquina. Verificar la transformaciÃ³n con geometrÃ­a no modificada. Para esta hiena: 1,999 vÃ©rtices de ajuste y error mÃ¡ximo de 2.99e-7 m. Si hay puntos sin correspondencia, detener la restauraciÃ³n, no dejar una reparaciÃ³n parcial. |
| Cambios inesperados en UV durante autorÃ­a | AÃ±adir un atributo de color invalidÃ³ una referencia RNA a una capa UV. | Volver a obtener la capa por nombre despuÃ©s de aÃ±adir atributos. Comparar todos los UV originales antes/despuÃ©s. Evitar referencias BMesh/RNA antiguas cuando cambia la estructura de capas. |
| PÃ¡rpados con UV estirados entre islas | Interpolar UV originales en una nueva malla atravesaba discontinuidades del atlas. | Un atlas frontal continuo evita esa interpolaciÃ³n entre islas. Es una soluciÃ³n para la textura, no para el volumen del pÃ¡rpado. El atlas resuelve la continuidad de textura; la forma debe validarse por separado. Los primeros candidatos presentaban protrusiÃ³n/pliegues. El candidato v9 mejora el cierre, pero no tiene aceptaciÃ³n visual completa. |
| PÃ¡rpados que nunca terminan de cerrar | El filtrado temporal adicional suavizaba un pulso que ya estaba diseÃ±ado analÃ­ticamente. | Asignar el peso analÃ­tico del parpadeo; suavizar la boca por separado. Comprobar el mÃ¡ximo realmente aplicado a la malla, ademÃ¡s del valor solicitado. |
| Cierre completo mejorado, pero cierre parcial oculto dentro del ojo | La envolvente continua del candidato v4 elimina los pliegues grandes al cerrar; en Three.js, a peso 0.5, el ojo sigue casi abierto porque la interpolaciÃ³n atraviesa su volumen. | Validar el recorrido, no solo sus extremos. Se implementaron correctivas a 25/50/75% y mezcla de poses vecinas. El medio cierre mejorÃ³ en Three.js; sigue pendiente comprobar todos los pesos, ambos ojos independientes y clips combinados. |
| Facetas al reimportar un morph en Blender que no aparecen igual en Three.js | En el candidato v4, el cierre es suave en Blender fuente y Three.js, pero presenta bandas en el GLB reimportado en Blender. | Mantener las tres referencias. No atribuir automÃ¡ticamente toda diferencia de reimportaciÃ³n al archivo utilizado por el juego. El diagnÃ³stico de normales del importador sigue pendiente. |
| Diferencias entre Blender y el GLB reimportado | El render reimportado mostrÃ³ marcas pequeÃ±as nuevas. El PNG del atlas embebido coincide byte por byte con el PNG horneado. | El siguiente diagnÃ³stico debe aislar normales, triangulaciÃ³n y morphs. TodavÃ­a no se ha demostrado la causa; no volver a pintar la textura sin evidencia. |

Evidencia y lÃ­mites actuales: [correcciÃ³n dental](phase2/face-authoring/dental-correction.md), [estado por escrito](phase2/face-authoring/status.json), [auditorÃ­a dental](phase2/face-authoring/dentition-audit.json), [restauraciÃ³n del collar](phase2/face-authoring/hyena-collar-restored.collar.json), [clips nativos](phase2/face-authoring/hyena-collar-native-clips.json).

## Secuencia para el prÃ³ximo modelo

### 1. Establecer la referencia antes de editar

- Registrar archivo original, hash, rama/commit, versiÃ³n utilizada por el juego y versiÃ³n comprimida. Conservar los originales.
- Renderizar pose neutra de frente, ambos perfiles, tres cuartos y cuerpo completo; aÃ±adir detalle de ojos, boca y accesorios.
- Inspeccionar componentes conectados, piezas fusionadas, caras de reparaciÃ³n, lÃ­mites abiertos, materiales, UV, texturas y pesos. No confundir una frontera de una fila dental con la abertura exterior de la boca.
- Identificar dientes superiores/inferiores, colmillos, lengua si existe, comisuras y lÃ­nea real de cierre. Etiquetar cada pieza antes de moverla.
- Comparar la geometrÃ­a original con la ya preparada/riggeada: daÃ±os preexistentes deben registrarse por separado.
- Inventariar huesos, escalas, ejes, clips y duraciÃ³n. Los animales actuales no comparten todos el mismo esqueleto; algunos son bÃ­pedos estilizados.

### 2. Probar una deformaciÃ³n mÃ­nima antes de construir el conjunto

- Hacer una copia de trabajo y editar una sola funciÃ³n: mandÃ­bula o pÃ¡rpado. Mantener el resto neutro.
- Delimitar explÃ­citamente quÃ© vÃ©rtices pueden moverse y cuÃ¡les deben permanecer invariantes: dientes superiores, collar, ropa, crin, nariz, cejas, segÃºn la anatomÃ­a.
- Para dientes/accesorios rÃ­gidos, comparar longitudes de aristas y transformaciones. Para piel, inspeccionar la transiciÃ³n de pesos y la silueta.
- Revisar valores 0, 0.25, 0.5, 0.75 y 1, incluyendo ambos lados. No producir el resto del pipeline sobre una abertura anatÃ³micamente incorrecta.
- Ante un artefacto, aislar la pieza y localizar las caras responsables. Registrar una hipÃ³tesis concreta y cambiar una sola causa por iteraciÃ³n.

### 3. Interior y textura

- Abertura frontal libre, cavidad con profundidad, paredes dentro del hocico, lengua con volumen y encÃ­as coherentes con los dientes.
- Comprobar ausencia de superficies que atraviesan el mentÃ³n, paredes flotantes o vistas al escenario a travÃ©s de la parte posterior del crÃ¡neo. Distinguir esto de una vista legÃ­tima a travÃ©s de la entrada frontal de perfil.
- Inspeccionar albedo sin iluminaciÃ³n para distinguir pintura de geometrÃ­a/sombras. Ocultar dientes solo para diagnÃ³stico y restaurarlos despuÃ©s.
- Mantener UV originales, excluir dientes del parche de piel y comprobar simetrÃ­a/asimetrÃ­a real. No reflejar ciegamente una correcciÃ³n.
- Hornear los nodos de autorÃ­a al atlas GLB. Comparar antes/despuÃ©s y verificar la imagen realmente embebida; una ruta de archivo correcta no demuestra que se haya exportado la textura correcta.

### 4. Validar la exportaciÃ³n temprano

- Exportar y reimportar un candidato temprano, antes de replicar el mÃ©todo en otros animales.
- Comparar Blender fuente, GLB reimportado y Three.js con pose, cÃ¡mara, expresiÃ³n e iluminaciÃ³n equivalentes.
- Comprobar normales, tangentes, orientaciÃ³n de caras, dobles caras, triangulaciÃ³n, alpha, morph normals, UV y enlaces de materiales. Las caras degeneradas en el morph base merecen una comprobaciÃ³n especÃ­fica.
- Auditar nombres/duraciÃ³n de clips, jerarquÃ­a y poses de huesos. El comparador actual muestrea 246 poses de los seis clips de la hiena; no valida por sÃ­ solo la superficie deformada.
- Inspeccionar tambiÃ©n clips con boca/parpadeo simultÃ¡neos, pausa, reanudaciÃ³n y cambios de acciÃ³n. Una pose neutra correcta no valida un clip.

### 5. Puerta de integraciÃ³n y rendimiento

- Escena de controles manuales: ojos independientes, cierre completo/parcial, boca, clips, expresiones y pausa. Identificar claramente quÃ© archivo/candidato estÃ¡ cargado.
- Juego real: ataque, daÃ±o, caÃ­da, recuperaciÃ³n y huida; granjeros con boca solo en huida/daÃ±o. Revisar collar/crin/ropa en todas esas capas.
- Confirmar que el modelo optimizado conserva los morphs y clips, y que el renderizador usa realmente ese archivo.
- Medir tamaÃ±o, vÃ©rtices/triÃ¡ngulos, huesos, morph bytes, texturas, materiales/draw calls y memoria. Evitar un material adicional por superficie oral si puede consolidarse sin perder calidad.
- Medir coste por actor y por escena comparable: CPU animaciÃ³n, frametime p95/p99, picos, memoria y respuesta de controles. No inferir rendimiento de una escena facial aislada ni de FPS medios.
- Guardar capturas/vÃ­deo y resultados de ejecuciÃ³n. Marcar cada comprobaciÃ³n como aprobada, fallida, pendiente o no aplicable con justificaciÃ³n. No usar Â«no hubo erroresÂ» como equivalente a aceptaciÃ³n visual.

## Herramientas reutilizables y lÃ­mites

| Herramienta | ReutilizaciÃ³n |
| --- | --- |
| `inspect_actor_face.py` | Render de cuatro Ã¡ngulos y valores de morph; las coordenadas de `--mouth-closeup` son de la hiena y deben parametrizarse para otras especies. |
| `audit_actor_face.mjs` | Equivalencia de poses de huesos y clips entre GLB; complementar con inspecciÃ³n de piel y accesorios. |
| `bake_actor_materials.py` | Horneado de nodos al UV original. Actualmente selecciona el marcador `MuzzleRepairProjection`; extender de forma explÃ­cita para otro pipeline. |
| `actor_dentition.py` / `audit_actor_dentition.py` | MÃ©todo topolÃ³gico y mediciÃ³n dental; selecciÃ³n, recuentos, pivote y Ã¡ngulo estÃ¡n calibrados para la hiena. |
| `restore_hyena_collar.py` | RestauraciÃ³n exacta por caras UV y ajuste de coordenadas; nÃºmero de vÃ©rtices y selecciÃ³n Neck especÃ­ficos de esta fuente. |
| `add_hyena_eyelids.py` | Candidato con envolvente curva y correctivas intermedias. No copiar sus coordenadas a otros actores; falta la matriz visual completa para aprobarlo. |

## Reducir iteraciones sin rebajar la calidad

1. Hacer primero referencia anatÃ³mica y comparaciÃ³n de fuentes; despuÃ©s geometrÃ­a, material, exportaciÃ³n e integraciÃ³n. Mantener esa separaciÃ³n en los informes.
2. Usar cÃ¡maras y luces fijas, nombres de candidato/versiones y capturas comparables. Conservar evidencia del defecto y de su correcciÃ³n, no solo el Ãºltimo render favorable.
3. Hacer que los scripts fallen ante cambios de topologÃ­a, UV ambiguos, piezas no identificadas o restauraciones incompletas.
4. Reutilizar algoritmos y comprobaciones, pero mantener un perfil anatÃ³mico por especie. Las coordenadas calibradas no son abstracciones reutilizables.
5. Evitar exportaciones finales, compresiÃ³n y vÃ­deos largos antes de superar las puertas anatÃ³micas. Hacer exportaciones de prueba tempranas para detectar diferencias del formato.
6. AÃ±adir una prueba de regresiÃ³n donde haya una propiedad verificable (pieza rÃ­gida, UV invariantes, clip conservado). Mantener revisiÃ³n grÃ¡fica para forma, naturalidad y legibilidad.
7. No atribuir una causa sin aislarla. Registrar tambiÃ©n los intentos descartados para no repetir cortes horizontales, pesos por proximidad, cortinas interiores o reparaciones parciales.

Usar [la plantilla de revisiÃ³n por actor](actor-edit-review.template.json) como registro. Todos sus resultados empiezan pendientes; copiarla no aprueba ninguna puerta.

### ActualizaciÃ³n: recorrido de pÃ¡rpados y coste de materiales

Las formas intermedias de 25/50/75% evitan el recorrido recto a travÃ©s del ojo. El controlador debe mezclar solo las dos poses vecinas: sumarlas todas sobrecierra el pÃ¡rpado. AdemÃ¡s, normalizar el recorrido sobre la esfera completa desperdicia parte de la animaciÃ³n detrÃ¡s de la ceja; se calibra respecto a la abertura visible. El candidato actual mejora el medio cierre en Three.js, pero sigue pendiente la matriz completa de pesos y clips.

No crear un material por cada regiÃ³n de color cuando sus otras propiedades coinciden: paladar, suelo, garganta y lengua ahora comparten material con color por vÃ©rtice. Se verificaron cuatro draw calls reales frente a siete en el candidato anterior. Comparar tambiÃ©n contra el original (dos); una mejora entre iteraciones no equivale a ausencia de regresiÃ³n respecto al juego.

### CompresiÃ³n: comprobar tambiÃ©n las representaciones dispersas

El candidato con morphs incluye accessors dispersos (`sparse`). La primera compresiÃ³n fallÃ³ al interpretar su vista de Ã­ndices como atributos: el bloque que detenÃ­a la exportaciÃ³n contiene Ã­ndices de **8 bits**, no de 16 bits. Hay que inspeccionar `componentType`, `count`, offsets y longitud reales, incluyendo los Ã­ndices y valores dispersos, antes de elegir modo y stride.

El intento de conservar esos Ã­ndices de 8 bits sin compresiÃ³n superÃ³ ese punto, pero fallÃ³ despuÃ©s en `repack_web_glb_images.mjs`: el reempaquetador exige que toda vista no destinada a imÃ¡genes sea almacenamiento Meshopt auditado. Por tanto, la soluciÃ³n todavÃ­a no estÃ¡ validada de extremo a extremo. No basta con corregir el compresor si el siguiente paso no admite su salida.

Comprobaciones para cerrar este caso:

- Cubrir Ã­ndices dispersos de 8/16/32 bits, valores dispersos y vistas comprimidas y sin comprimir.
- Verificar igualdad de los datos decodificados, nombres y pesos de morphs, clips y poses despuÃ©s del pipeline completo, incluido el reempaquetado de imÃ¡genes.
- Abrir el resultado con el mismo decodificador y renderizador del juego y repetir las expresiones parciales.
- Mantener la prueba aislada del manifiesto de producciÃ³n hasta que pase. No sustituir el modelo publicado por un candidato que solo exporta correctamente desde Blender.


Actualización verificada: el reempaquetador admite ahora vistas sin compresión exclusivamente para índices dispersos de 8 bits, con comprobación de referencias y límites. Las siete pruebas de reempaquetado pasan, incluida la recolocación al cambiar el tamaño de una imagen. El candidato pasa de 59,908,736 a 4,752,800 bytes. La carga Three.js compara exactamente 52 atributos en cuatro mallas y conserva nombres de morphs; 246 muestras de seis clips conservan las poses (21 huesos). Informe: [paridad comprimida](phase2/face-authoring/hyena-compressed-parity.json).

La prueba gráfica del comprimido confirma carga, cuatro draw calls y expresión de dolor sin errores reportados. No equivale a aprobación artística: los párpados todavía se ven abultados. Tampoco sustituye la matriz de clips/expresiones, las pruebas de combate ni las mediciones de rendimiento en incursiones. Se mantiene fuera del manifiesto de producción.
