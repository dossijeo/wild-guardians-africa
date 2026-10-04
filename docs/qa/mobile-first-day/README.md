# Usabilidad móvil y nuevas reglas del primer día

Revisión del 4 de octubre de 2026. Las instrucciones posteriores del usuario sustituyen el inicio de 1000 monedas y el tutorial bloqueante del plan original: las partidas nuevas empiezan con 1500 y el tutorial no pausa ni hace inerte la interfaz. Las partidas guardadas conservan su saldo.

Las herramientas de siembra y construcción caducan tras 10 segundos desde su selección o última colocación satisfactoria. Seleccionar una planta cancela la herramienta y abre un panel de recolección de 220 × 68 píxeles; solicitar la cosecha lo cierra inmediatamente. Los mensajes se pueden cerrar y también caducan después de 8–24 segundos de lectura visible. La mano solo indica una acción concreta disponible.

La primera contratación se abre automáticamente al terminar la tanda de siembra, cuando caduca la herramienta. No hay acción permanente de contratación en Construir. Las compras y reparaciones reservan 100 monedas; los salarios pueden utilizar esa reserva. Se avisa al reducir el saldo a 220 o menos y cuando una compra intenta consumir la reserva; el rechazo ocurre antes de cambiar el mundo o cobrar.

Prueba manual mediante controles reales del navegador, 390 × 844, Sabana/Mapungubwe y calidad muy baja; almacenamiento de QA aislado, sin modificar partidas del usuario. Carga inicial: cubierta visible y HUD oculto durante 4,78 segundos, después mundo/HUD disponibles. Durante los mensajes se construyó el centro y se plantaron tres mijos; saldo 685, sin pausas. La contratación apareció automáticamente; una mujer mayor dejó 585. Se completaron ambos riegos, maduraron los tres cultivos y dos cosechas llegaron físicamente al centro: saldo 603. Guardar y Continuar volvió a mostrar la cubierta de carga y restauró los cultivos, el saldo y el tutorial.

Evidencia actual: `three-sprouts-auto-hiring.json`, `growth-and-auto-dismiss.json`, `first-day-two-deliveries.json`, `continued-loading.json`, `minimal-harvest.png` y `hired-new-rules.png`. `ready-new-rules.png` muestra el inicio ya cargado; la cubierta queda acreditada por la cronología DOM. Al continuar duró 6,73 segundos con el HUD oculto.

`tutorial.png`, `crop-panel.png`, `working.json`, `before-new-rules.json` y `surfaces.json` corresponden a la revisión móvil anterior, antes de aprobar 1500 y el tutorial sin pausas. Son evidencia histórica; no acreditan las nuevas reglas económicas. Las métricas y capturas previas de aceptación tampoco se reinterpretan como pruebas de estas reglas.

Se completó la primera noche y apareció automáticamente la contratación del día 2, con saldo 603 y la mujer mayor preseleccionada. `day-two.json`, `day-two.png` y `lifecycle.json` registran ese amanecer y cero errores de navegador. El mundo anterior quedó destruido al volver al menú, sin worker ni listeners de canvas vivos.

Si se cierra la contratación pendiente, tocar el terreno la vuelve a abrir; no se añade un botón de contratación. El paseo sin cultivos se centra en la entrada del centro, no en su huella sólida; las rutas de aproximación inaccesibles reintentan como máximo una vez por segundo.

La comprobación de escritorio/emulación no sustituye probar el tacto, memoria y rendimiento en un teléfono físico.
