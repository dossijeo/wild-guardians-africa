# Inventario de preparacion de profundidad de Manglares

Sobre cd70cc28d, fixture712, camara normal, LOD nativo. Auditor llama la preparacion transaccional existente sin dibujar y verifica que restaure cada material. No altera materiales persistentes ni simulacion. Sin errores de pagina.

Resultado:47 objetos especializados,1041 fallback,33 excluidos. Son objetos recorridos en subarboles visibles, NO draw calls ni coste GPU; pueden quedar fuera del frustum o no dibujarse. No priorizar simplemente por estos conteos.

Los25 suelos residentes usan material especializado;2 objetos adicionales etiquetados biomeGround no. Los24 overlays de barro conservan shader de color. Los helechos cercanos (1181 instancias) y lejanos (700) conservan ShaderMaterial, sin contrato worldDepthCompatible. La sombra auxiliar transparente se excluye correctamente. Otros22 objetos especializados y1045 sin sustitucion (incluye excluidos).

Conclusion: no es correcto afirmar que todo el suelo ejecuta su iluminacion completa en la pasada de profundidad; el terreno residente ya esta especializado. Hay rutas concretas sin especializar: barro y cobertura. Una futura variante necesita material de profundidad cuya deformacion, descarte alpha y silueta coincidan; no basta con activar una etiqueta en el material de sombra lejano, cuya geometria original ya fue sustituida por LOD. Comparar depth readback y coste antes de promover. No se ha optimizado nada en esta auditoria.

Reproducir: node tools/experiments/audit-mangrove-native-depth-20261023.mjs con Vite5190. audit.json conserva objetos y clasificacion; helper qa-depth-material-audit-20261023.js restaura referencias.
