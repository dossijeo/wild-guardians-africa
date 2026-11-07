# Espera de trabajadores ante puertas

El perfil WebGPU puede reproducir el clip `Idle` precocinado mientras un trabajador espera inmóvil ante una puerta. Utiliza la misma fase basada en tiempo de simulación que la pose original y reutiliza el banco de su modelo. La reproducción histórica exige muestras confirmadas de una espera estacionaria estable; la marcha, la carga, los golpes, la recuperación y las transiciones no cubiertas conservan sus rutas anteriores.

Las pruebas comparan los cuatro rigs con el proxy de muestreo del shader y comprueban admisión, cambios de estado y publicaciones de Wild Engine frente a una referencia. No constituyen una comparación visual en partida ni una medición en GPU física. El arnés de admisión histórica utiliza ahora el mismo callback de commit de frontera que el juego.
