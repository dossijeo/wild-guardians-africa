# Primer plano de una transición real

La primera búsqueda de suelo libre cayó en una zona casi cubierta de musgo; no permitía evaluar la transición. Ese piloto queda local en ../close y no se usa como prueba del borde. El capturador corregido exige además un valor contextual intermedio de cobertura, leyendo las máscaras visuales ya cargadas. No modifica esas máscaras ni las consultas del motor.

[Oblicua diurna](manglares-media-day-2-pair.webp) · [Oblicua nocturna](manglares-media-night-2-pair.webp). Izquierda mezcla lineal, derecha selección por altura calibrada. Se inspeccionaron las candidatas completas de ambas vistas.

## Resultado

La variante separa regiones de musgo y barro, en lugar de superponer sus detalles. Sin embargo, el musgo sigue visualmente pegado al plano: seleccionar materiales por altura no añade espesor, parallax conjunto ni oclusión de borde. Los parches geométricos de barro existentes tienen otra respuesta cromática y siguen distinguiéndose del sustrato; por la noche este último presenta tinte azulado. La distribución es útil como estudio, pero **no demuestra el salto de volumen pedido ni justifica integración**.

No seguir endureciendo el smoothstep para compensar la falta de espesor: eso solo aumentaría el recorte y el riesgo de aliasing. Antes de valorar la variante como mejora global, resolver coherencia de color e iluminación y evaluar su contribución real a distancia de juego. No se descarta la técnica de selección por altura en general por este resultado parcial.

## Evidencia

24 capturas / 12 parejas, media/baja, día150/noche350, tres posiciones cercanas, seed712,1280×720. Verificados cámara, objetivo, hora, draw calls y triángulos iguales por pareja; sin errores registrados. Conversiones individuales WebP sin pérdida verificadas contra PNG. [Registros](captures.json) · [Comparación](comparison.json). Pares reducidos publicados.

La selección de cámara usa muestras de máscara cercanas y ruido medio .5 como aproximación, y comprueba suelo libre y seco. No prueba todos los límites ni todos los tamaños de parche. La inspección visual confirma que la región seleccionada contiene ambas superficies. Solo hay vistas estáticas: ni estabilidad temporal, ni fuga de recursos, ni coste GPU quedan validados. No se ejecutó benchmark nuevo.

## Reproducción

Vite5190:

```powershell
node tools/experiments/capture-mangrove-height-transition-close.mjs
python tools/experiments/package-mangrove-height-transition-close.py
```

La lectura de obstáculos y máscaras se realiza exclusivamente para colocar la cámara de QA. No se añade trabajo al juego ni se modifica simulación, navegación, geometría o main.
