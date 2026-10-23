# Filtrado de cache1024 en primer plano

Prueba visual A/B, misma fixture/camara cercana/media720p/dia que projected1024-near. Igualar la anisotropia de las caches a8 no cambia un pixel del recorte cercano frente a anisotropia1: MAE RGB2.020/255 y p95 maximo canal9 contra el original. No resuelve la perdida de mezcla fina en esa zona. No se afirma que todos los planos o vistas sean identicos.

10.725MiB de pixels+mipmaps,1cache1024+4cache512. Calls,triangulos,camara,cobertura identicos por muestra en ventana de cadencia; sin errores. Sin benchmark GPU completo ni ABAB, no se atribuyen ahorros a esta variante.

Reproducir con measure-mangrove-ground-hybrid-20261023.mjs, WG_VARIANT_SEQUENCE=base,filtered1024, WG_PHASES=day, WG_VIEW=near, WG_MODES=cadence y WG_REVIEW_OUT apuntando a este directorio.
