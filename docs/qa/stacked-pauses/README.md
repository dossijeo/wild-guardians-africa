# QA-007: pausas superpuestas en producción

Código `44f5c7b`, Desierto/Etíope, controles reales del menú y HUD. Se construye centro y mijo, se abre automáticamente la contratación y se cierra su superficie sin cancelar la necesidad lógica de contratar. Abrir el menú produce `pauses: [hiring, menu]`, reloj/elapsed 86,76850000000191, saldo 695 y planta con riego inicial pendiente (`two-pauses.json`).

Se abren Ajustes, se cierran y se pulsa Volver a la finca. Solo desaparece `menu`: permanece `hiring`, con reloj/elapsed y saldo exactamente iguales (`only-hiring.json`, `only-hiring.png`). Una observación posterior conserva exactamente ese estado (`hiring-held.json`). Un toque en el terreno reabre contratación; confirmar una mujer mayor cobra 100 una sola vez. Sin pausas, el reloj alcanza 107,9712000000014 y el trabajador comienza su llegada física (`resumed.json`).

La única superficie abierta en cada paso reemplaza la anterior. El tutorial no es una causa de pausa, conforme a la última regla del usuario. QA-007 queda acreditado para dos causas reales de pausa y su eliminación independiente. El documento permaneció visible durante el ensayo: esto no demuestra QA-014 (ocultación/restauración real y ausencia de avance offline), que sigue parcial.
