# Las 54 voces hasta su final natural

La fixture `tests/browser/spirit-voice-complete.html` reprodujo las 27 pistas españolas y las 27 inglesas completas en el navegador integrado, desde `http://127.0.0.1:5191`, con el controlador `SpiritVoice` y los Opus originales del lab. El ensayo empezó en `cd31d6b` y terminó en `f152623`; los commits intermedios solo cambian QA/documentación. La pestaña649 se cerró después de guardar los resultados.

`result.json` registra 54 finales naturales, exactamente una continuación por pista, reproducción a velocidad1 y liberación de cada fuente: medio pausado, atributo `src` eliminado y voz en estado idle tras stop. No se usa seek para llegar al final. `console.json` no contiene avisos ni errores. [Captura terminal](complete.jpg) inspeccionada y conservada sin recomprimir.

`provenance.json` fija la fixture, controlador, resolver, manifiesto y hashes de los 54 recursos; `hashes.json` identifica los informes y captura. El resultado se contrasta contra el orden y los bytes del manifiesto actual.

La salida está silenciada. Esta prueba acredita el ciclo de reproducción completo de los medios locales, no calidad subjetiva, mezcla con música/SFX, avance de mensajes en gameplay, restricciones de autoplay del iframe de itch, móvil físico o RAM/CPU. El [primer ensayo fallido](../spirit-catalog-native/complete-attempt.json), que se detuvo en ES_21 tras 20 finales, permanece intacto: este nuevo resultado no establece su causa ni acredita tolerancia a todos los fallos de red.
