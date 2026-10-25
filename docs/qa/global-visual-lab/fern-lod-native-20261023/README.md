# Manglares: integracion nativa del LOD aprobado

El opt-in existente visualLab=global-lighting&mangroveFerns=holly usa ahora frondas cercanas nativas y compuesto lejano aprobado. No depende de interceptar fuentes QA. No cambia otros biomas ni main.

Seleccion por diametro proyectado de referencia2m: umbral inicial64px, histeresis60/68px, conservador detras de camara. Mantiene candidatos, densidad, mascaras y corte lejano; baja conserva solo LOD lejano y muy baja oculta cobertura. El historial permanece durante la vida de cada candidato, sin reiniciarlo artificialmente por captura.

Tres atlas2048x256 preparados offline con Canvas2D igual que el prototipo: dia, noche y sombra solar,8 orientaciones. Procedencia CC0 documentada junto al asset. Carga transaccional antes de modificar mallas; cancelacion o error libera texturas resueltas. La sombra auxiliar reutiliza buffers de instancias y se sincroniza desde el callback existente de cobertura. Dispose idempotente libera atlas, material retirado y sombra auxiliar, conservando recursos prestados.

Validacion:7 pruebas dirigidas pasan (cambios de calidad, mascara de agua/rio, propiedad de recursos, cancelacion, sincronizacion y dispose). Build correcto7.10s, aviso habitual de chunks mayores de500kB. No se ha repetido la suite completa; sus dos fallos previos siguen sin resolverse.

Juego real: Intel UHD/ANGLE1280x720/media,fixture pausada semilla712,camera normal con movimiento8m,90 muestras GPU y90 de cadencia independientes por fase. Sin interceptacion de materiales/selector;180 consultas validas, estado sin cambios, cero errores. Dia GPU21.466ms/cadencia28.187ms; noche23.068/28.669ms.286 geometrías136texturas,123.278calls867316.244triangulos medios. Es una comprobacion de integracion, NO nueva demostracion A/B de mejora. El historial LOD persistente hace que los recuentos no sean exactamente los del QA que reiniciaba historial antes de cada fase.

Revisadas las dos capturas completas: masa vegetal, ribera y frondas cercanas conservadas. Pendiente recorrido prolongado con streaming, alternancia real de calidad y camara en picado para cerrar validacion nativa. Limitaciones aprobadas: compuesto lejano sin viento ni recepcion de sombras externas; sombra precalculada estatica, cambio LOD discreto con histeresis.

Reproducir: node tools/experiments/build-fern-lod-atlas-20261023.mjs y node tools/experiments/measure-fern-lod-native-20261023.mjs (Vite5190). Scripts QA historicos de interceptacion corresponden a sus commits anteriores; no aplicarlos encima del LOD nativo o duplicarian la instalacion. El candidato de barro no se integra.
