# Evitar profundidad aislada redundante al dibujar humo

El helper pooled ahora omite su prepasada cuando el destino es exactamente `destructionPass.smokeDepth`. Mantiene la prepasada del color principal. No se usa una exclusión genérica de cualquier render target, que podría romper renderizados de color fuera de pantalla. `skipSmokeDepth=false` permite el control QA anterior.

Prueba real Sabana baja seed712 día150 view17, dos parciales, uno al35%. BuildingEffects/renderSmoke reales con doce partículas QA y color de los árboles visible. Capturas con/sin humo, con/sin omisión. Ambas parejas son exactas píxel a píxel, cero errores WebGL. Sin humo:2→2 dibujos auxiliares. Con humo:4→2, evitando repetir profundidad de ambos árboles durante captureDepth. Son contadores del helper, no draw calls totales ni milisegundos; no afirmar FPS mejorados.

Se suspendió el bucle normal del juego para que la carga del emisor no terminara el fundido. Un primer intento terminó sin parciales y fue excluido. Emisor temporal sin geometría de edificio visible y sin entidad de simulación; se destruye después del diagnóstico. La nube es deliberadamente amplia y no representa la densidad artística de una batalla. La paridad verifica que esta optimización no cambia la composición existente; no prueba que todos los órdenes de transparencia sean correctos ni certifica otros VFX/noche.

Láminas: izquierda comportamiento redundante, derecha filtrado. En nombres heredados `depth=true` significa omitir la redundancia, no desactivar el fundido; `marker` corresponde a humo. El código del helper mantiene el fundido aislado activo en ambas condiciones.

Reproducir con Vite5190, `node tools/experiments/capture-isolated-smoke-composition.mjs` y `python tools/experiments/audit-isolated-smoke-composition.py`. Sigue QA, main intacta.
