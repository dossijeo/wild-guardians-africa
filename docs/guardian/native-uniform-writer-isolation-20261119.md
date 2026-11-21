# Aislamiento de uniformes frente a un reloj anterior — 2026-11-19

Continuación A4/e-R3/f-R4 del [plan integrado](integrated-gpu-migration-plan-20261104.md), después del [testigo de recursos GPU](native-retained-resource-witness-20261119.md). Solo se añade una prueba; el producto no cambia. El objetivo es comprobar si la igualdad de bytes observada en las ocho copias pausadas basta para eliminar su protección.

## Contraejemplo

1. Un fotograma publicado usa un reloj que escribe 7 en su uniforme.
2. El productor prepara otro uso y escribe también 7. Los bytes del productor y del buffer nativo coinciden exactamente en ese instante.
3. El fotograma anterior sigue activo y su reloj avanza: escribe 8 en el buffer que conserva.
4. Una preparación posterior copia el buffer lógico del productor. Debe conservar su snapshot 7, independientemente del reloj anterior.

Con el consumidor de producción, la nueva versión separa ambos usos y la preparación lee 7. Un loader de control negativo modifica el módulo únicamente en memoria: permite compartir cuando un oráculo de la GPU simulada confirma igualdad exacta de bytes actuales. Esa variante pasa los cinco controles existentes pero falla el nuevo caso: lee 8 en lugar de 7. El código de producción nunca se sustituye en disco y el oráculo no es una propuesta de implementación ni un readback para el producto.

El contrato ejercitado es el cliente/host remoto real, con transporte y cola GPU deterministas. No constituye un ensayo hardware, una medición de cadencia ni una nueva prueba de autoridad C++. Comprueba el resultado observable de una copia posterior; no inspecciona un flag interno de bloqueo para declarar éxito.

## Decisión y referencia

Se inspeccionó [Babylon UniformBuffer](https://github.com/BabylonJS/Babylon.js/blob/048566f71dfce0f62d993fd3a7bcadc844407315/packages/dev/core/src/Materials/uniformBuffer.ts), especialmente update, _buffersEqual, _createBufferOnWrite, _createNewBuffer y _checkNewFrame. El contenido y la vida de las versiones por fotograma son preocupaciones distintas. El consumidor existente también puede seguir escribiendo relojes o cámara sobre una versión publicada mientras el productor prepara otra.

La igualdad instantánea, incluso si fuese conocida perfectamente, es insuficiente para quitar el guarda general de relojes. Antes de compartir una versión deben comprobarse los escritores futuros y la vida del snapshot, o demostrarse una condición más estrecha de reutilización. La prueba no demuestra que cada una de las ocho copias de aquella recuperación concreta sea mínima. Tampoco justifica añadir una caché, un reloj, un pool o un protocolo experimental para evitarlas. Se conserva el aislamiento actual y queda pendiente cualificar cada copia por su dueño/escritor, además de atribuir las nuevas fábricas de la huella.

## Validación y estado

Seis de seis casos pasan con el código de producción. El control negativo con oráculo actual pasa 5 y falla 1 exactamente con 8 frente a 7; exit 1 es esperado y no se presenta como regresión del producto. Una comprobación de sintaxis; 621 inputs congelados, 620 sin cambios, 64 artefactos nativos y 16 archivos ajenos intactos. No se repiten build ni regresión general por una nueva prueba sin cambios en el producto. Los 938 dirigidos, 4441 de 4442 seleccionados y build de 57.081 s se heredan expresamente de 29bb3950a. Los dos ensayos hardware funcionales del testigo anterior se heredan de a11a16ce1 y mantienen sus criterios de recursos sin aceptar.

[Recibo, hashes, logs y control negativo](performance/native-uniform-writer-isolation-validation-20261119.json). A6/A/B/C continúan abiertos; D no iniciado y f-R3 conserva su cierre de seguridad. Main, consumidor/cohort fallido, pérdida de dispositivo, coste de pausa, cadencia y plataformas siguen pendientes. Las tres exclusiones anteriores de host/timeline se conservan sin repetirlas ni declararlas reparadas.
