# Textos del Espíritu ES/EN v2

Integradas las 27 sustituciones en español y sus 27 traducciones inglesas del JSON proporcionado. La referencia archivada coincide con el adjunto original. Todas las claves originales tenían correspondencia exacta en el código y en el catálogo bilingüe; no se omitió ninguna ni se inventaron textos alternativos.

Se actualizan tutorial básico, defensas iniciales y posteriores, riego/entrega, tres magias y recordatorios, recuperación de trabajadores, reserva de contratación, liberación, expansión, derrota y títulos finales. IDs, gestos, disparadores, secuencias, pausas, reglas y constantes de tiempo conservan su implementación. La duración de lectura sigue calculándose con la misma política según la longitud del texto mostrado.

`guardianCopy` normaliza mensajes antiguos almacenados en partidas antes de presentarlos. Se aplica también al motivo de derrota de la modal final. El catálogo retiene las claves anteriores para traducciones de historial y añade las versiones nuevas; la presentación del guardián usa la versión nueva en ambos idiomas. Mensajes ajenos a la referencia permanecen iguales. Catálogo generado: 1.602 entradas. Inventario de presentación actualizado: 3.441 candidatos, que no representan un porcentaje de cobertura.

Verificación:

- 55 tests correctos: catálogo, 27 parejas exactas, compatibilidad de mensajes anteriores, tutorial, defensas posteriores, finalización, recordatorios y reserva de construcción.
- 54 variantes comprobadas en el DOM real del visor, con el adaptador de idioma de producción. Todas coinciden exactamente con los valores del JSON.
- Nueve layouts medidos con HUD y guardián originales: 1280 × 720, 390 × 844 y 844 × 390. Se prueban ambos idiomas para recuperación y, adicionalmente, el aviso español de primera incursión. Cubren el texto más largo de cada idioma. El globo cabe y respeta toda la botonera lateral. Capturas tomadas tras finalizar la entrada del guardián, con dimensiones verificadas; viewport y preferencia de idioma restaurados al terminar.
- Compilación correcta, con la advertencia habitual de bundle grande. Tabla económica y verificador del plan correctos.

El visor de área segura localiza el mensaje elegido; sus etiquetas de HUD son las originales de la fixture. Estas capturas comprueban la composición del texto y la geometría de la interfaz, no una partida completa ni móvil físico. CI completa de la revisión y aceptación global del proyecto siguen pendientes.
