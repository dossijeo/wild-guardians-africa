# Recover Proven Renderer Optimizations for Production

Objetivo autónomo activo: culling por instancia y salida efectiva en JavaScript/Three.js.

## Contrato y referencia

Comparar contra `origin/main` actualizado el 21 de octubre de 2026:
`cd6c9af0d350ff1f79cd9a1dea0da0786eca4e2a`. Trabajo aislado en
`codex/renderer-production-rescue`. No modificar el checkout de trabajo del usuario,
ni integrar el renderer WASM, LOD nativo, culling diferencial o cambios de simulación.
Una PR pequeña contra main depende de resultados positivos y corrección; no mergear.

## Diagnóstico y evidencia heredada

Investigación de referencia: rama `codex/wild-renderer-wasm`, cierre `cd7a0dc9a`.
Sus documentos `CULLING-CONTROL.md`, `EFFECTIVE-SELECTION.md`, `RESIDENT-RESULTS.md`
y `EVENT-DRIVEN-GOAL.md` conservan los resultados, incluidos los desfavorables.
En aquellas escenas el culling individual redujo triángulos aproximadamente 54%;
la selección efectiva redujo actualizaciones de grupos de 48 a 11,4/frame.
Son hipótesis para esta recuperación, no resultados frente al main actual.
El residente reduce CPU en ciertos casos, pero requiere otro motor y no demuestra
una mejora universal GPU/cadencia. No extraerlo. Diferencial y orden de sombras
no compensaron su complejidad. Indirección GPU y prepass tampoco justifican rescate.

Main conserva LOD JS y un agrupador global con invalidación por stamp de entradas.
El color acepta chunks completos; sombras tienen selección independiente por luz.
La cámara puede cambiar la selección sin cambiar matrices o cobertura emitidas.
Se puede filtrar color y comparar Float32 finales dentro del agrupador existente.
Los límites del grupo influyen en orden de dibujo incluso con frustumCulled=false;
preservar los límites de la población original evita cambiar esa dependencia.

## Hipótesis

H1: culling conservador por esfera de instancia en color reduce trabajo GPU real
sin modificar el contenido lógico, LOD, clipping ni casters de sombras.
H2: invalidación por valores finales, separada para matrices/cobertura/count,
evita subidas cuando el resultado no cambia. Rangos pendientes sobreviven hasta
la subida real; contar payload de llamadas GL además de versiones.
H3: ambas técnicas caben en NativeAssetGroups, sin estado espacial ni motor nuevo.

## Hitos verificables

- [x] M0: fijar main, revisar decisiones anteriores y aislar trabajo.
- [x] M1: prototipo JS y pruebas de selección, cobertura, sombras, origen y lifecycle.
- [x] M2: auditor reutilizable con main fijado, controles A/A y comparaciones alternadas.
- [x] M3: equivalencia de seis biomas × cuatro calidades × día/noche; cámara estática,
  traslación, rotación/cortes, LOD, sombras, streaming y comandos reales del mundo.
- [ ] M4: CPU total y preparación, GPU, cadencia/p95, memoria y transferencias reales;
  escena normal y densa. Separar diagnósticos instrumentados de mediciones de tiempo.
- [ ] M5: decidir rentabilidad; conservar resultados adversos, checks finales y PR
  pequeña solo si está justificada, o cierre negativo sin cambios de producción.

## Criterios de decisión

No aceptar pérdida de geometría/sombras, fugas, alteración de reglas o diferencias
visuales sin explicación verificable. CPU/GPU/cadencia se miden por separado, sin
sumarlos; percentiles y bloques adversos permanecen. Identificar memoria medida
(atributos, heap JS, objetos GL), sin confundirla con proceso o VRAM. Congelar escena,
cámara y residencia para rendimiento; streaming se valida aparte. Rechazar si el
coste CPU/memoria o una regresión de cadencia anula el ahorro GPU en escenas reales.
No extrapolar un porcentaje antiguo ni forzar integración para justificar el experimento.

## Experimentos y próximo trabajo

21/10: inspección confirma que main aún carece de culling por instancia en grupos.
Siguiente trabajo de mayor impacto: implementar H1/H2 juntos en JS y validar
contratos antes de medir. Reutilizar auditoría GL, GPU timer y comparación de
capturas, sin cargar módulos experimentales ni sus cambios de materiales de QA.


## M1 — Prototipo directo (21/10)

Cambio limitado a `asset-groups.js`: esfera conservadora de color (margen heredado
2,5 m), Float32 efectivo, rangos separados y bounds de ordenación originales.
No hay imports WASM, registros nuevos de Engine ni cambios de LOD. Catorce pruebas
del agrupador, incluidas cinco nuevas, pasan; cincuenta dirigidas de LOD, sombras,
obstrucción, origen y temporizador pasan. La prueba de origen detectó un fixture
que desplazaba el chunk sin sus posiciones lógicas; corregido el fixture.
Sabana/media, tres cámaras, día/noche: seis comparaciones B/A y seis A/A exactas,
con casters y residencia idénticos. Datos locales: `test-results/renderer-rescue-smoke`.
La comparación ABBA completa frente a main está en curso. No hay decisión de integración.


## Validacion en curso y resultados adversos

Build aprobado. Suite completa: 4.580 aprobados, 62 omitidos, cero fallos (548 s).
Muy baja completo cinco biomas exactamente. Desierto fallo por residencia/casters
entre variantes: el auditor esperaba chunks antes de adoptar el horizonte terminado.
Conservar la serie abortada renderer-rescue-six-biomes. La repeticion corregida
renderer-rescue-desert-low pasa las seis vistas exactas. El resto usa ese protocolo.

Primera ABBA, main actual, Sabana/media, materiales reales de produccion:
1.206.665 a 657.200 triangulos medios, 8,33 a 7,22 actualizaciones de grupos/frame.
Tres bloques GPU favorecen al candidato y uno empeora; CPU/cadencia son mixtas.
CPU diurna candidato 7,03/9,70 ms, main 6,88/7,78; GPU diurna candidato 13,08/13,32,
main 16,38/23,54. Noche candidato CPU 6,81/7,98 frente 7,94/6,36; GPU 14,19/19,70
frente 17,77/17,57. Segundo bloque candidato empeora cadencia/p95. Insuficiente
para promoverlo. Conservar datos y repetir despues de validacion funcional.
No eliminar muestras ni atribuir variacion a temperatura, frecuencias o actividad
externa sin aislamiento. Proximo: matriz, streaming/comandos, transferencias reales
 y despues repeticion de tiempo normal y denso.


## Protocolo corregido y sincronizacion explicita

La primera serie de tiempos es INVALIDA: el wrapper seguia capturando mientras
esperaba resultados GPU, creando ventanas de longitudes distintas. Se conserva;
no usar sus medias para decidir. Las series corrected-abba/corrected-dense paran
el wrapper en el ultimo frame y exigen exactamente N frames/consultas; delta fijo.
Normal favorece GPU/cadencia con mas CPU de agrupacion. Densa conserva una muestra
GPU muy desfavorable (76,26 frente a ~55 ms) y una regresion nocturna de cadencia.
Los resultados finales y sus limites se detallaran al cerrar.

48 condiciones congeladas (seis biomas, cuatro calidades, dia/noche, camara rotada)
pasan datos Float32 conservados, bounds originales, casters y residencia exactos.
No son todas bit a bit iguales: hay residuos tambien A/A, hasta 32 pixeles; conservar.
Las series anteriores cubren adicionalmente traslacion/cortes y siguen disponibles.

Tres plantaciones y una muralla reales descubrieron un fallo heredado de main:
syncResidentProps omitía la comprobacion si Engine conservaba la identidad del Set.
Se mueve ese guard a syncChunks, manteniendo barato el polling por frame. Las
llamadas explicitas existentes de la aplicacion comprueban el contenido confirmado.
Dos regresiones y 73 pruebas dirigidas pasan. El auditor sirve asimismo los metodos
originales de WorldScene desde main: ambos lados conservan su comportamiento real.
El candidato elimina los props suprimidos; main conserva uno en cada alta.
No cambiar Engine, eventos, LOD ni reglas para resolverlo.
