# CI de los índices compartidos de audio

Revisión validada: `7779a8ec6438388afba06244424f304f84c64b92`. [Validate Game](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37527349839) terminó correctamente el 6 de octubre de 2026.

Pasaron 2.533 pruebas (cero fallos), las verificaciones de assets, audio, plan y balance, la compilación y la comprobación/creación del paquete web. El ZIP tiene 332.406.390 bytes y CRCs verificados por el empaquetador. La API registra `wild-guardians-itch.zip` como artefacto sin caducar, ID 11442693428; el upload utiliza `archive: false`. Se conserva también el artefacto `wild-guardians-build`.

`validate.json` conserva SHA, resultado y pasos; `artifacts.json`, la respuesta de inventario; `validate.log.gz`, el log completo obtenido mediante gh. No se descargó ni se abrió el artefacto remoto en esta comprobación. No acredita escucha, rendimiento móvil, Windows ni publicación en itch.io. Los cambios posteriores de c7ac0bb son una prueba de navegador y su evidencia; esta CI no se atribuye a un SHA posterior.

El barrido SFX actual conserva 89 asignaciones y 37 reservas. La regeneración solo cambia siete hashes de fuentes; las 126 filas y sus acciones permanecen iguales. No equivale a completar la integración ni la escucha del catálogo.
