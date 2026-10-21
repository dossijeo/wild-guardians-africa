# Gran Río: claros herbáceos entre accesos

Piloto de composición a escala del poblado, inspirado en la referencia original 2-13512.jpg: sustituye la explanada continua por suelo herbáceo en espacios libres. No cambia edificios, modelos, terreno geométrico, navegación ni reglas. Modifica solo alfa de una copia de la máscara de material. La cubierta existente consume esa misma máscara, manteniendo exclusiones de ocupación, agua y pendiente.

El desgaste máximo entre núcleo radial y corredores se descompone visualmente: se reduce el componente radial según parches mundiales amplios, manteniendo un suelo mínimo de desgaste para los accesos derivados de su fórmula existente. No se certifica todavía preservación exacta del ancho visible ni ausencia de toda hoja sobre su borde; requiere validación espacial específica. No aplicar a producción.

La primera prueba no hizo nada: el field nativo no expone settlementSite en config. Se verificó en capturas diagnósticas. La versión funcional lee el pequeño snapshot de terreno que ya usa el horizonte y reconstruye los radios desde hx/hz con la fórmula de makeSettlement. Solo al crear máscaras, sin consultas por frame ni cambios en Engine. Este piloto utiliza el primer poblado; no está listo para múltiples asentamientos ni cambios de población.

Doce capturas baja/1280×720/semilla712, día/noche, cámaras normal/oblicua/inversa. Coinciden cámara, objetivo y hora; sin errores ni overflow. La geometría cambia intencionadamente: vista normal 504.136→509.680 triángulos, cobertura lejana 5.123→5.816 módulos. Vista oblicua 565.583→577.815; inversa 522.918→535.614. No presentar estas parejas como carga GPU equivalente.

Inspección normal diurna: la mancha circular marrón se reduce mucho, los accesos conservan lectura y los espacios libres vuelven a verde, más próximos a la referencia. Parte del suelo aún se lee plano a distancia; no se declara lograda la cubierta final. Conservar candidata para revisión cercana/nocturna, límites de caminos, streaming y benchmark. **Coste CPU/GPU todavía no medido**, sin aprobación de integración.

[Comparativa normal](native-site/day-game-pair.webp), [noche](native-site/night-game-pair.webp), [datos](native-site/captures.json), [geometría](native-site/comparison.json). Reproducir con capture-river-yard-islands.mjs y package-river-yard-islands.py en Vite5190. El helper QA es independiente de la receta integrada y permanece apagado por defecto.
