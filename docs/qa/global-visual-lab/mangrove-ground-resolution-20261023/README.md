# Manglares: dependencia de la resolucion

Diagnostico del material original, no propuesta de reducir calidad. Intel UHD / ANGLE D3D11, calidad media, fixture 712 pausada, dia/noche, camara normal con recorrido sinusoidal de 8 m. Secuencia 720/540/720/540. Ventanas separadas de GPU completa, GPU por pasada y cadencia: 60 muestras tras 60 de calentamiento.

1280x720 frente a 960x540: 43.75% menos pixeles. La ruta QA fija el criterio de LOD de los helechos a 720 pixeles de altura para conservar la geometria; no cambia materiales ni sombras. Auditoria de consultas GPU valida, estado y camaras iguales. Las llamadas y triangulos del suelo coinciden exactamente por muestra: medias 12.55 llamadas y 54322.4 triangulos.

|Resolucion|Fase|Suelo color ms|GPU completa ms|Intervalo ms|p95 ms|
|---|---|---:|---:|---:|---:|
|720|day|8.164|22.211|28.447|36.4|
|720|night|7.934|23.434|29.887|35.9|
|540|day|5.416|16.445|23.042|30.7|
|540|night|5.56|17.372|23.5|28|
|720|day|8.393|22.154|28.543|35.3|
|720|night|7.904|23.42|28.467|34.1|
|540|day|5.36|20.713|21.43|26.9|
|540|night|5.514|18.21|23.29|29|

El suelo baja de 7.904–8.393 ms a 5.360–5.560 ms: dependencia importante de pantalla/fragmentos, pero no proporcional a los pixeles. No permite distinguir ALU de ancho de banda o filtrado ni ajustar una supuesta constante exacta de coste. La segunda medida de GPU completa a 540 de dia deriva a 20.713 ms; la cadencia y las consultas por pasada se miden en ventanas distintas.

Limite de equivalencia: en la ventana GPU completa de la primera noche a 540, dos fotogramas difieren en carga ajena al suelo: frame 4 (-3 llamadas, -1059 triangulos) y frame 36 (+460 triangulos). No ocurre en la ventana por pasadas, donde se comprueba el suelo muestra a muestra. non-ground-drift.json conserva las diferencias; no se atribuyen a un subsistema sin evidencia ni se presenta la comparativa completa como identica al triangulo.

Reproducir:
```sh
node tools/experiments/measure-mangrove-ground-resolution-20261023.mjs
python tools/experiments/audit-mangrove-ground-resolution-20261023.py docs/qa/global-visual-lab/mangrove-ground-resolution-20261023
```

No cambios en el renderer nativo. PR159 permanece en borrador.
