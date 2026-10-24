# Manglares: barro simplificado con simulacion activa

## Decision

Mantener candidato QA; no promover como mejora demostrada de FPS. El ahorro GPU se mantiene en las cuatro parejas, pero la cadencia total es mixta. No seguir encadenando microajustes del barro para explicar todo el coste de escena. Siguiente entrega prioritaria: integrar el LOD aprobado con gestion correcta de recursos, y luego revisar invalidaciones de sombras/profundidad con la atribucion ya disponible.

## Metodo

Intel UHD/ANGLE,1280x720,media,semilla712,camara normal movil8m. A/B/A/B dia y noche. Cada registro abre una pagina y carga la misma fixture pausada; despues reanuda Game original. Ambas variantes: LOD preiluminado aprobado, frondas cercanas nativas y viento. Dos ventanas separadas por registro:60 frames de calentamiento+60 GPU;60+60 de cadencia sin consultas GPU.480 consultas validas; sin errores GL/pagina, disjoint, perdida o desbordamiento de consultas. Auditor verifica inicio identico (tiempo, trabajadores, elapsed) y secuencia de camara identica entre variantes.

El mundo sigue tiempo real, NO lockstep: trabajadores, animaciones y efectos evolucionan durante intervalos distintos. Los recuentos dibujados no son identicos. No atribuir todo el delta al shader ni usar estas capturas finales como comparacion pixel a pixel. El ensayo pausado anterior controla mejor el efecto aislado.

|Variante|Fase|GPU ms|CPU render ms sin queries|Intervalo ms|p95 ms|Triangulos completos medios (GPU)|
|---|---|---:|---:|---:|---:|---:|
|base|day|27.348|12.585|38.575|49|1247984.65|
|base|night|27.21|13.723|35.9|45.7|1248679.967|
|fast|day|25.215|10.857|33.332|38.4|1242537.617|
|fast|night|26.496|14.098|35.898|43.8|1246619.117|
|base|day|26.062|10.307|32.49|38.4|1243632.017|
|base|night|27.576|13.942|37.687|49.6|1250881.683|
|fast|day|25.445|9.48|33.165|40.5|1243468.983|
|fast|night|26.5|13.505|38.282|45.2|1246995.6|

GPU frente al control precedente: dia -2.133/-0.617ms; noche -0.714/-1.076ms. Cadencia dia -5.243/+0.675ms; noche -0.002/+0.595ms. La primera pareja diurna favorece claramente al candidato, la repeticion no confirma mejora total. No prometer FPS estables ni tomar el delta mayor como ahorro puro del material.

Las diferencias medias de triangulos completos son aproximadamente0.01–0.44% entre parejas. Incluyen pasadas de sombras/profundidad y mundo dinamico; no equivalen a recorte de densidad vegetal. Los shaders no cambian geometria ni seleccion. Los datos crudos conservan near/far, sombra, calls, estado inicial/final y dispositivo por ventana.

Inspeccionada captura diurna fast de primera repeticion: cobertura, suelo y ribera mantienen aspecto general. No certifica todas las vistas o noche; revisar equivalencia controlada antes de integrar. No hay cambio nativo ni modificacion de simulacion. El LOD sigue aplicado por interceptacion QA.

## Reproducir

```sh
node tools/experiments/measure-mangrove-mud-active-20261023.mjs
python tools/experiments/audit-mangrove-mud-active-20261023.py docs/qa/global-visual-lab/mangrove-mud-active-cost-20261023
```

Vite laboratorio en5190. No ejecutar otras cargas GPU durante las pruebas.
