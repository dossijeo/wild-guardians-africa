# Revisión interactiva de candidatos retenidos

Lanzador local QA para comparar tres biomas en campaña real, semilla712. No activa cambios en la partida normal y no representa aprobación de rendimiento ni calidad global alcanzada.

```powershell
node tools/experiments/review-global-candidates.mjs --biome=sabana
node tools/experiments/review-global-candidates.mjs --biome=gran-rio
node tools/experiments/review-global-candidates.mjs --biome=gran-canon
```

Requiere Vite del worktree en5190. Sin argumento abre Sabana; una lista separada por comas abre los escenarios sucesivamente al cerrar cada ventana. Cerrar la ventana final termina el proceso. La simulación permanece pausada y el viento usa reloj visual independiente.

- Sabana: cobertura A/B/C, viento inicial8×, controles de fuerza/congelación, tres cámaras y día/noche. Adaptador de ocupación retenido.
- Gran Río: piloto de cobertura con exclusión por triángulos de agua, A/B/C, viento8× y sus cámaras. No carga las candidatas de LOD esférico ni continuidad de normales.
- Gran Cañón: A original/B paleta cálida, normal/oblicua y día/noche; adaptador reversible con streaming. No aplica el ensayo descartado del pie de pared.

[Sabana](sabana-day.webp) · [Gran Río](gran-rio-day.webp) · [Cañón](gran-canon-day.webp).

## Pruebas

`node tools/experiments/review-global-candidates.mjs --headless` recorre los tres biomas. Verifica visibilidad A/B/C, fuerza inicial8 y ajuste12, congelación/reanudación del reloj visual, cámara normal, hora nocturna, error GL, botones del Cañón y retirada del panel/adaptador. Cero errores de página/consola/HTTP registrados. [Registro](checks.json). Se revisaron visualmente los paneles de Río y Cañón.

También pasa `node tools/experiments/review-continuous-grass.mjs --headless`: [compatibilidad del lanzador anterior](legacy-savanna-check.json). La parametrización del panel conserva cámara, título y módulo predeterminados de Sabana.

Capturas de interfaz en media, 1280×720, día/noche. Los pantallazos nocturnos de hierba siguen al ensayo del slider12; no son comparativas de rendimiento ni viento8. Los relojes de viento están en marcha: tampoco son capturas sincronizadas A/B para juzgar diferencias de píxeles. WebP comprobado sin pérdida contra PNG.

## Límites

No nuevo benchmark ni nuevos assets. Los costes y límites de cada candidato siguen en sus informes. El panel permite evaluar el resultado, no subsana los pendientes de rendimiento, otros biomas, sesión prolongada o calidad global. Main intacto y PR sin fusionar.
