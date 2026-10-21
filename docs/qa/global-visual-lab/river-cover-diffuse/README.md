# Gran Río: aproximación difusa del terreno sobre hojas

**Descartar esta variante.** De día se distinguen mejor algunas orientaciones de hojas, pero la cubierta sigue separada del suelo; de noche queda demasiado oscura. Una fórmula difusa más próxima al suelo no proporciona por sí sola una integración mejor sobre geometría de hojas.

[Diurna media](gran-rio-media-day-pair.webp) · [Nocturna media](gran-rio-media-night-pair.webp) · [Diurna baja](gran-rio-baja-day-pair.webp) · [Nocturna baja](gran-rio-baja-night-pair.webp)

Izquierda: receta previa con paleta candidata. Derecha: aproximación difusa del terreno. Ambas conservan desgaste, densidad, geometría, altura, viento y alcance. No es una comparación contra main.

## Cambio probado

Se sustituye `.35 + .65 * max(dot(N,L),0.)` por `.96 / PI * max(dot(N,L),0.)`, tomando el componente Lambert y reflectancia dieléctrica aproximada del suelo. El sol diurno pasa a `(3.65,3.30,2.78)` y el ambiente a `(.55,.63,.67)`, con orientación ambiente `(.76+.24*clamp(N.y,0.,1.))`. Se conservan los colores nocturnos existentes y la visibilidad de sombras. No se porta la BRDF completa, AO/contacto ni reflexión del terreno; no afirmar equivalencia de materiales.

La receta anterior tiene un término directo mínimo de .35 incluso para normales opuestas. Al retirarlo, la noche pierde una contribución importante que el ambiente nocturno actual no sustituye. Esta explicación se deriva de las fórmulas; el piloto cambia también sol y ambiente diurnos, por lo que no aísla cada contribución individual. No justificar un aumento global de brillo a partir de esta prueba.

También se verificó en BiomeGround que las texturas se cargan como RGBA sin conversión automática de color; ambas rutas aplican conversión en su receta. No hay evidencia de doble conversión en esa carga.

## Validación y costes

24 capturas del juego, 12 parejas: Gran Río semilla 712, 1280×720, baja/media, día 150/noche 350, tres poses. Auditoría aprobada de cámara, objetivo, hora, llamadas, triángulos, instancias y bytes de buffers coincidentes; sin errores registrados ni overflow. Inspección visual de la vista normal baja diurna y media diurna/nocturna. No se valida movimiento.

No añade geometría, draw calls, texturas o pasadas. Añade un factor de orientación ambiente y sustituye operaciones del término directo. No se ejecuta benchmark temporal porque no supera la validación artística nocturna; la igualdad de contadores no demuestra igualdad de tiempos. [Contadores y diferencias](comparison.json), [trazas](captures.json).

## Siguiente hipótesis

La geometría de hojas necesita una respuesta por ambas caras y una contribución de luz transmitida controlada, conservando las sombras existentes. Antes de otra comparación de paleta, aislar orientación de normales y contribuciones directa/ambiente en las mismas hojas, de día y noche. No promover esta variante ni aplicar la fórmula universalmente a otros biomas.

## Reproducción

```powershell
node tools/experiments/capture-river-cover-diffuse.mjs
python tools/experiments/package-river-cover-diffuse.py
```

Vite 5190. PNG originales locales; cuatro pares, registros y herramientas publicados. Comportamiento de producción intacto. Calidad global aún pendiente.
