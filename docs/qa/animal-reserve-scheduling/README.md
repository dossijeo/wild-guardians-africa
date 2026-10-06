# Renovación y generaciones obsoletas de reservas

Se extrae la programación de reservas a `WorldScene.prepareUpcomingAnimalRigs`, que sigue ejecutándose desde sync. Se prueban cambios de día con la misma composición, deduplicación del mismo plan, ausencia de reinicio durante un ataque, reposición tras consumir reservas en una incursión diurna y retorno a la reserva base al cerrar la noche. El reloj de reintento se verifica sin esperar tiempo real.

Se corrige una carrera: una preparación antigua puede fallar después de que un plan A haya sido sustituido por B y vuelva A. Comparar solo la clave textual de WorldScene no basta para identificar la generación. AnimalPreload ahora libera el rig y devuelve false si el fallo pertenece a una generación obsoleta; no lo propaga al plan actual. El test reproduce A → reserva base → A y un fallo tardío del primer A, conservando las reservas del último plan.

Veinticinco tests focalizados pasan para AnimalPreload, programación de WorldScene, espera GPU y cancelación de carga. La prueba en navegador usa WorldScene real, Gran Cañón, seed 712, Mapungubwe y calidad media: veinte rigs preparados, ninguna creación durante la aparición, ningún programa nuevo de animales ni errores/avisos capturados. El informe crudo y la captura están junto a este archivo.

Los tests de renovación usan estados controlados y dobles del pool. La prueba del navegador confirma la integración del método con rigs y GPU reales, pero no reproduce jornadas naturales sucesivas, todos los biomas ni móvil físico. Las pruebas anteriores de los seis biomas pertenecen al cambio de preparación de pantalla. No se extiende esa aceptación automáticamente a esta nueva programación.
