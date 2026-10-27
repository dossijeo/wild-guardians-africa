# Relieve residual integrado: baja y reconstrucción de chunks

Original frente a sandWear=residual integrado,global-lighting y sandRelief=1. Calidad baja,semilla712,1280x720,día150/noche350. Ruta0→z96→z192→0 repetida dos veces por fase.32 capturas,16 parejas verificadas: cámara/objetivo/hora/chunks/draws/triángulos coinciden, sin errores.

[Último regreso nocturno](night-7-pair.webp), control izquierda y opción derecha. Vista revisada: conserva ondulaciones suaves en claros después de reconstruir chunks. Esta prueba complementa la compatibilidad baja del prototipo con evidencia de la opción integrada.

Regresos3 y7 en ambas fases:25 chunks,62 geometrías; texturas51 en control y49 en candidata, sin crecimiento dentro de cada variante. Diferencia de residencia no es ahorro VRAM atribuible al ajuste, que no modifica texturas. No se mide memoria física ni se garantiza ausencia de fugas a largo plazo.

Se espera carga antes de capturar. Los tiempos loadRenderAuditMs incluyen espera,render y auditoría; no equivalen a FPS ni a movimiento continuo. Baja no usa las sombras solares de media: no se exige incremento de draws de sombras. Benchmark disponible sigue siendo [QA media](../desert-wear-relief-20261021/performance/README.md), no rendimiento demostrado de baja.

Conservar opción experimental. Pendientes movimiento continuo y estabilidad temporal del detalle; no declarar objetivo global completo. Main intacta.

```text
node tools/experiments/trace-desert-wear-streaming-20261021.mjs
python tools/experiments/audit-desert-wear-streaming-20261021.py
```

Vite5190. PNG locales;10 parejas representativas y todos los metadatos publicados.
