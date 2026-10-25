# Ceniza: campo procedural frente a máscara precalculada

**Conservar como alternativa QA, sin sustituir todavía el campo procedural.** La apariencia general se conserva y se eliminan dos evaluaciones de ruido por fragmento de suelo residente, pero el beneficio GPU no es consistente de día en esta serie.

Izquierda: ceniza procedural; derecha: máscara. Ambas incluyen ceniza, no se compara aquí con el suelo original sin depósitos.

- [Baja, día](volcanes-baja-day-pair.webp)
- [Baja, noche](volcanes-baja-night-pair.webp)
- [Media, día](volcanes-media-day-pair.webp)
- [Media, noche](volcanes-media-night-pair.webp)

## Cambio

El canal R de la máscara de terreno de 35 × 35, que el material volcánico no usa para su cobertura, almacena el campo de ceniza antes de aplicar smoothstep. Se genera al crear el material y se interpola con la lectura de máscara ya existente. G/B/A quedan intactos. Los bytes proporcionados por el worker se clonan; no se modifica su información ni se cambia la distribución de vegetación, navegación o simulación.

La aproximación CPU reproduce el hash con redondeos float32 explícitos, sin prometer identidad con GLSL. Muestreo cada 1,5 m y cuantización a 8 bits: algunos bordes se suavizan. La pendiente se aplica todavía por fragmento. El horizonte sin máscara conserva el ruido procedural original; su transición con residentes necesita verificación específica.

No aumenta el número de texturas, samplers, llamadas ni triángulos. La copia tiene 4.900 bytes por máscara, reemplazando el contenido del DataTexture existente; hay trabajo y asignación CPU durante creación de materiales. [Pruebas](mask-checks.json): continuidad horizontal/vertical de los tres texeles compartidos, coordenadas negativas, reconstrucción determinista, entrada prestada y otros canales intactos, rechazo de tamaño inválido. Microprueba Node: 0,535 ms por máscara en 100 creaciones; no mide latencia de streaming del navegador.

## Comparación visual

24 capturas, 12 parejas, semilla 712, 1280 × 720, calidad baja/media, tres cámaras, día 150 y noche 350. Cámara, hora, llamadas y triángulos coinciden en todas las parejas; sin errores registrados. Diferencia RGB media de imagen completa entre 0,030 y 0,125 niveles sobre 255; no es una garantía perceptual. Se revisaron la candidata diurna baja y el par nocturno medio: las regiones amplias permanecen reconocibles. No se comprobó todavía esta variante con cámara en movimiento o streaming; la validación anterior corresponde a la versión procedural.

[Trazas](captures.json) · [Diferencias](comparison.json)

## Coste

Intel UHD 0x9A60, ANGLE D3D11, baja, cámara normal fija, simulación pausada. A/B/B/A con páginas nuevas, día y noche; 30 frames de calentamiento, 120 muestras GPU y 180 frames de cadencia por bloque. 960 muestras GPU y 1.440 frames de cadencia válidos, sin disjoints, consultas pendientes ni diferencias de geometría. Misma auditoría del piloto anterior.

Rangos de medias de dos bloques por variante, ms:

| Medida | Procedural | Máscara |
|---|---:|---:|
| GPU día | 9,56–9,65 | 8,93–10,67 |
| GPU noche | 10,46–11,42 | 9,38–9,65 |
| CPU render día | 3,90–4,27 | 3,66–3,78 |
| CPU render noche | 3,68–3,93 | 3,68–3,73 |

Cadencia media próxima a 16,63 ms en ambos casos. La reducción nocturna es una señal favorable; la variabilidad diurna impide afirmar una mejora general. CPU render no incluye preparar las máscaras durante streaming. No comparar estos números directamente con otros días o series para calcular una mejora acumulada.

168 geometrías en todos los bloques. El primer A conserva 58 texturas; los demás, incluido el segundo A, tienen 51. No atribuir esa diferencia a la máscara ni afirmar igualdad de VRAM: son contadores de recursos, no memoria del controlador.

[Benchmark](performance/benchmarks.json) · [Resumen](performance/summary.json)

## Siguiente decisión

Probar la transición residente/horizonte y medir creación de chunks antes de promover. Mantener ambos candidatos permite valorar si el ahorro nocturno compensa la preparación CPU sin perder la separación de materiales. Main y los valores por defecto siguen intactos.

## Reproducción

```powershell
node tools/experiments/check-volcanic-ash-mask.mjs
node tools/experiments/capture-volcanic-ash-mask.mjs
python tools/experiments/package-volcanic-ash-mask.py
node tools/experiments/measure-volcanic-ash-mask.mjs
python tools/experiments/audit-combined-campaign-budget.py --directory docs/qa/global-visual-lab/volcanic-ash-mask/performance --biomes volcanes
```

Vite en 5190. Capturas y benchmark separados. Se publican trazas y comparativas seleccionadas; PNG fuente y WebP individuales permanecen locales.
