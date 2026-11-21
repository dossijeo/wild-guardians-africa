# Control del REST/WATCH exterior desde 20 — 2026-11-18

Continúa `df21be9d2`, A6-04.f-R3/e-R3. El control existente ya cubre el nuevo origen 20 exterior: se comprueba antes de cambiar producción y se conserva. Esta entrega incorpora pruebas de esa compatibilidad; el siguiente punto es roster/actor/Surface/GPU.

## Investigación aplicada

Se leyó el código real de Jolt v5.3.0: [BodyManager::TryGetBody](https://github.com/jrouwe/JoltPhysics/blob/v5.3.0/Jolt/Physics/Body/BodyManager.h#L132-L157) contrasta índice, puntero válido e identidad; [BodyLockBase::Succeeded/GetBody](https://github.com/jrouwe/JoltPhysics/blob/v5.3.0/Jolt/Physics/Body/BodyLock.h#L14-L67) distingue adquisición válida y acceso. Fuentes descargadas y hashes están en el recibo. Esa disciplina ya está resuelta por el control serial local con attestaciones instaladas, secuencias, época/sesión y reloj nativos exactos. Se reutiliza sin añadir mecanismo, dependencia ni propietario.

## Contrato comprobado

- La suscripción comienza antes de adquirir 20. Su metadata no permite preparar 21 hasta instalar realmente ese padre. Para 22 hace falta el 21 exacto instalado y su intención nativa de aproximación, conservando remaining/RNG.
- Preparación, adquisición emitida, reloj vigente e instalación siguen separados. Un 21 adquirido no se hace current hasta que llega el evento ordenado, el watermark causal y su instalación. Los lotes duplicados fallan antes de escribir registros; una reinstalación no sustituye el registro vigente.
- REST/WATCH parciales conservan el mismo origen 20 y solo continúan desde el 21 anterior exacto. Retiming conserva el ticket/referencia preparados y adquiere en la frontera real.
- Home invalida la candidatura pendiente; Home y una Task real cortan `executionEnd` del 21 instalado. El cuerpo queda quieto mientras se preparan recursos del siguiente propietario; no se extiende su presupuesto.

## Validación y límites

**31 pruebas nuevas** incluyen 16 cadenas REST/WATCH × cuatro perfiles × normal/pthread. Pasan **144 pruebas dirigidas en 7 archivos**, sin omisiones ni fallos. La primera selección de 23 dio 21 pases y 2 fallos por una expectativa incorrecta: el lease inicial 20 no se declara preparado entre adquisición e instalación. Se corrigió esa expectativa manteniendo la instalación obligatoria; la selección ampliada de 29 pasó y la final incorpora también Task. Los logs y el snapshot inicial se conservan.

**476 inputs probados/64 nativos sin cambios/16 ajenos exactos**. Los 474 inputs del checkpoint anterior permanecen idénticos. Su regresión de 3.392/3.393 (una omisión opcional/siete exclusiones históricas), sus 847 dirigidas y build de 46,32 s quedan referenciados como validación heredada, **no ejecutada de nuevo**: solo cambian pruebas/helper/documentación. No hay build nativo, Vite ni GPU nuevo en esta entrega de compatibilidad.

Dos recibos conservan 20→21→22 ordenados y otros dos conservan el corte de Task. Son componentes con instalaciones de confianza. No acreditan preparación de recursos, dibujo, Surface ni productor ordinario para el nuevo origen. La cobertura anterior de puertos/Host con GPU simulada permanece en la selección de control.

[Evidencia, fuentes, hashes, selecciones y recibos](performance/native-initial-idle-outside-control-validation-20261118.json).

Siguiente: roster/actor y Surface/GPU del origen 20 exterior. Siguen abiertos productor/cohort/paradas/relevos ordinarios, cierre del Host fallido, recuperación incremental de 3.123 recursos y cadencia/plataforma. A6/A/B/C abiertos; D no iniciado.
