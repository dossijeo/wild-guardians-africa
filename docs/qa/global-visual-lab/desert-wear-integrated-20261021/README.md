# Desierto: relieve residual integrado como opción

Activar `visualLab=global-lighting&sandRelief=1&sandWear=residual`. Sin sandWear se conserva la receta original. Solo materiales de arena del laboratorio;45% de normales residuales en desgaste máximo frente a15%. Sin nuevas texturas, geometría, pasadas ni cambios de máscaras/modelos/simulación. Programa diferenciado en caché.

12 capturas QA/integrada,media,semilla712,1280x720,tres cámaras,día150/noche350. Cámaras/objetivo/hora/draws/triángulos iguales,sin errores. Dos parejas nocturnas exactas; las restantes difieren en1,1,2 y1 píxeles respectivamente, siempre un nivel de un canal RGB8. La aserción inicial de igualdad exacta falló y se conserva esta limitación; no se atribuye su causa sin prueba. Resultado visual equivalente a escala práctica, no paridad exacta.

[Día normal](day-0-pair.webp) · [Noche normal](night-0-pair.webp). QA izquierda, integrada derecha.4 tests existentes de arena/iluminación y build pasan (avisos habituales de importación mixta y tamaño de chunks). Esos tests no cubren exhaustivamente la opción nueva; la comparación real valida esta escena.

[Coste QA](../desert-wear-relief-20261021/performance/README.md) y [compatibilidad baja QA](../desert-wear-low-20261021/README.md) conservados. Falta movimiento, streaming y comprobación baja de integración; no prometer FPS global. Recomendación: mantener opción para probarla dentro del laboratorio, no activar por defecto ni fusionar main.

```text
node tools/experiments/capture-desert-wear-integrated-20261021.mjs
python tools/experiments/package-desert-wear-integrated-20261021.py
```

Vite5190. PNG locales,parejas/metadatos publicados. El empaquetador informa paridad exacta falsa sin ocultar diferencias.
