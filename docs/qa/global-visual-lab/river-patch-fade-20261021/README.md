# Gran Río: pigmento espacial con transición lejana

Seis parejas:izquierda campo espacial sin atenuación,derecha retorno gradual al pigmento anterior entre24 y36 unidades horizontales. La reducción geométrica lejana empieza a36 unidades en calidad media. Ambos utilizan LOD coherente,paleta y desgaste iguales. Semilla712,1280×720,media,tres cámaras,día/noche. Auditoría:misma cámara,hora,draw calls,triángulos e instancias,sin errores.

Se conserva meso/humedad originales en coverageData.z,componente antes no utilizado por este shader,para recuperar exactamente su multiplicador de pigmento más allá de36 unidades. Sin nuevos atributos ni texturas. El campo espacial sigue calculándose por tile, no por fotograma. No se modifica la textura del terreno:el retorno evita añadir una discrepancia nueva,pero no garantiza igualdad cromática entre terreno y hojas.

[Normal diurna](day-0-pair.webp),[elevada diurna](day-1-pair.webp),[normal nocturna](night-0-pair.webp). Revisión de la normal diurna:cambio discreto,conserva cubierta y caminos. No certifica ausencia de anillos de color en movimiento. En perfil bajo el rango geométrico difiere y esta parametrización todavía requiere ajuste/validación.

El benchmark de performance compara otra pareja:LOD coherente sin campo espacial frente a campo espacial con esta atenuación. No confundir su control con el control de las imágenes. Conservar candidata QA;la aportación artística sigue siendo modesta y no resuelve por sí sola la uniformidad global.

```text
node tools/experiments/capture-river-patch-fade-20261021.mjs
python tools/experiments/package-river-patch-fade-20261021.py
```

Vite5190;archivar salidas antes de repetir. Predeterminado y main intactos.
