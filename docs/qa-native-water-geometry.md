# Geometría de fluidos del lab

WorldScene dibujaba agua/lava como celdas cuadradas de 1,5 unidades y añadía
0,035 a la cota. Esa malla producía escalones y no recuperaba los contornos
de charca asociados a los assets. Se sustituye por los algoritmos originales
de Bioma Lab V4.0, extraídos mediante `tools/prepare_water.py`.

Los ríos usan franjas de una unidad, con ancho y cota originales y perfil
específico del cañón. El humedal usa su máscara de 0,75 unidades y los
rectángulos contiguos del optimizador original. Las charcas y piscinas de
lava recuperan el abanico del contorno publicado en cada asset, su cota
local y las mismas matrices de instancia que su orilla. No se sustituye el
contorno por un círculo ni se altera la navegación o el estado simulado.

El shader calcula coordenadas mundiales después de aplicar la matriz de
instancia. Los fluidos de assets conservan el recorte semiabierto original
por chunk para evitar dibujar dos veces una charca que atraviesa un límite.
Cada material de charca tiene límites propios. La malla compartida permanece
viva al descargar chunks; se liberan los buffers privados de las instancias
y los materiales propios. Los planos de agua no se convierten en obstáculos
para la mano de tutorial.

Las pruebas comparan todos los vértices contra las funciones originales para
seis biomas, tres semillas y cinco chunks por combinación, y todos los
contornos de assets. Cubren transformaciones, recorte y descarga de recursos.
La primera regresión dirigida pasa 87 pruebas de mundo, edificios, atmósfera
y shader. Los cambios finales de recorte/limpieza pasan 28 pruebas de render,
incluidas cinco de geometría de fluidos. No se da por repetida la suite
integrada por estos resultados dirigidos.

Comprobación visual aislada en WorldScene: orilla de lava en Volcanes, humedal en Manglar y charca
del asset en Sabana, Mapungubwe/712/calidad media, sin errores ni avisos.
Capturas `native-water-mesh-lava-bank.png` y
`native-water-mesh-sabana-pool.png`. La sustitución elimina los escalones de
la malla de lava anterior. El resto de la geografía sigue requiriendo revisión:
la malla del terreno aún usa una cuadrícula de 1,5 unidades frente a una del
lab, y quedan horizonte/streaming y recorte de los props sólidos. También
quedan los reflejos HDR/Fresnel completos, calidad muy baja y rendimiento móvil.
