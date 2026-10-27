# Perfil bajo: validación funcional, calidad insuficiente

Seis parejas día/noche comparan helper estático LOD con streaming, baja,semilla712,1280×720. El selector usa solo cuatro hojas por módulo,8triángulos,separación0.6,alcance40. 2351/2605/1272 instancias y18808/20840/10176 triángulos; una llamada de cobertura. Las capturas muestran demasiada separación y hojas planas en primer plano. No aprobar calidad artística por menor coste.

Streaming0→96→192→96→0 mantiene25chunks,sin errores,yrestaura la capa original al desmontar. No benchmark deGPU ni certificación de fugas. La región elegida automáticamente difiere de media,por lo que no comparar directamente sus cifras como ahorro a igual escena.

Reproducción:capture-mangrove-leaf-low-20261021.mjs ypackage-mangrove-leaf-low-20261021.py en tools/experiments,Vite5190.
