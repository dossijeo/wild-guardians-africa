# Atlas y superficies originales de los objetos del mundo

La carga de cada bioma conserva sus tres atlas: color sRGB, normales lineales
y metallicRoughness lineal. Verde define rugosidad y azul metal; no se asigna
el rojo a AO. Se calculan las tangentes originales para cada LOD, incluida
la orientación y el fallback de UV degeneradas. Los atlas permanecen
compartidos por los veinte objetos; cada objeto comparte material entre LOD.

Se extrae `describeSurface` del lab: corteza/follaje, roca, madera, hueso y
construcción conservan parámetros y humedad por bioma. El grupo efectivo
usa `profile.assetGroups` antes del slot predeterminado; esa misma regla
ahora alimenta las exclusiones de ocultación en Desierto y Cañón. No se
clasifican los objetos por su aspecto en una captura.

El material conserva normalScale original (0,6; 0,55 en Cañón y 0,52 en
Desierto), alphaTest 0,35, doble cara, UV originales y factores de color.
Rugosidad mezcla el atlas al 26 %, respeta follaje y humedad reducida por
altura local. La humedad oscurece la base con el tinte original. El shader
cel recibe el tipo, follaje y humedad de cada superficie y compone con
la cobertura de obstáculos. Three maneja transformación de tangentes,
normal mapping y conversión sRGB; se adapta la receta a su iluminación
lineal, sin afirmar igualdad píxel a píxel con el renderer WebGL del lab.

Pruebas independientes contrastan las 120 clasificaciones y cada byte de
tangentes de todos los LOD contra funciones extraídas del original. La carga
de los seis paquetes verifica tres solicitudes de atlas, espacio de color,
normalScale, canales MR, ausencia de AO inventado y material común por LOD.
También se comprueba composición de shaders con cel y ocultación.
Pasan 13/13 pruebas dirigidas en 1,640 s, build en 6,45 s y paquete web:
547 archivos / 379.358.298 bytes / 791 enlaces relativos / 20 GLB de ejecución.
CI de ocultación anterior f3f786b aprobada en 37028414281.
Regresión completa: 539/539, sin omisiones, en 256,627 s.

CUA registra seis biomas con Mapungubwe/semilla 712, 60/60 LOD con atlas de
normales y tangentes. Manglar incluye día/noche; Cañón alta y viaje con
descarga; Desierto muy baja; Sabana, Gran río y Volcanes media. Todos los
estados tienen cero errores WebGL y de consola, con la ocultación activa.
Capturas y estados en `test-results/native-surface-*`. No se verifican con
estas capturas las treinta combinaciones de bioma/cultura ni rendimiento móvil.

Esta revisión restaura atlas y parámetros de superficies de props. Siguen
pendientes su reflejo HDR nativo, AO de contacto geométrico, tratamiento
volcánico específico y detalle de terreno, LOD por distancia, batching,
worker, origen flotante, rendimiento móvil y otras verificaciones del plan.
No acredita todavía la fidelidad visual completa del mundo.
