# Matrices residentes con selección por identificadores — prototipo QA

Implementación ejecutable en WebGL2 del juego real. Conserva los grupos por recurso/LOD y sus draw calls. Una textura RGBA32F de4texels por matriz guarda transformaciones de instancias lógicas (batch UID + índice original). Un atributo instanciado de IDs selecciona la fila. El vertex shader carga la matriz una vez mediante4texelFetch y la reutiliza para posición, normal y componentes AfricanToon. Cobertura de ocultación sigue en atributo separado; sombras conservan implementación original.

Solo se calculan/añaden matrices al encontrar IDs nuevos. Cambiar el orden del bin LOD puede actualizar IDs y cobertura sin cambiar la textura. La prueba todavía conserva la construcción original de bins/matrices en asset-lod.js: elimina el segundo empaquetado del agrupador, no todo el trabajo CPU. Mantiene cachés por grupo/LOD; recrear grupos/capacidades pierde la residencia. Guarda IDs históricos hasta retiro del grupo, sin compactación del atlas. Cambio de origen limpia el mapa y vuelve a cargar posiciones.

Prueba `node tools/experiments/test-resident-matrices.mjs`: reordenar IDs conserva versión/contenido de textura; origen provoca actualización correcta; textura liberada. Pasa. Instancias nativas estáticas: no soporta editar una transformación lógica manteniendo identidad y matrixWorld; requiere invalidación explícita antes de generalizar. No es ruta de personajes animados.

Capturas reales Sabana baja seed7121280×720, normal/oblicua/inversa día y noche. Calls/triángulos/cobertura coincidentes. Diferencias RGB día92/20/131píxeles, noche252/19/407píxeles; máximos59/35/169 y70/26/121. Normal diurna revisada sin cambio visual grueso, pero ninguna pareja es exacta y la causa no está aislada. No afirmar equivalencia total ni promover aún. Datos captures.json/comparison.json y parejas WebP locales.

Benchmark ABBA iniciado, pendiente de auditoría. Mide uploads de textura, selecciones y bytes CPU del atlas; esos bytes no son VRAM total. No se ha probado streaming prolongado, límite de altura de textura, estabilidad temporal de residuos ni contexto perdido. Repetir por seis biomas solo tras resolver límites relevantes.

Reproducir con Vite5190, `node tools/experiments/capture-resident-matrices.mjs`, `python tools/experiments/package-resident-matrices.py`, `node tools/experiments/measure-resident-matrices.mjs` y `python tools/experiments/audit-resident-matrices.py`. Sin modificación del renderizador de producción.
