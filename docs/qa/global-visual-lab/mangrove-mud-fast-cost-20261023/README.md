# Manglares: evitar sombreado descartado bajo barro

## Decision

Conservar como candidato QA; no promover todavia al renderizador nativo. Ahorro GPU en las cuatro parejas, pero magnitud variable y cadencia diurna mixta. Pendientes equivalencia de residuos, camaras adicionales, perfil bajo y simulacion activa. No reducir vegetacion ni atribuir todo el coste de Manglares a los helechos.

## Hipotesis e implementacion

El interior opaco de mangrove-mud-patches calcula suelo completo y luego sustituye su salida por barro. La variante evita el trabajo descartado solo cuando vQAMudEdge supera .85 mas dos anchos de derivada. Mantiene la ruta original en el borde, toma gradientes UV antes de bifurcar y conserva iluminacion, normales, sombra solar y etapas finales de salida. No cambia geometria, instancias ni sombra proyectada. Implementacion solo mediante interceptacion QA de fuente; sin cambios en src.

## Metodo

Intel UHD/ANGLE, 1280x720, media, semilla712, fixture poblada pausada, camara normal con movimiento8m. Ambas variantes incluyen el LOD aprobado por tamano proyectado y viento .25. A/B/A/B dia y noche;60 frames de calentamiento,90 GPU y90 cadencia independiente por registro.720 consultas GPU validas, cero errores/disjoint/overflow. Auditoria verifica estado, camaras y secuencias de instancias identicas. Todas las variantes:123.278 calls y867749.444 triangulos medios de fotograma completo;286 geometrías y136 texturas. Son conteos de recursos, no memoria VRAM medida.

|Variante|Fase|GPU ms|CPU render ms|Intervalo ms|p95 ms|
|---|---|---:|---:|---:|---:|
|base|day|23.517|9.357|30.149|36.2|
|base|night|24.025|9.347|31.961|39.8|
|fast|day|22.72|8.87|29.222|35.7|
|fast|night|22.732|8.783|30.228|38.1|
|base|day|22.648|9.163|29.071|35.7|
|base|night|22.335|8.742|31.634|40.5|
|fast|day|22.466|8.25|29.708|38.2|
|fast|night|21.893|8.338|28.171|36.8|

GPU frente al control precedente: dia -0.797/-0.182ms; noche -1.293/-0.442ms. Intervalo dia -0.927/+0.637ms, noche -1.733/-3.463ms. Hay deriva de controles; no convertir estos resultados en promesa de FPS de partida activa ni atribuir las variaciones CPU a este cambio de shader.

## Imagenes

Inspeccionadas a resolucion completa las primeras parejas diurna y nocturna: se conserva el aspecto general, masa vegetal, sombras y bordes de barro. No son identicas:4359/4915 pixeles diferentes de dia y1639/3924 de noche; error absoluto medio0.00075–0.01265 por canal sobre255, maximo17. Causa de todos los residuos aun no atribuida; estos numeros no certifican equivalencia visual. Capturas completas y image-comparison.json incluidas.

La primera ejecucion fallo al compilar por concatenar un cierre de bloque y una directiva include sin salto de linea. Se corrigio en el generador QA; solo se publican las ocho mediciones completas posteriores.

## Reproduccion

Con Vite del laboratorio en5190:

```sh
node tools/experiments/measure-mangrove-mud-fast-20261023.mjs
python tools/experiments/audit-mangrove-mud-fast-20261023.py docs/qa/global-visual-lab/mangrove-mud-fast-cost-20261023
```

## Relacion con la atribucion

La atribucion activa previa mide suelo7.8–8.2ms, overlay1.3–1.4ms y sombras completas~3.5ms. Este ensayo aborda trabajo redundante del overlay, no los8ms completos del suelo. Overdraw aun no medido directamente. El LOD aprobado esta en ambos ensayos, pero su integracion nativa y validacion del ciclo de recursos siguen pendientes. Mantener la prioridad: costes de escena y recalculos evitables, sin adelgazar el arte aprobado.

## Auditoria de residuos entre repeticiones

Comparar tambien A1/A2 y B1/B2 revela variacion incluso sin cambiar shader:4703/4765 pixeles diurnos y3103/4333 nocturnos. Solo14 pixeles diurnos (maximo1/255) y19 nocturnos (maximo5/255) permanecen diferentes A/B y estables dentro de cada variante en ambas repeticiones. Esto impide atribuir el total de diferencias al candidato. No prueba equivalencia fuera de estas vistas ni descarta residuos coincidentes con zonas variables.

Mapas residual-day/night.png: azul indica variacion entre repeticiones; magenta diferencia estable entre variantes; naranja diferencia A1/B1 restante. Inspeccion del mapa nocturno: la variacion azul se concentra en arboles del fondo; pequenos residuos magenta sobre barro y otros puntos. La causa temporal exacta no esta demostrada. Antes de promocionar conviene fijar los relojes de esa vegetacion en una comparacion visual dedicada, sin modificar el benchmark de rendimiento original. El auditor reproduce estos mapas.
