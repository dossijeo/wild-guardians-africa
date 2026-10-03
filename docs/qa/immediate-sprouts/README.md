# QA-017 — ocho brotes inmediatos

Se ejecutaron ocho comandos reales `Game.plant` sobre parcelas legales de navegación nativa de Sabana/Mapungubwe, semilla 712, terreno V4.1.10.3. `WorldScene` cargó los assets, suelo, sombras y materiales de producción. El fixture declara 1600 monedas de crédito QA y cobra 800 por el centro; no guarda partidas ni avanza el reloj ni crea trabajadores.

| Especie | Cobro |
| --- | ---: |
| Maíz | 8 |
| Algodón | 100 |
| Girasol | 18 |
| Plátano | 150 |
| Sorgo | 6 |
| Mijo | 5 |
| Yuca | 12 |
| Batata | 10 |

Total 309; saldo 800 → 491. `planted.json` acredita ocho plantas vivas con crecimiento cero y primer riego pendiente, y ocho mallas nativas distintas `*_01_brote`, una instancia por especie. `rotated.json` es idéntico: mover la cámara no altera la agricultura ni los cobros. Las dos capturas muestran los ocho brotes y se inspeccionaron visualmente; `console.json` no contiene errores ni advertencias.

Esta prueba completa la evidencia visual del brote que faltaba a las pruebas de catálogo/cobro/IDs y rechazo de especies ajenas. No acredita por sí sola la herramienta del HUD, una campaña natural o el balance completo.

Reproducir: `npm run dev`, abrir `/tests/browser/crop-sprouts-world.html`, pulsar «Plantar las ocho especies» y «Girar cámara».
