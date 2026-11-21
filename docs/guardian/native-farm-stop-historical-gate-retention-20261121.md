# Stop24 después de cruzar un portón

Farm conserva en su paquete los portones por los que pasó el trabajador. Cuando el cultivo madura, la autoridad puede detener el cuerpo después del cruce. En ese caso el diario de Stop24 puede venir vacío para los motores aunque el portón siga abierto y visible. Antes de este cambio, el roster exigía una pose nueva para cada portón de la ruta anterior y rechazaba la parada. [Captura original del tráfico y del diario](performance/native-ordinary-farm-gate-traffic-20261121.json).

DetourCrowd limpia el objetivo y su petición de ruta dentro de los datos del agente. OpenRA mantiene la posición, la ocupación y el cierre automático en el propio portón. Wild Guardians aplica esta separación a los propietarios que ya existían. El diario nativo determina qué motor necesita cambios y la transacción del cuerpo puede conservar un motor independiente ya publicado. [DetourCrowd v1.6.0, `resetMoveTarget`](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L609-L625) · [OpenRA, `Gate.Tick`](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Mods.Common/Traits/Buildings/Gate.cs#L61-L97).

La retención exige un Stop24 con diario de motores vacío, un portón residente con la misma forma y un reloj de mundo comprometido en la misma época y sesión. La comprobación compara las posiciones y los indicadores de la hoja con el paquete privado del dueño sin copiar los arrays. Las fases posteriores vuelven a comprobar las identidades capturadas y el recibo nativo antes de cerrar la transacción. El portón conserva su geometría, material y reloj durante la parada.

## Validación

En NVIDIA Turing, dos trabajadores y el portón de zarzas se dibujaron con Game en pausa. Se reanudó Game después de adquirir Farm con el cuerpo 1. La maduración del mijo pidió Stop24 a los 14,90 s. El ensayo retuvo el aviso de preparación 624,3 ms y registró 19 dibujos sin publicar la parada. Tras soltarlo, la autoridad revalidó la pose a los 16,15 s y NVIDIA dibujó el ticket definitivo 4. El cuerpo quedó en z=5,807, después del vano en z=8,2. El diario de motores del ticket definitivo contenía cero filas.

Se conservaron las dos raíces, sus 32 geometrías por trabajador y las siete referencias de buffer del portón. Las 894 relaciones de malla y atributo presentes en la primera muestra seguían asociadas a los mismos 798 buffers únicos. El motor seguía abierto con el mismo reloj, malla y versiones antes y después de la parada. El consumidor confirmó el drenaje con cero errores WebGPU. [Recibo físico y recursos](performance/native-farm-stop-historical-gate-retention-20261121.json).

El primer dibujo de Stop24 llegó 66,6 ms después del dibujo anterior a 30 Hz. La oportunidad intermedia ocurrió en su cadencia habitual y quedó registrada como `stale-binding`. Queda identificar qué registro perdió vigencia y asegurar su relevo. Los otros intervalos de la ventana de 240 dibujos fueron de hasta 35,8 ms. [Oportunidades e intervalos](performance/native-farm-stop-historical-gate-retention-20261121.json).

Pasaron 944 pruebas en 72 archivos y el build de producción con `webgpu-worker` y dibujo remoto. Los siete controles nuevos comprueban el rechazo de un diario con efecto, un reloj de actor, un dueño obsoleto, una forma incompatible y un recibo ausente. También verifican la cancelación y la transacción por el coordinador de chunks.

Se mantienen pendientes los diarios que cambian motores, Settlement17 y Home19 con portón, el tráfico en sentidos opuestos y C4. En las fronteras terminales, liberar una reserva de paso puede modificar un motor compartido.
