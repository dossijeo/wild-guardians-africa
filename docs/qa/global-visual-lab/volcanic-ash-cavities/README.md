# Ceniza condicionada por altura de roca

Ambas variantes usan Rock035 scale0,06/relief0,44 y la misma máscara regional de ceniza. La candidata multiplica qaAsh por mix(1,0,25,smoothstep(0,48,0,85,height)). Es un control visual de acumulación, no una simulación geológica. El mapaARH existente contiene alturas normalizadas: percentiles25/50/75=0,486/0,671/0,792, medidos en sus1024²texels. La banda elegida deja los bajos cubiertos y descubre progresivamente las crestas.

La lectura usa UV sin desplazar y textureGrad, antes de calcular POM. Un único peso condiciona después profundidad, normales, color, rugosidad yAO. No se añade otro término de oclusión. Esta aproximación no resuelve una intersección de dos capas físicas: bajo ángulo oblicuo puede haber discrepancia con el punto alcanzado por POM y debe verificarse en movimiento. Una lectura de textura adicional por fragmento en esta ruta; ninguna textura, geometría, instancia o pasada nueva.

Doce capturas, media1280x720, semilla712, tres cámaras día/noche. Cámara/hora/draws/triángulos iguales A/B, sin erroresGL/página. La vista normal diurna inspeccionada muestra afloramientos de roca dentro de los depósitos y reduce uniformidad; se conserva la distribución amplia de ceniza. Noche mantiene la lectura de edificios, pero la roca adicional es más oscura. No se añade luz solar nocturna.

**Conservar candidata artística**: aporta estructura y separación de materiales más perceptibles que el tinte solar. No integrar aún: costeGPU, estabilidad temporal y peso de depósitos siguen abiertos. No declarar cumplido el mockup; no hay siluetas nuevas ni volumen geométrico de suelo.

[Normal día](day-0-pair.webp), [normal noche](night-0-pair.webp), [estado](captures.json), [diferenciasRGB](comparison.json). Reproducir capture-volcanic-ash-cavities.mjs, Vite5190. La transformación solo se aplica a la páginaQA candidata; main y las reglas permanecen intactas.
