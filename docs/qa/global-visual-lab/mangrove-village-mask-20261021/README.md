# Manglares: exclusiones alrededor del poblado

Diagnóstico en centro(60,0),48×48 unidades,malla regular96×96,paso.5,semilla712. Usa clasificador de las mismas condiciones del selector sin alterar la selección. Seis capturas día/noche exactamente iguales al control streamV10; sin errores.

De9216 puntos:8634 desgaste,62 margen de desgaste,12 cobertura insuficiente,508 aceptados. [Mapa](mask.png): exclusión circular dominante. Clasificación por primera razón: no demuestra ausencia de agua/ocupación donde desgaste rechaza antes. Malla regular,no población aleatoria de instancias ni porcentaje de pantalla.

Causa en src/rendering/ground-mask.js,groundWear417: wear=max(core*yard,path*.74). core representa área amplia del poblado según clearRadius, yard=.81+.19*meso; path representa corredores. El selector de hojas rechaza wear>.25 sin distinguir patio ycamino. Por tanto, aumentar tamaño o densidad en puntos aceptados no puede llenar la mayor parte de esta región.

Siguiente experimento: evaluar máscara visual que distinga patio de corredores, preservando caminos,agua,ocupación ypendientes. No modificar simulación ni despejado autoritativo. No aprobar relajación universal del umbral. V10 permanece intacta.

Reproducir capture-mangrove-village-mask-20261021.mjs y package-mangrove-village-mask-20261021.py con Vite5190. mask.json conserva muestras, equivalence.json comprueba seis imágenes. Sin benchmark: instrumentación QA de lectura, sin mejora gráfica implementada. Objetivo global pendiente.
