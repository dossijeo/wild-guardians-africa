# Lotes de color persistentes por chunk — prototipo QA

Control: agrupador actual por recurso/LOD que empaqueta chunks visibles. Candidato: clave adicional por chunk residente, incluyendo chunks fuera del frustum; se cambia mesh.visible según el frustum sin incluir cámara en el sello del buffer. Geometría, material, sombras y cobertura sin cambios. Cambios de LOD, visibilidad de origen y streaming todavía pueden provocar subidas; no se promete tráfico cero. El origen flotante aún invalida matrices.

Sabana baja, semilla712,1280×720, tres cámaras día/noche. Misma cobertura y triángulos en las seis parejas. Cuatro RGB exactas; día inversa92píxeles máximo159 y noche normal1píxel máximo17. Causa no aislada. Normal diurna inspeccionada visualmente sin pérdida apreciable. Draw calls del control69/76/61 frente a173/162/170, respectivamente. No es la variante de culling por instancia: ambos lados aquí usan visibilidad por chunk.

Benchmark móvil ABBA iniciado con `node tools/experiments/measure-persistent-asset-groups.mjs`; resultados pendientes de auditoría. No activar en producción sin medir CPU/GPU, estabilidad y memoria residente. Este prototipo conserva lotes de chunks cargados fuera de cámara y puede consumir más memoria.

Capturas: `node tools/experiments/capture-persistent-asset-groups.mjs`; comparación: `python tools/experiments/package-persistent-asset-groups.py`, servidor5190. Datos locales en captures.json/comparison.json y parejas WebP. Siguiente prueba: verificar subidas y coste de draw calls en movimiento; valorar partición espacial intermedia si por chunk resulta demasiado fragmentada.
