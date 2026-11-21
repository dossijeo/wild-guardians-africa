# Recuperación retenida de una ruta nativa

El auditor de recuperación retenida pasó en NVIDIA Turing con la ruta Idle22 adquirida, tanto en marcha como pausada. Usó el guardado semántico y los Workers de autoridad, Surface y dibujo. Conservó la autoridad, el ticket de mundo, el renderer, la escena, el actor y su geometría. En ambos recorridos el picking devolvió el trabajador, se leyó una imagen útil y la salida confirmó el drenaje mientras seguía viva la autoridad. [Resumen y datos](performance/native-healthy-retained-motion-20261121/summary.json).

Cada pasada conservó 1.355 recursos y 259 bindings ligados a los paquetes inspeccionados. El inventario anterior también incluía 1.736 objetos fuera de los paquetes activo y pendiente. El auditor permite su retirada ordinaria. Se observó una sola orden `snapshot` de autoridad por pasada y cero bifurcaciones de textura.

- **En marcha.** La publicación avanzó de 94 a 104 en la misma Surface. Hubo ocho copias de uniformes ligados al reloj, con cuatro bytes distintos en cada una y ocho bindings dependientes recreados. De las 101 altas del productor, 100 se atribuyeron a atlas, pisadas y captura de profundidad de VFX, y una al contexto de render existente. El recuento identifica sus propietarios y deja abierta la evaluación de su coste. [Inventario y recibos](performance/native-healthy-retained-motion-20261121/moving.json.gz).
- **Pausada.** El productor creó un binding del contexto existente. Hubo ocho copias conservadoras de uniformes cuyo contenido físico coincidía. Los ocho tenían un escritor activo ligado al reloj nativo y pertenecían a un paquete retenido. El coste de evitar esas copias bajo esa condición sigue abierto y se remitió a Astra. [Inventario y recibos](performance/native-healthy-retained-motion-20261121/paused.json.gz).

Entre el aviso de recuperación y la reactivación, el Host presentó las 49 oportunidades en movimiento y las 41 en pausa. Los intervalos máximos respectivos fueron 34,60 y 34,80 ms. Son mediciones del Host en este entorno y C4 conserva su aceptación a 60 FPS por separado. Las dos pasadas reasignan el transporte al dispositivo sano. La pérdida real del dispositivo durante una asignación nativa sigue pendiente.

```powershell
$env:QA_NATIVE_MOVING='true'
node tools/experiments/audit_native_active_retained_recovery.mjs
```

Usar `QA_NATIVE_MOVING='false'` reproduce el control pausado. Ambos casos emplean el mismo examinador de identidades y contadores de propietarios.
