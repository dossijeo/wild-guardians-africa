# Revisión interactiva de cobertura y viento

Panel QA de Sabana sobre el juego real, semilla 712, calidad media por defecto y 1280×720. Abre C con viento 8× y ofrece A original, B ligera, C refinada, fuerza de viento 0–12×, congelación de viento, cámaras cercana/normal/elevada e iluminación día/noche. No incluye las variantes descartadas ni cambia la versión principal.

Con el servidor Vite del worktree en `http://127.0.0.1:5190`:

```powershell
node tools/experiments/review-continuous-grass.mjs
```

El lanzador abre Chrome con un contexto aislado, inicia Sabana y pausa esa escena QA. Un reloj visual independiente anima el viento aunque el mundo esté pausado. El HUD se oculta y la interacción directa con el terreno se desactiva para evitar órdenes accidentales durante la revisión. Los presets conservan cámara y hora de las comparativas anteriores. Cerrar la ventana termina la herramienta. Para perfil bajo, establecer `WG_COVER_QUALITY=baja` antes de ejecutar.

No cambia archivos de `src`, simulación, navegación ni configuración del usuario. El observador del mundo se inyecta únicamente en la respuesta de red dentro del navegador de revisión, igual que las herramientas de captura. La UI está en un Shadow DOM aislado. No se incorpora al paquete normal. No es un control de calidad gráfica del producto ni una activación por defecto.

## Verificación

`node tools/experiments/review-continuous-grass.mjs --headless` prueba el ciclo A/B/C y su visibilidad, fuerza 12×, congelación/reanudación del reloj, cámara normal, noche, ausencia de errores WebGL y retirada del panel. [Resultado](review-check.json), [captura revisada](review-panel.png). Se corrigió un error de codificación de etiquetas detectado en la inspección visual antes de publicar.

El panel no añade geometría ni cambia el shader retenido. Esta prueba es funcional, no un nuevo benchmark: siguen vigentes las [mediciones del viento 8×](../continuous-grass-wind-strong/README.md). El reloj independiente y la interfaz son exclusivos del flujo QA. No permite juzgar avance de simulación, construcción, streaming distante ni interacción jugable; esas evaluaciones corresponden a sus herramientas específicas.
