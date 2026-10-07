# Reintento de carga de edificios

Base: e06b76b. Una descarga fallida limpiaba la entrada GLB de `Assets.model`, pero `Assets.building` retenía su promesa rechazada. Una petición posterior en la misma colección volvía a fallar sin intentar descargar.

La entrada de plantilla se elimina al rechazar, únicamente si todavía corresponde a esa misma promesa. Las solicitudes concurrentes siguen compartiendo carga/preparación; una colección cerrada sigue rechazando operaciones y no recupera recursos. No cambia la geometría, materiales, shaders ni el reloj del juego.

La regresión nueva falla antes de la corrección (cache building permanece), y después reintenta con la geometría del primer GLB original del catálogo. Dos solicitudes simultáneas producen una sola descarga fallida; dos reintentos comparten una segunda descarga y exactamente la misma plantilla nativa, con geometría válida y escala 1. La plantilla y su propietario se liberan al terminar.

Validación: 35 pruebas de assets-lifecycle, animal-preload y buildings pasan; build Vite correcto. Los logs completos están al lado. Es una prueba de contrato de caché con un fallo de red simulado y GLB original, no una medición de frametime ni una prueba de fallo de CDN/móvil real.
