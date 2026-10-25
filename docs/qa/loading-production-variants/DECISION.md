# Decisión de la auditoría de variantes de carga

No activar ninguna de las dos candidatas como optimización de producción.
No se ha conseguido una reducción validada del tiempo de carga sin regresiones.

## Evidencia

Se completaron 18 cargas diagnósticas originales: seis biomas por tres perfiles.
Todos cargaron 25 chunks en baja/media y 49 en alta. No hubo entradas de error
registradas distintas de las advertencias X4000 conocidas.

| Bioma | Enlaces baja | Enlaces media/alta | Enlaces tardíos del mundo |
| --- | ---: | ---: | ---: |
| Sabana | 77 | 83 | 1 |
| Gran Río | 77 | 83 | 1 |
| Manglares | 83 | 90 | 0 |
| Desierto | 63 | 70 | 1 |
| Volcanes | 75 | 81 | 1 |
| Gran Cañón | 61 | 67 | 0 |

Los enlaces incluyen todos los contextos; los tardíos de la última columna
excluyen el avatar del guardián. No representan tiempo GPU ni todos los eventos
posibles durante una partida. La matriz y los informes originales están en
`original-profile-matrix.json` y sus referencias.

## Experimentos

- Especialización del código de suelo: ahorro repetido de carga en Manglares,
  pero peores intervalos de presentación en ambas parejas con streaming activo.
  No se promueve. El experimento queda accesible mediante `productionGroundSource=1`.
- Clave compartida de transparencia: fuentes idénticas verificadas y un programa
  duplicado menos. El ahorro de carga no se repite: la segunda pareja tarda
  2,11 segundos más. No se promueve. Acceso QA: `sharedSmoothProgram=1`.
- Preparación lejana: 23 de 28 fases no crean programas, pero suman solo 29,5 ms
  de intervalos observados. No justifican una nueva caché de preparación.

## Qué se conserva

Las variantes se seleccionan por bioma y opciones; importar código experimental
no equivale a compilarlo. Los materiales de agua, destrucción, sombras, LOD,
transparencia y atlas diurnos/nocturnos examinados sirven a funciones reales.
No se eliminan por estar ocultos en la primera imagen. Las candidatas artísticas,
la apariencia aprobada, el scheduler y las ramas estables permanecen intactos.

## Límites y siguiente dirección

Las cargas diagnósticas no son benchmarks intercalados entre perfiles ni validan
toda una campaña. No se afirma equivalencia nocturna o de todas las transiciones
para las candidatas no adoptadas. Persisten enlaces tardíos originales en cuatro
biomas y el coste de inicialización del guardián. No se han resuelto aquí.

La evidencia no respalda una eliminación masiva de variantes de laboratorio
como solución a los segundos de carga. Si se continúa optimizando la carga,
el foco debe ser el camino crítico medido de preparación, esperas e instalación
de recursos, conservando la comprobación de primeros frames y streaming.
No se debe presentar esta auditoría como una mejora de rendimiento entregada.

## Aislamiento posterior

Las candidatas ya no se activan desde el código de producción mediante URL.
El harness conserva WG_PRODUCTION_GROUND_SOURCE=1 y WG_SHARED_SMOOTH_PROGRAM=1
y aplica parches de fuente exclusivamente en su navegador QA. Los parámetros
de URL conservados en informes son metadatos de reproducción, no opciones del
juego normal. Nueve tests pasan; validación de reproducción real en curso.
Esta separación no se presenta como un ahorro de carga medido.
