# Volcanes: equilibrio cromático del relleno nocturno

Control:ambiente nocturno integrado1.65. Candidata:cambia únicamente su color base de(.095,.17,.32) a(.15,.22,.32),manteniendo multiplicador y uNight. No modifica luz directa,AO,normales,sombras ni albedo. Más rojo/verde en el relleno,azul intacto;no pretende simular nueva fuente física.

Seis parejas reales:semilla712,media,1280×720,tres cámaras,día/noche. Misma cámara,objetivo,hora,draw calls y triángulos;sin errores. Las tres vistas diurnas son exactamente iguales. Izquierda control,derecha candidata.

- [Normal nocturna](night-0-pair.webp)
- [Elevada nocturna](night-1-pair.webp)
- [Inversa nocturna](night-2-pair.webp)
- [Normal diurna](day-0-pair.webp)

En la normal nocturna revisada disminuye la dominante azul y se perciben algo mejor las irregularidades,conservando roca oscura y contraste con lava. Mejora moderada,no soluciona todas las zonas negras ni alcanza por sí sola el objetivo artístico. Conservar como candidata QA para revisión de amanecer/anochecer y coste antes de integrar.

Coste estructural:solo cambia una constante vec3,sin nuevas texturas,muestras,pasadas o geometría. No se ha medido un benchmark de esta variante y no se afirma coste temporal nulo. La deriva de los benchmarks recientes impide trasladarles una conclusión de FPS.

```text
node tools/experiments/capture-volcanic-night-spectrum-20261021.mjs
python tools/experiments/package-volcanic-night-spectrum-20261021.py
```

Vite5190;archivar salidas antes de repetir. Main y predeterminado intactos.
