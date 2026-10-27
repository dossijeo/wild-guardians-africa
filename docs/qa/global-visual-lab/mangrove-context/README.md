# Ruta contextual existente de Manglares: no adoptar directamente

La ruta pureMoss retorna antes de leer uGroundMask y fija cobertura1 y humedad0. El código general ya contiene una rama moss que consulta cobertura, variación, humedad y desgaste. Se prueba esa rama sin reescribirla: pureMoss=false, relief=0, mismos mapas Moss002 y escala. No se combina con escala fina ni borde adaptado.

[Vista elevada diurna](manglares-media-day-1-pair.webp) · [Normal nocturna](manglares-media-night-0-pair.webp). Izquierda musgo puro, derecha ruta contextual. Se inspeccionaron las imágenes completas de la candidata de esas dos vistas. **Descartar como sustitución directa:** brillo húmedo extenso, zonas oscuras homogéneas y ausencia de agrupaciones convincentes de musgo/suelo. No alcanza la dirección artística.

## Diagnóstico del código real

En groundMaterial417, la rama general calcula cobertura a partir de ctx.g/ctx.r y desgaste ctx.a. También modula normales y AO con cobertura, reduce rugosidad y añade humedad según ctx.b y campos de ruido. Fuera del musgo mezcla el color original del terreno oscurecido, no un segundo material de barro texturizado. Por eso activar la rama no equivale a distribuir dos materiales completos; las capturas no prueban por separado la contribución causal de cada término.

relief=0 anula el desplazamiento UV, pero el bucle POM sigue condicionado por uGroundRelief, distancia y pendiente, no por esa amplitud. Puede seguir leyendo altura en la misma coordenada. No afirmar ahorro ni parallax desactivado computacionalmente. La salida visual cambia iluminación, normales, AO y color conjuntamente: es una evaluación de ruta existente, no una ablación individual de la máscara.

## Evidencia y límites

24 capturas / 12 parejas, media/baja, día150/noche350, normal/elevada/inversa, seed712,1280×720. Cámara, objetivo, hora, draw calls y triángulos coinciden en cada pareja; sin errores registrados. 24 conversiones individuales sin pérdida verificadas contra PNG. [Registros](captures.json) · [Comparación](comparison.json). Pares publicados reducidos a1920×540.

No hay nuevas texturas, modelos ni geometría. Sí cambia el trabajo de shader: lectura de máscara, ruido y rama de altura, entre otros. No se hizo benchmark porque la candidata falla el criterio artístico. No hay validación temporal, streaming ni métrica de VRAM en este ensayo.

## Próxima hipótesis

Reutilizar los datos contextuales para distribuir musgo y otro material real, separando el peso de cobertura de la respuesta húmeda. Antes de implementarlo, comprobar la semántica y distribución efectiva de las máscaras en suelo, horizonte y parches, para evitar una superficie lisa de color o límites entre chunks. No aumentar el brillo ni retocar normalBoost para ocultar el problema de distribución. Esta hipótesis aún no está implementada.

## Reproducción

Con Vite5190:

```powershell
node tools/experiments/capture-mangrove-context.mjs
python tools/experiments/package-mangrove-context.py
```

Interceptación QA del JSON, con comprobación del valor original. Renderer predeterminado, geometría autoritativa, simulación y main intactos. Sin assets nuevos.
