# Recover Proven Renderer Optimizations for Production

Objetivo autónomo: rescatar exclusivamente culling por instancia e invalidación
por salida efectiva en JavaScript/Three.js, contra main actual, preparando una PR
acotada sin merge. Las decisiones y datos están en [RESULTS.md](RESULTS.md) y la
reproducción en [README.md](README.md).

## Diagnóstico e hipótesis

Referencia `origin/main`: `cd6c9af0d350ff1f79cd9a1dea0da0786eca4e2a`.
Rama aislada `codex/renderer-production-rescue`; checkout original del usuario intacto.
Revisión de `codex/wild-renderer-wasm` (cierre `cd7a0dc9a`): CULLING-CONTROL,
EFFECTIVE-SELECTION, RESIDENT-RESULTS y EVENT-DRIVEN-GOAL. Los resultados de54% de
triángulos y48→11,4 actualizaciones eran evidencia para investigar, no un resultado
frente al main actual. No rescatar WASM, LOD nativo, diferencial, indirección o prepass.

Main prepara grupos desde chunks y mantiene selección independiente para sombras.
H1: filtrar instancias de color con límites conservadores elimina geometría GPU.
H2: comparar salida Float32 efectiva y conservar rangos pendientes evita subidas.
H3: ambas caben en el agrupador actual sin otro motor ni representación espacial.
Las tres se implementaron y evaluaron; conservar bounds originales fue necesario
porque Three los usa para ordenar dibujos incluso con frustumCulled=false.

## Hitos

- [x] M0: revisar experimentos, fijar main actual y aislar trabajo.
- [x] M1: implementar JS, pruebas de selección/rangos/cobertura/sombras/origen/lifecycle.
- [x] M2: herramientas reutilizables con controles A/A y ventanas estrictas.
- [x] M3: seis biomas, cuatro presets, día/noche, cámara/LOD, sombras, streaming y comandos.
- [x] M4: CPU/GPU/cadencia/p95 separados, memoria y llamadas GL, normal/densa;
  conservar resultados negativos y protocolos inválidos identificados.
- [ ] M5: checks finales y PR pequeña para revisión, sin merge.

## Decisiones y criterios de cierre

Todas las calidades conservan ambas mejoras, incluida muy baja. El resultado de
este equipo no se usa para excluir el preset destinado a GPUs débiles.
No aceptar desaparición de geometría/casters ni cambios de simulación. Registrar
residuos RGB también presentes en controles y no afirmar igualdad bit a bit.
Medir bytes API reales, no confundirlos con VRAM. No sumar CPU y GPU ni prometer
FPS universales. Documentar el coste CPU y los bloques adversos en densa/muy baja.

Durante comandos reales se corrigió el guard por identidad de Set de supresiones,
sin escaneo por frame ni cambios en Engine. No añadir otros rediseños.
Cierre: pruebas/build finales, evidencia reproducible conservada y propuesta de PR
con limitaciones explícitas. La siguiente evaluación útil es otro hardware, no más
microoptimizaciones en este equipo. No integrar automáticamente en main.
