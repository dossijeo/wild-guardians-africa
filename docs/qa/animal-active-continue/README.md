# Restaurar una incursión activa

El mundo reserva ahora los rigs de los animales presentes antes de sincronizar las entidades del guardado. Espera a que sus modelos estén incorporados y prepara sus recursos GPU aunque estén fuera de la cámara inicial. Los animales con estado `gone` se excluyen; los que siguen saliendo aún necesitan su modelo. Si no hay incursión, se conserva la preparación del plan nocturno pendiente.

La preparación GPU mantiene los modelos activos bajo sus raíces originales y restaura su descarte por frustum después de la pasada oculta. Un error de carga o cancelación impide declarar el mundo listo.

## Validación

Fixture: `tests/browser/mobile-first-day.html?resume-active=1&biome=gran-canon`, aplicación y menú Continuar reales, IndexedDB aislado con sufijo `-qa-mobile-first-day`. Gran Cañón, seed 712, Mapungubwe, calidad muy baja, escritorio 1280 × 720.

El guardado contiene un centro y cuatro brotes pagados. La simulación dispara un grupo controlado de veinte animales mediante el reloj y luego se pausa con `qa-camera` antes de guardarlo. Esta composición es una prueba de estrés, no una noche introductoria natural.

- Al finalizar WorldScene.load, los veinte modelos están listos, cada uno conserva su padre correcto y animalGpuReady es true.
- El plan nocturno ya está consumido; no se vuelve a disparar ni se modifica para obtener reservas.
- No quedan reservas sobrantes de esas cinco especies: los veinte rigs fueron consumidos por los actores restaurados.
- Los informes y la consola no registran errores.
- Pasan 28 tests de reservas, planificación, carga guardada, cancelación y preparación GPU.
- Compilación de producción correcta, 209 módulos; persiste el aviso de tamaño del bundle principal.

`report.json` registra la disponibilidad al resolver load, `player.json` el estado restaurado y `console.json` los avisos/errores. `ready.png` muestra la vista inicial de la plantación; los animales están fuera de esa cámara. El contacto y la visibilidad de facóqueros restaurados se verifican posteriormente en [animal-active-motion](../animal-active-motion/README.md), mediante otro fixture. Siguen pendientes las demás especies/combinaciones y el rendimiento/memoria de móvil físico.
