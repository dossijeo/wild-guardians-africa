# Registro de implementación

Fuente normativa: [Plan Maestro 2.0](plan/Wild_Guardians_Plan_Maestro_Definitivo.md).

## Estado

- Paquete descomprimido y documentación original preservada sin modificaciones.
- Repositorio inicial limpio, rama `main`, remoto `dossijeo/wild-guardians-africa`.
- Implementación en curso: simulación, navegación, extracción de assets, escena 3D y persistencia.
- Menú de producción: adaptación del diorama original `Wild_Guardians_Africa_Menu_V2_8_CORREGIDO_Balafons_Call.html`, conservando renderer, recorridos, iluminación, logo y música. Generador: `tools/prepare_menu.py`.
- HUD de producción: artwork, disposición adaptable, retratos y marco de contratación de `Wild_Guardians_HUD_Lab_Contratacion_Diaria.html`. Generador: `tools/prepare_hud.py`. La simulación de demostración no se utiliza como motor del juego.
- Los 159 casos recibidos son requisitos pendientes; no se contabilizan como pruebas ejecutadas.
- Los commits y pushes se realizan directamente en `main`, por preferencia explícita del usuario. No utilizar ramas de transferencia ni commits sin cambios de archivos.
- Incidencia de biblioteca corregida: el visor de cultivos espera `assetData` comprimido con gzip; el empaquetador había entregado el GLB descomprimido. El cargador restaura el envoltorio gzip. Comprobación en navegador: finaliza la carga y muestra las ocho plantas de ejemplo en la parcela original.

## Contratos pendientes

Las aclaraciones del usuario están registradas en `content/balance/clarifications.json`: eventos sistémicos, riego inicial y madurez, monedas enteras, recarga desde lanzamiento, persistencia de cosechas, interrupción de reparaciones y prioridad del ataque sobre amanecer/victoria. Los parámetros visuales y de animación se recuperan de los HTML entregados.

## Validación

`python docs/plan/verificar_reglas.py` ejecuta la comprobación aritmética original. No constituye testeo de una partida integrada.

- Pruebas automatizadas: ejecución completa con 120 casos aprobados, incluyendo 60 combinaciones de bioma/cultura sobre semillas 712 y 918271. Se añadieron después dos casos de fundación postcampaña, también aprobados: conjunto nativo completo, salida transitable, cobro único, coste lineal, persistencia y rechazo sin cobro.
- La comprobación de navegación detectó salidas dentro de edificios y una búsqueda radial que omitía grandes áreas entre sus 24 rayos. Se añadió un punto de salida transitable y candidatos con separación angular constante.
- Colocación y navegación de aldeas utilizan las huellas originales de los edificios a escala 16. Se comprueba su interior y sus bordes; los árboles/rocas grandes se conservan y solo se retiran props menores ocupados. La preparación de Suajili/Volcanes/712 bajó de unos 175 segundos a menos de dos segundos en la comprobación dirigida. La búsqueda asíncrona permite al navegador seguir respondiendo; dos semillas aprobadas no acreditan todas las partidas procedurales.
- Compilación de producción aprobada; sigue existiendo una advertencia por tamaño del módulo principal.
- Se exportaron sin modificar desde sus interfaces originales los cuatro GLB completos de trabajadores: doce acciones por perfil, accesorios reales y agarres IK horneados a 30 fps. Procedencia y hashes: `content/manifests/worker-actions.json`. Las pistas se comprobaron para duración, último fotograma, correspondencia de muestras y valores finitos.
- La escena conecta las acciones originales de siembra/riego, cosecha, caja, carrera, caída y reposo al estado lógico. Los relojes visuales usan tiempo simulado; la caja transportada forma parte del rig original y una caja abandonada conserva esa geometría. 11 pruebas de rigs/controlador aprobadas, incluida la aplicación de las 48 acciones en Three y la visibilidad exclusiva de regadera/caja. Prueba visual cercana: cuatro perfiles con regaderas y cajas, texturas y agarres originales (`tests/browser/workers.html`, solo desarrollo). La partida abre sin errores; sigue pendiente acreditar el ciclo completo integrado y las reservas de carrera/recuperación/colisiones entre trabajadores.
- Ejecución completa posterior a la integración: 133 pruebas aprobadas, ninguna omitida; compilación aprobada. Las pruebas de rigs en Node conservan geometría y animación y omiten la decodificación de imágenes; la apariencia de las texturas se comprobó en navegador.
- Reparación corregida según C02/C06: cobro redondeado y restauración juntos al llegar, sin espera artificial por la animación de colapso. Un ataque elimina inmediatamente las órdenes manuales. Cuatro casos adicionales aprobados: 9,45→10 monedas, saldo agotado durante el trayecto, reconstrucción total y cancelación al comenzar la incursión; compilación aprobada.
