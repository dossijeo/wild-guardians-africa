# Coste estático de cubierta de Manglares en Intel UHD

Intel UHD ANGLE/D3D11,1280×720,baja,semilla712,target fijo(52,28),cámara normal. Misma página ybuffers residentes. A:cubierta desactivada;B:candidata de ocho hojas con orientación/altura variadas. ABBA por fase,60frames de calentamiento antes de60muestrasGPU yotros60antes de90frames sin consultasGPU paraCPU/cadencia. Total480muestrasGPU y720frames de cadencia. Simulación pausada,misma escena ytiempo visual de viento por bloque. La diferencia visual es intencional:se mide coste de añadir cubierta,no optimización equivalente.

| Fase | GPU A1/A2 ms | GPU B1/B2 ms | Diferencia de medias B−A |
|---|---|---|---|
| Día |13.087 /12.571|13.594 /12.854|+0.395ms|
| Noche |13.391 /14.055|14.123 /15.644|+1.161ms|

CPU de render sin consultas: día A3.167/3.219ms,B3.203/3.150; noche A3.120/3.030,B3.357/3.270. Intervalo medio entre callbacks≈16.53–16.63ms,p95≈17.06–17.36ms. Cadencia compatible con limitación de presentación;no prueba de ganancias FPS ni sumar tiemposCPU/GPU de muestras distintas. RenderCPU no incluye toda simulación/preparación externa.

A63draw calls/572183triángulos;B65/631687:exactamente+2/+59504. 174geometrías y59texturas en todos los bloques. Buffers retenidos en A intencionadamente:memoria GPU real ycoste de creación no medidos. No overdraw medido.

Auditoría:estado estable,resolución esperada,sin erroresWebGL,disjoint,consultas pendientes/perdidas ocontext loss. Cuatro muestrasCIM previas no detectaron motoresGPU>2%;consultar postflight.json para muestras posteriores. Esto no es monitorización continua durante ejecución ni elimina variabilidad térmica. Persisten variacionesentre bloques,sobre todo B2noche;dos repeticiones no establecen confianza estadística ni causalidad exacta del delta.

Recomendación:coste preliminar compatible con conservar candidata visual ycontinuar validación,no razón para descartarla. NO aprobar todavía rendimiento global:solo región/cámara estática,baja,cachés calientes. Falta cámara móvil,streaming,escena más densa,perfil media ycoste de preparación. Las imágenes correspondientes están en ../mangrove-leaf-varied-20261021/game;estas mediciones no las sustituyen.

Reproducir Vite5190:node tools/experiments/measure-mangrove-leaf-cost-20261021.mjs;python tools/experiments/audit-mangrove-leaf-cost-20261021.py. Muestreo externo:sample-gpu-contention-20261021.ps1 con OutputPath nuevo. No se interrumpen otros procesos. Sin cambios en main.
