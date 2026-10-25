# Revision del experimento global

PR en borrador: https://github.com/dossijeo/wild-guardians-africa/pull/159

Abierta el 20/10/2026 sobre codex/global-visual-lab, sin fusionar. El objetivo de calidad de los seis mockups permanece activo y sin alcanzar.

Consultar GLOBAL-DIRECTION.md para decisiones y los README por experimento para capturas comparables, metricas, descartes y limitaciones. El ultimo cambio integrado al abrir la PR es 296dcedc (luz gradual del Desierto).

## Alcance historico

La diferencia de src entre 27f08903 y 296dcedc se limita a siete archivos de src/rendering. La diferencia completa contra origin/main incluye experimentos anteriores: assets de taller, pilotos de vegetacion y la opcion canyonOpenRight en terreno y motor espacial. No atribuir esos cambios previos a esta continuacion ni presentar la rama completa como exclusivamente grafica. Antes de una eventual fusion hay que revisar ese alcance y separar el voluminoso archivo QA de los cambios que se quieran adoptar. No se ha modificado main ni descartado historia del usuario.

La PR sirve para revision visual y tecnica; no es una aprobacion del presupuesto global ni una solicitud de fusion. La vegetacion y el volumen global necesitan mas trabajo. No se enviaron mensajes al core.

## Pase de suelo sin geometría (20/10)

[Ground POM](ground-pom/README.md): cuatro variantes principales, dos diagnósticos de altura y controles de restauración. 56 capturas, ocho clips, 9.600 muestras GPU, contadores de lecturas por fragmento y prueba solar/nocturna. Sin cambios de producción. No se recomienda integrar: el volumen del mockup sigue sin alcanzarse. La PR permanece en borrador; este pase añade evidencia y descartes, no una mejora aprobada.
