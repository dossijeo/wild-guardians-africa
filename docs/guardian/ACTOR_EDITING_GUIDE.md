# Edición de actores 3D: fallos, soluciones y puertas de validación

Registro de trabajo solicitado por el usuario. Se actualiza con evidencia nueva; no es una declaración de que todos los actores estén terminados. Las comprobaciones pendientes se mantienen pendientes aunque el GLB exporte o una prueba numérica pase.

## Qué ha fallado y qué hemos aprendido

| Fallo observado | Diagnóstico / evidencia | Solución útil y límite de aplicación |
| --- | --- | --- |
| Apertura cortada por la barbilla | El corte horizontal no seguía los dientes ni la comisura originales. Se rechazó tras revisión del usuario. | Marcar los bordes dentales y las comisuras en el original antes de cortar. La altura del corte cambia hacia las esquinas. No reutilizar coordenadas de una especie en otra. El constructor antiguo falla explícitamente para no regenerarlo. |
| Colmillo que se estira o queda pegado al hocico | En la hiena, dos piezas dentales estaban conectadas a la piel por vértices de articulación; no eran componentes independientes completos. | Examinar componentes biconectados y separar sus caras originales. `actor_dentition.py` identifica las tres piezas de 57/90/91 vértices. Esos recuentos son específicos de esta fuente, no una regla general. Rechazar selección por color o cercanía como sustituto de inspección anatómica. |
| Dientes aparentemente rígidos solo en los extremos | La interpolación lineal de un morph rotatorio contrae aristas en posiciones intermedias. | Medir 0, 0.5 y 1. La hiena tiene error rígido cero en apertura máxima, pero contracción máxima aproximada del 1.28% a mitad. Para exigencias mayores, valorar un hueso mandibular; no afirmar rigidez exacta durante todo el recorrido. |
| Doble colmillo: uno geométrico y otro pintado | Ocultar temporalmente el colmillo real reveló su impresión en el albedo del hocico. | Reparación local del pelaje, excluyendo todas las piezas dentales. Conservar la imagen original y la procedencia del parche. Comprobar ambos lados: reparar uno no valida el otro. |
| Boca tapada por una superficie negra | Las caras entre los labios cubrían la entrada; una bolsa oscura no aportaba profundidad anatómica. | Modelar paladar, suelo, lengua con volumen, garganta y paredes laterales hacia el fondo. No tender una cortina entre los bordes frontales. Inspeccionar frente y perfiles, no solo el color oscuro de la abertura. |
| Interior que sobresale por debajo de la mandíbula | Las dimensiones del suelo y la lengua se extendían demasiado hacia atrás; rayos sobre el render identificaron las caras responsables. | Ajustar la cavidad dentro del volumen real del hocico. Usar raycast de diagnóstico para localizar objeto/cara/vértices, no seguir cambiando parámetros a ciegas. |
| Paredes interiores con aspecto de cortina | Las paredes estaban orientadas transversalmente cerca de la entrada. | Orientarlas hacia el fondo, curvar su borde y ocultar el borde del paladar detrás del hocico. Mantener libre el acceso frontal. Un test de topología por sí solo no prueba una cavidad visualmente correcta. |
| Pliegue triangular entre cuello y colmillo del collar | Estaba presente en el GLB preparado de origen. Sus vértices tenían desplazamiento de boca exactamente cero. La pieza aislada mostraba triángulos estirados. | Comparar original, preparado y editado antes de culpar al morph. Restaurar posiciones originales por correspondencia de caras UV y transformación verificada. `restore_hyena_collar.py` recupera 1,298 vértices, conserva pesos rígidos de Neck y exige correspondencia completa. No suavizar el cuello para ocultar una pieza de collar dañada. |
| Correspondencia incorrecta al restaurar geometría | Un mismo punto UV puede pertenecer a distintas islas o superficies. El primer intento por UV individual dejó vértices ambiguos. | Usar la firma UV de la cara completa y su esquina. Verificar la transformación con geometría no modificada. Para esta hiena: 1,999 vértices de ajuste y error máximo de 2.99e-7 m. Si hay puntos sin correspondencia, detener la restauración, no dejar una reparación parcial. |
| Cambios inesperados en UV durante autoría | Añadir un atributo de color invalidó una referencia RNA a una capa UV. | Volver a obtener la capa por nombre después de añadir atributos. Comparar todos los UV originales antes/después. Evitar referencias BMesh/RNA antiguas cuando cambia la estructura de capas. |
| Párpados con UV estirados entre islas | Interpolar UV originales en una nueva malla atravesaba discontinuidades del atlas. | Un atlas frontal continuo evita esa interpolación entre islas. Es una solución para la textura, no para el volumen del párpado. El candidato actual todavía presenta protrusión/pliegues y no está aceptado. |
| Párpados que nunca terminan de cerrar | El filtrado temporal adicional suavizaba un pulso que ya estaba diseñado analíticamente. | Asignar el peso analítico del parpadeo; suavizar la boca por separado. Comprobar el máximo realmente aplicado a la malla, además del valor solicitado. |
| Diferencias entre Blender y el GLB reimportado | El render reimportado mostró marcas pequeñas nuevas. El PNG del atlas embebido coincide byte por byte con el PNG horneado. | El siguiente diagnóstico debe aislar normales, triangulación y morphs. Todavía no se ha demostrado la causa; no volver a pintar la textura sin evidencia. |

Evidencia y límites actuales: [corrección dental](phase2/face-authoring/dental-correction.md), [estado por escrito](phase2/face-authoring/status.json), [auditoría dental](phase2/face-authoring/dentition-audit.json), [restauración del collar](phase2/face-authoring/hyena-collar-restored.collar.json), [clips nativos](phase2/face-authoring/hyena-collar-native-clips.json).

## Secuencia para el próximo modelo

### 1. Establecer la referencia antes de editar

- Registrar archivo original, hash, rama/commit, versión utilizada por el juego y versión comprimida. Conservar los originales.
- Renderizar pose neutra de frente, ambos perfiles, tres cuartos y cuerpo completo; añadir detalle de ojos, boca y accesorios.
- Inspeccionar componentes conectados, piezas fusionadas, caras de reparación, límites abiertos, materiales, UV, texturas y pesos. No confundir una frontera de una fila dental con la abertura exterior de la boca.
- Identificar dientes superiores/inferiores, colmillos, lengua si existe, comisuras y línea real de cierre. Etiquetar cada pieza antes de moverla.
- Comparar la geometría original con la ya preparada/riggeada: daños preexistentes deben registrarse por separado.
- Inventariar huesos, escalas, ejes, clips y duración. Los animales actuales no comparten todos el mismo esqueleto; algunos son bípedos estilizados.

### 2. Probar una deformación mínima antes de construir el conjunto

- Hacer una copia de trabajo y editar una sola función: mandíbula o párpado. Mantener el resto neutro.
- Delimitar explícitamente qué vértices pueden moverse y cuáles deben permanecer invariantes: dientes superiores, collar, ropa, crin, nariz, cejas, según la anatomía.
- Para dientes/accesorios rígidos, comparar longitudes de aristas y transformaciones. Para piel, inspeccionar la transición de pesos y la silueta.
- Revisar valores 0, 0.25, 0.5, 0.75 y 1, incluyendo ambos lados. No producir el resto del pipeline sobre una abertura anatómicamente incorrecta.
- Ante un artefacto, aislar la pieza y localizar las caras responsables. Registrar una hipótesis concreta y cambiar una sola causa por iteración.

### 3. Interior y textura

- Abertura frontal libre, cavidad con profundidad, paredes dentro del hocico, lengua con volumen y encías coherentes con los dientes.
- Comprobar ausencia de superficies que atraviesan el mentón, paredes flotantes o vistas al escenario a través de la parte posterior del cráneo. Distinguir esto de una vista legítima a través de la entrada frontal de perfil.
- Inspeccionar albedo sin iluminación para distinguir pintura de geometría/sombras. Ocultar dientes solo para diagnóstico y restaurarlos después.
- Mantener UV originales, excluir dientes del parche de piel y comprobar simetría/asimetría real. No reflejar ciegamente una corrección.
- Hornear los nodos de autoría al atlas GLB. Comparar antes/después y verificar la imagen realmente embebida; una ruta de archivo correcta no demuestra que se haya exportado la textura correcta.

### 4. Validar la exportación temprano

- Exportar y reimportar un candidato temprano, antes de replicar el método en otros animales.
- Comparar Blender fuente, GLB reimportado y Three.js con pose, cámara, expresión e iluminación equivalentes.
- Comprobar normales, tangentes, orientación de caras, dobles caras, triangulación, alpha, morph normals, UV y enlaces de materiales. Las caras degeneradas en el morph base merecen una comprobación específica.
- Auditar nombres/duración de clips, jerarquía y poses de huesos. El comparador actual muestrea 246 poses de los seis clips de la hiena; no valida por sí solo la superficie deformada.
- Inspeccionar también clips con boca/parpadeo simultáneos, pausa, reanudación y cambios de acción. Una pose neutra correcta no valida un clip.

### 5. Puerta de integración y rendimiento

- Escena de controles manuales: ojos independientes, cierre completo/parcial, boca, clips, expresiones y pausa. Identificar claramente qué archivo/candidato está cargado.
- Juego real: ataque, daño, caída, recuperación y huida; granjeros con boca solo en huida/daño. Revisar collar/crin/ropa en todas esas capas.
- Confirmar que el modelo optimizado conserva los morphs y clips, y que el renderizador usa realmente ese archivo.
- Medir tamaño, vértices/triángulos, huesos, morph bytes, texturas, materiales/draw calls y memoria. Evitar un material adicional por superficie oral si puede consolidarse sin perder calidad.
- Medir coste por actor y por escena comparable: CPU animación, frametime p95/p99, picos, memoria y respuesta de controles. No inferir rendimiento de una escena facial aislada ni de FPS medios.
- Guardar capturas/vídeo y resultados de ejecución. Marcar cada comprobación como aprobada, fallida, pendiente o no aplicable con justificación. No usar «no hubo errores» como equivalente a aceptación visual.

## Herramientas reutilizables y límites

| Herramienta | Reutilización |
| --- | --- |
| `inspect_actor_face.py` | Render de cuatro ángulos y valores de morph; las coordenadas de `--mouth-closeup` son de la hiena y deben parametrizarse para otras especies. |
| `audit_actor_face.mjs` | Equivalencia de poses de huesos y clips entre GLB; complementar con inspección de piel y accesorios. |
| `bake_actor_materials.py` | Horneado de nodos al UV original. Actualmente selecciona el marcador `MuzzleRepairProjection`; extender de forma explícita para otro pipeline. |
| `actor_dentition.py` / `audit_actor_dentition.py` | Método topológico y medición dental; selección, recuentos, pivote y ángulo están calibrados para la hiena. |
| `restore_hyena_collar.py` | Restauración exacta por caras UV y ajuste de coordenadas; número de vértices y selección Neck específicos de esta fuente. |
| `add_hyena_eyelids.py` | Experimental. No usar como solución aprobada ni copiar sus coordenadas a otros actores mientras siga fallando la revisión visual. |

## Reducir iteraciones sin rebajar la calidad

1. Hacer primero referencia anatómica y comparación de fuentes; después geometría, material, exportación e integración. Mantener esa separación en los informes.
2. Usar cámaras y luces fijas, nombres de candidato/versiones y capturas comparables. Conservar evidencia del defecto y de su corrección, no solo el último render favorable.
3. Hacer que los scripts fallen ante cambios de topología, UV ambiguos, piezas no identificadas o restauraciones incompletas.
4. Reutilizar algoritmos y comprobaciones, pero mantener un perfil anatómico por especie. Las coordenadas calibradas no son abstracciones reutilizables.
5. Evitar exportaciones finales, compresión y vídeos largos antes de superar las puertas anatómicas. Hacer exportaciones de prueba tempranas para detectar diferencias del formato.
6. Añadir una prueba de regresión donde haya una propiedad verificable (pieza rígida, UV invariantes, clip conservado). Mantener revisión gráfica para forma, naturalidad y legibilidad.
7. No atribuir una causa sin aislarla. Registrar también los intentos descartados para no repetir cortes horizontales, pesos por proximidad, cortinas interiores o reparaciones parciales.

Usar [la plantilla de revisión por actor](actor-edit-review.template.json) como registro. Todos sus resultados empiezan pendientes; copiarla no aprueba ninguna puerta.
