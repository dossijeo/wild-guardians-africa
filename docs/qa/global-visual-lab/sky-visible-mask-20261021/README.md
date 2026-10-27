# Aislamiento del cambio de cielo

Seis parejas reales con panorama forzado a negro/blanco,Manglares,semilla712,media,1280×720,idénticas cámaras yhoras al estudio sky-cloud-depth. Esta prueba identifica píxeles que responden al fondo,incluidas transparencias ypequeños huecos; no es propuesta artística.

En todas las vistas,los píxeles modificados por el ajuste cromático están dentro de la máscara de respuesta al cielo:0 diferencias fuera. Primera vista195057 píxeles,segunda330011,tercera335878;igual día/noche. Único píxel inferior en x748,y626 también responde al cielo. La comprobación anterior de mitad inferior era demasiado restrictiva:no demuestra una regresión del terreno.

No prueba todos los ángulos ni identifica la geometría que deja visible ese píxel. Sin benchmark. Permite continuar revisión artística sin atribuir diferencias del cielo a iluminación de materiales. V10 intacta.

Reproducir capture-sky-visible-mask-20261021.mjs y audit-sky-visible-mask-20261021.py con Vite5190 yPNG del estudio sky-cloud-depth. audit.json y máscaras guardadas;capturas negro/blanco regenerables.
