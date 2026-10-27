# Arena: contribución de reflexión ambiental

**Diagnóstico causal, no receta para integrar.** 12 capturas /6 parejas reales, media1280×720, seed712, día/noche, tres cámaras cercanas. Ambos usan arena completa; candidata anula solo biomeSpec para terreno de cañón. Cámara, hora, llamadas y triángulos iguales, sin errores.

[Completo / sin reflexión ambiental](media-day-2-pair.webp) · [Noche](media-night-2-pair.webp)

Se inspeccionó la pareja cercana diurna. Retirar biomeSpec elimina las crestas blanquecinas en sombra y deja relieve en la zona iluminada. También calienta/oscurece grava y paredes: **no aplicar esta anulación global**. La comparación identifica una contribución importante de reflexión ambiental, no demuestra que todo contraste residual proceda exclusivamente de ella.

En AfricanToon, biomeSpec multiplica groundReflection por Fresnel(normal,vista), por (1−roughness*.72)*.48. Con roughness=.98, ese último factor aún es .141312; a incidencia rasante Fresnel puede elevarse. Esto explica una ruta concreta para investigar la apariencia reflectante de arena seca sin borrar el mapa normal. La prueba no sustituye el BRDF solar ni modifica sombras, AO o albedo. El siguiente candidato debe limitar el término a depósitos secos y mantener el resto de materiales.

No benchmark: una ablación que elimina contribución visual no es prueba de ahorro equivalente. Rendimiento nocturno de la receta completa sigue pendiente, igual que movimiento y revisión global.

```powershell
node tools/experiments/capture-canyon-sand-reflection.mjs
python tools/experiments/package-canyon-sand-reflection.py
```

Vite5190. PNG fuente locales; dos pares y registros publicados. Main y runtime por defecto intactos.
