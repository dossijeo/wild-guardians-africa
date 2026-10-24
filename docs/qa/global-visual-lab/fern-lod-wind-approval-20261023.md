# Manglares: LOD aprobado y prueba de viento

El usuario aprueba el LOD por su resultado visual y coste, y solicita medir si quitar el viento mejora el rendimiento. Se toma como variante de referencia la ultima combinacion presentada: frondas nativas cercanas y compuesto lejano preiluminado con sombra precalculada, seleccionado por tamano proyectado (64 px, histeresis 60/68). La aprobacion artistica sustituye su anterior estado de candidato pendiente de aceptacion; no significa que su integracion nativa y validacion de recursos ya esten terminadas.

No reducir densidad, numero de matas, iluminacion ni calidad de sombras. La variante sin viento pone fuerza cero en las frondas cercanas y elimina su dependencia temporal en la clave de cache de sombras. Los sprites lejanos ya eran estaticos. No se elimina ninguna hoja ni su capacidad de proyectar sombra. Comparar ABAB con camara normal movil y fija, dia/noche y fixture guardada identica. Eliminar la deformacion no garantiza ahorrar el coste aritmetico del vertex shader; este primer ensayo mide el efecto de detener la animacion y sus invalidaciones sin cambiar el shader.

La integracion definitiva del LOD queda pendiente de esta prueba y de conservar su ciclo de vida y recursos. El diagnostico de apoyo de impostores del Desierto queda aplazado por esta prioridad explicita. Lava original sin cambios.

## Validacion general anterior

Sobre 9992249a6: build correcto (20.30 s). npm test termino: 4757 pruebas, 4693 pass, 2 fail, 62 skipped, 454.99 s. Fallos: tests/resident-props.test.js (doble sin assetGroups.invalidateMaterials) y tests/sfx-catalog-audit.test.js (catalogo desactualizado). No afirmar suite verde. Se investigaran separadamente, sin mezclar su ejecucion con los benchmarks GPU.
