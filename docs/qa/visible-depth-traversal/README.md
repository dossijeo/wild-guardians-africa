# Preparación de profundidad solo para subárboles visibles

El pase de profundidad preparaba materiales incluso dentro de objetos con `visible=false`. Ahora usa `traverseVisible`, siguiendo el descarte de subárboles que realiza Three antes de proyectar objetos. Los materiales compartidos se preparan mediante sus propietarios visibles y se restauran al terminar, también si falla el render. No cambia las recetas de profundidad, alpha, deformaciones, clipping ni destrucción. El diagnóstico puede recuperar el recorrido anterior con `visibleDepthOnly=false`.

## Verificación

21 pruebas dirigidas correctas: materiales de profundidad, recetas estándar, instancias de cultivos y origen de render. El caso añadido comprueba ancestros invisibles, materiales compartidos, revelado posterior, ruta de referencia y restauración tras excepción. Comando: `node --test tests/depth-capture.test.js tests/standard-depth.test.js tests/crop-upload.test.js tests/render-origin.test.js` (exit 0, 21 pass, 0 fail). Build correcto; persiste el aviso de bundle grande ([log](build.log.gz)).

Cinco comparaciones nativas con reloj pausado y rutas especializadas iguales, cambiando únicamente el recorrido completo/visible:

| Escena | Meshes preparados antes | Después | Píxeles comparados | Diferencias |
| --- | --- | --- | --- | --- |
| Manglares/Saheliana intacto | 1031 | 928 | 1440000 | 0 |
| Manglares/Saheliana colapso | 1031 | 931 | 1440000 | 0 |
| Gran Cañón/Mapungubwe intacto | 676 | 573 | 1440000 | 0 |
| Gran Cañón/Mapungubwe trabajo | 685 | 573 | 1440000 | 0 |
| Gran Cañón/Mapungubwe colapso | 685 | 576 | 1440000 | 0 |

Los recuentos suman specialized/fallback/excluded, y se refieren a preparación, no a draw calls ni triángulos. Las lecturas de profundidad no son constantes. En todos los pares se mantiene exactamente el estado lógico serializado. Sin errores registrados; consola de la prueba de Gran Cañón vacía. El trabajo de Gran Cañón corresponde a un trabajador actuando y efecto `dig` presente; sus sólidos activos son cero en esa muestra, por lo que no prueba equivalencia de partículas sólidas activas. Daño al 85 % impuesto como estado visual QA, no incursión simulada.

Los JSON separados contienen lecturas resumidas y resultados por caso; [hashes de fuentes y evidencia](proof.json). El intento de buscar trabajo después de colapsar el centro de Manglares no produjo VFX: [registro rechazado](rejected-work-after-collapse.json), que conserva un resultado anterior y **no cuenta como comparación de trabajo**.

## Alcance pendiente

Reduce trabajo de preparación CPU y evita crear/actualizar recetas de objetos ocultos; no elimina geometría residente ni cambia el pase GPU. No se ha medido una mejora de frametime/FPS ni RAM en bytes. Dos escenas y poses controladas no acreditan todos los biomas, culturas, ataques, móvil ni campaña de cien noches. Las campañas congeladas existentes siguen ejecutándose.

Para reproducir, servir Vite, abrir `tests/browser/depth-capture.html?biome=manglares&culture=saheliana` o `?biome=gran-canon&culture=mapungubwe`, y pulsar «Comparar recorrido visible». Cambiar daño al 85 % permite repetir el colapso; buscar trabajo con el centro intacto antes de alterar daño. El pase se fuerza en este visor para poder compararlo aunque no haya VFX.
