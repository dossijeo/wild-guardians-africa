# Relieve residual de Desierto en calidad baja

Control15% frente a candidata45% de normales residuales en desgaste máximo. Semilla712,baja,1280x720,tres cámaras,día150/noche350.12 capturas,seis parejas con cámara/objetivo/hora/draws/triángulos iguales y sin errores. [Día normal](day-0-pair.webp), [noche normal](night-0-pair.webp), [elevada](day-1-pair.webp).

La vista diurna normal revisada mantiene ondulaciones en los claros y distinción con arena intacta. No modifica mapas de ocupación, color ni modelos. En este perfil la escena no presenta las sombras solares de media; comparar siempre dentro del mismo perfil. No extrapolar a muy_baja, que selecciona material de suelo distinto.

Conservar candidata visual. Esta prueba no mide tiempos GPU/CPU de baja: el [benchmark disponible](../desert-wear-relief-20261021/performance/README.md) es de media. No afirmar FPS ni equivalencia visual entre perfiles. Pendientes movimiento/estabilidad temporal e integración opcional; main intacta.

```text
node tools/experiments/capture-desert-wear-low-20261021.mjs
python tools/experiments/package-desert-wear-low-20261021.py
```

Vite5190. PNG locales; parejas y metadatos publicados.
