# Manglares: muestreo desplazado por regiones

Control:mezcla de dos escalas. Candidata:cuatro desplazamientos pseudoaleatorios de UV,mezclados con pesos bilineales suavizados en una cuadrícula. Color,normal yARH comparten desplazamientos ypesos;sin rotación nueva. Se conservan máscaras,geometría ysilhuetas.

Seis parejas,semilla712,media,1280×720,tres cámaras,día/noche. Cámara,hora,draw calls ytriángulos iguales;sin errores. [Normal diurna](day-0-pair.webp),[elevada](day-1-pair.webp),[normal nocturna](night-0-pair.webp). Izquierda dos escalas,derecha regiones.

Decisión:no promover. En la normal diurna revisada se suaviza el relieve ypersisten filas. La media de normales/alturas pierde contraste;es una explicación compatible con la fórmula yla imagen,no una atribución aislada mediante ablation. El siguiente ensayo,si se retoma esta vía,debe preservar crestas con mezcla por altura en lugar de promediar cuatro superficies.

Coste estructural:12 lecturas de textura en el bucle frente a hasta6 del control;el código original contiene2 lecturas previas sobrescritas que el compilador podría eliminar,no se ha inspeccionado el shader compilado para confirmarlo. Sin benchmark GPU por contención reciente. El descarte es artístico,no por rendimiento.

Limitaciones adicionales:identidad regional derivada del UV actual,requiere comprobar origen flotante antes de cualquier integración;mezcla de normales no incorpora derivadas de pesos como una superficie física. Sin certificación de streaming,movimiento operfil bajo. Se conserva código ysalidas como evidencia de la hipótesis fallida.

```text
node tools/experiments/capture-moss-regions-20261021.mjs
python tools/experiments/package-moss-regions-20261021.py
```

Vite5190;archivar salidas antes de repetir. Main ypredeterminado intactos.
