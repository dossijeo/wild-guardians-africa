# Contratación en pantallas pequeñas e idiomas

Corrección visual `8f2bf23`, 3 de octubre de 2026. Comprobación mediante la UI real en el origen independiente de QA `127.0.0.1:5176`, con la partida Desierto/Etíope. Se respetaron los componentes y disposición del HUD original.

## Defecto corregido

El CSS nativo de retrato sustituía el texto localizado de pausa por el pseudo-elemento literal «En pausa». En inglés se veía ese texto español aunque el DOM contuviese «Time paused». [Antes](qa/acceptance-start/hiring-portrait-en.png). El override para `html[lang="en"]` muestra el texto ya traducido y suprime el pseudo-elemento, conservando la disposición. [Después](qa/acceptance-start/hiring-portrait-fixed-en.png).

## Comprobaciones

Se abrió contratación en el punto del guion, con 195 monedas, tras pagar centro y mijo. Se comprobaron 390 × 844 y 844 × 390, con inglés y español:

- Cuatro retratos, nombres, salarios, horarios y controles de cantidad legibles.
- Resumen de disponible/coste/restante y botón de confirmación visibles; cuerpo con desplazamiento independiente al desplegar el texto largo. En horizontal su altura útil fue 174 px y el contenido 249 px, con `overflow-y: auto`; la ayuda pudo leerse desplazando el cuerpo.
- Dos mayores seleccionados cuestan 200: saldo proyectado −5, confirmación deshabilitada y aviso «Reduce your crew…»/«Reduce la plantilla…», sin cobrar.
- El cambio de idioma desde Opciones de otra pestaña del mismo origen actualizó el borrador abierto sin cambiar cantidades, saldo ni reloj pausado. Al retirar a la mujer mayor, confirmar se habilitó. La confirmación horizontal en español cobró 100, dejó 95 y presentó la siguiente lectura del Espíritu.
- Una compra posterior de centro sobre suelo libre mostró «Fondos insuficientes» y conservó 95. Otro intento sobre el cultivo se rechazó por ocupación, también sin cobrar.

Evidencias:

- Inglés: [vertical con presupuesto excedido](qa/acceptance-start/hiring-budget-portrait-en.png), [horizontal](qa/acceptance-start/hiring-landscape-en.png), [ayuda vertical](qa/acceptance-start/hiring-details-portrait-en.png), [ayuda horizontal](qa/acceptance-start/hiring-details-landscape-en.png).
- Español: [ayuda vertical](qa/acceptance-start/hiring-details-portrait-es.png), [horizontal](qa/acceptance-start/hiring-landscape-es.png), [ayuda horizontal desplazada](qa/acceptance-start/hiring-details-landscape-es.png), [confirmación realizada](qa/acceptance-start/hiring-confirmed-landscape-es.png).
- [Fondos insuficientes](qa/acceptance-start/insufficient-funds-es.png), [cultivo que bloquea la colocación](qa/acceptance-start/crop-blocked-ground-es.png).

El override de viewport se aplicaba a la pestaña seleccionada: tras cerrar la pestaña auxiliar se confirmó mediante el DOM que la pestaña de contratación era realmente 844 × 390, antes de guardar la prueba horizontal en español. Se restauró el viewport y se cerraron las pestañas y el servidor de QA. No se controló la pestaña del usuario en 5173.

QA-006 y QA-008 quedan acreditados para estos casos. Esto no acredita toda la experiencia táctil, los demás diálogos móviles ni todos los caminos de feedback dentro de paneles/modales; siguen dentro de la auditoría global pendiente.

## Validación

10/10 pruebas de idiomas: [mobile-i18n.log](qa/acceptance-start/mobile-i18n.log). Build correcto en 7,28 s: [mobile-build.log](qa/acceptance-start/mobile-build.log). Verificación del paquete: [mobile-package.log](qa/acceptance-start/mobile-package.log), 554 archivos, 379.673.206 bytes, 794 enlaces relativos y 20 GLB. Persiste el aviso de bundle JavaScript mayor de 500 kB.
