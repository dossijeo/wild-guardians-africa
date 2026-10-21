# Gran Río: claros herbáceos entre accesos

Piloto de composición a escala del poblado, inspirado en la referencia original 2-13512.jpg: sustituye la explanada continua por suelo herbáceo en espacios libres. No cambia edificios, modelos, terreno geométrico, navegación ni reglas. Modifica solo alfa de una copia de la máscara de material. La cubierta existente consume esa misma máscara, manteniendo exclusiones de ocupación, agua y pendiente.

El desgaste máximo entre núcleo radial y corredores se descompone visualmente: se reduce el componente radial según parches mundiales amplios, manteniendo un suelo mínimo de desgaste para los accesos derivados de su fórmula existente. No se certifica todavía preservación exacta del ancho visible ni ausencia de toda hoja sobre su borde; requiere validación espacial específica. No aplicar a producción.

La primera prueba no hizo nada: el field nativo no expone settlementSite en config. Se verificó en capturas diagnósticas. La versión funcional lee el pequeño snapshot de terreno que ya usa el horizonte y reconstruye los radios desde hx/hz con la fórmula de makeSettlement. Solo al crear máscaras, sin consultas por frame ni cambios en Engine. Este piloto utiliza el primer poblado; no está listo para múltiples asentamientos ni cambios de población.

Doce capturas baja/1280×720/semilla712, día/noche, cámaras normal/oblicua/inversa. Coinciden cámara, objetivo y hora; sin errores ni overflow. La geometría cambia intencionadamente: vista normal 504.136→509.680 triángulos, cobertura lejana 5.123→5.816 módulos. Vista oblicua 565.583→577.815; inversa 522.918→535.614. No presentar estas parejas como carga GPU equivalente.

Inspección normal diurna: la mancha circular marrón se reduce mucho, los accesos conservan lectura y los espacios libres vuelven a verde, más próximos a la referencia. Parte del suelo aún se lee plano a distancia; no se declara lograda la cubierta final. Conservar candidata para revisión cercana/nocturna, límites de caminos, streaming y benchmark. **Coste CPU/GPU todavía no medido**, sin aprobación de integración.

[Comparativa normal](native-site/day-game-pair.webp), [noche](native-site/night-game-pair.webp), [datos](native-site/captures.json), [geometría](native-site/comparison.json). Reproducir con capture-river-yard-islands.mjs y package-river-yard-islands.py en Vite5190. El helper QA es independiente de la receta integrada y permanece apagado por defecto.

## Corrección de caminos y coste medido

La primera fórmula del piloto usaba ruido quintic del generador JS; el generador nativo usa interpolación cubic. Se corrigió el warp de accesos para seguir spatial-savanna.cpp, manteniendo el ruido artístico independiente de las islas. Dos pruebas pasan: RGB/entrada inmutables, muestras compartidas entre chunks idénticas, desgaste central de accesos conservado y fórmula cubic en coordenadas positivas/negativas. Esto no certifica todavía cada huella de hoja animada sobre el borde del camino.

Se generaron otras doce capturas tras la corrección: [día](native-path/day-game-pair.webp), [noche](native-path/night-game-pair.webp). La inspección nocturna normal conserva lectura de accesos y edificios. No se modifican modelos ni sombras de objetos. La explanada queda menos vacía, pero el relieve lejano continúa limitado.

ABBA Intel UHD, baja1280×720, cámara fija y misma población, cobertura C/viento8. 180frames de calentamiento,960 consultas GPU y1.440frames de cadencia. Sin errores de estado/GL ni overflow. Se exige repetibilidad de geometría dentro de cada variante y cámara común; no igualdad de triángulos entre A/B porque el cambio añade cobertura.

| Medida | Control | Islas herbáceas |
|---|---:|---:|
| GPU día | 10,43–11,48 ms | 11,99–13,29 ms |
| GPU noche | 11,58–12,87 ms | 11,86–12,80 ms |
| CPU render día | 3,88–4,02 ms | 3,70–3,89 ms |
| CPU render noche | 3,67–3,94 ms | 3,58–3,89 ms |

Rangos de medias de dos bloques, no intervalos de confianza. Hay sobrecoste GPU diurno (+2,86/+0,50ms al emparejar A1/B1 y A2/B2); noche inconclusa. Cadencia candidata cercana a16,63ms, limitada por refresco; no implica coste cero. Se conserva la mejora artística con su coste explícito, no se descarta solo por rendimiento.

[Benchmark](performance/benchmarks.json), [resumen](performance/summary.json). Reproducir con measure-river-yard-islands.mjs y audit-river-yard-islands.py. Capturas corregidas usando WG_YARD_OUT nuevo. Pendientes movimiento, streaming, varios asentamientos y comprobación de huellas animadas junto a accesos; sin promoción a producción.

## Recorrido de streaming y cambio de origen

36 capturas: dos variantes, día/noche y nueve posiciones por recorrido. Cámaras, objetivos mundiales, orígenes y chunks coinciden A/B. La geometría difiere intencionadamente. Sin errores GL/overflow; cada sesión libera sus tres texturas de tierra una vez al cerrar.

Al volver a la posición inicial (índices0/4/8), la candidata recupera388.756 triángulos y8.627 módulos lejanos; el control372.748 y6.626. Contadores idénticos en ambos regresos, día/noche. MAE de retorno diurno0,00892/255 candidata y0,00800 control; noche candidata0,00000181 y control0. No se atribuye automáticamente el residuo a una causa ni se declara repetibilidad RGB exacta.

Tras descargar y volver, los contadores de candidata se estabilizan en61geometrías/46texturas, mantenidos durante el recorrido nocturno. No es una medición de VRAM ni una prueba prolongada de ausencia de fugas. La vista diurna de regreso inspeccionada mantiene el camino descubierto y la continuidad de hierba en el entorno.

[Capturas y estado](streaming/captures.json), [auditoría](streaming/summary.json), [regreso diurno](streaming/baja-combined-day-4.png). Reproducir con capture-river-yard-streaming.mjs y package-river-yard-streaming.py. La prueba espera a completar las cargas en cada parada; no equivale a un vídeo de movimiento continuo ni a un benchmark de latencia. Siguen pendientes varios poblados, cambios de ocupación y huellas de hojas durante viento fuerte.
