# Solapamiento Opus con WebAudio nativo

Base de producción `ebce9b1`. Navegador integrado, localhost5191,
`tests/browser/music-window-lifecycle.html`, AudioContext real a48kHz, salida
silenciada. Se utilizan el loader, índices Opus, reader, decoder, mixer y
transporte de producción; no hay reloj ni callbacks nativos simulados.
La mezcla diurna mantiene sus ocho capas elegibles y desactiva la evolución
aleatoria exclusivamente en la fixture para aislar navegación y liberación.

Cuatro casos terminales correctos: wrap y primer salto registrado en ambos
bancos. Cada caso observa11s de reloj nativo después de la carga, además de
250ms para comprobar ended al parar. Se usan offsets próximos a las fronteras
originales; no se acelera ni cambia el pitch del audio.

| Caso | Pico de PCM (bytes) | Decks / fuentes / ventanas en el pico | PCM después de transición (bytes) |
| --- | ---: | --- | ---: |
| A / wrap | 72.377.856 | 2 /32 /32 | 37.438.464 |
| A / B_A | 74.876.928 | 2 /32 /32 | 37.438.464 |
| B / wrap | 74.221.056 | 2 /32 /32 | 37.438.464 |
| B / D_B | 74.876.928 | 2 /32 /32 | 37.438.464 |

Después del solapamiento los cuatro casos vuelven a un deck,16 fuentes y16
ventanas. Las fuentes incluyen ventanas programadas para el futuro: el número
no equivale a pistas audibles simultáneamente.40/48/40/40 fuentes completaron
ended y liberaron buffer; al parar, cero fuentes y pool eliminado, contexto
cerrado en los cuatro casos. Máximo error de fase2,842170943040401e-14s.
Cero errores en los informes; sin reinicio de transporte ni buffers completos.

El ensayo reproduce nativamente el pico de74.876.928 bytes y lo vincula a dos
decks durante saltos registrados. La subida no es acumulación persistente en
estos casos. La captura histórica de colapsos no tenía esa traza y no se
sobrescribe ni se atribuye retrospectivamente una causa exacta.

`result.json` contiene tiempos nativos, pico y estado posterior; `final.png`
muestra4/4 correctos y fue inspeccionada. `syntax.json.gz` conserva el chequeo
de135 páginas/134 scripts sin errores, incluida la nueva fixture.
`provenance.json` fija los hashes de fuentes y rutas runtime; `hashes.json`
fija los artefactos. No se cambia código de producción en esta entrega.

No acredita escucha, carga fría en CDN, RAM física/GC, CPU de decodificación,
presión de memoria móvil ni comportamiento musical en una incursión con todo
el mundo3D renderizándose. Tampoco declara74,9MB como techo universal para
todas las escenas o ganancias. La comprobación prolongada con mixer dinámico
permanece documentada por separado como prueba con contexto simulado.
