# Diagnóstico inválido: sombras de la partida en el diorama

El primer intento dejó activo installAssetShadows de la partida ya cargada. Su wrapper añade proxies de los chunks a cualquier escena pasada al renderer compartido. Con viento se contaron 672812 triángulos en lugar de los aproximadamente 30 mil esperables del maíz y suelo. Las capturas y tiempos shadow de esta carpeta están contaminados por geometría ajena; no usarlos para decisión visual ni de rendimiento.

El siguiente pase desactiva ese hook solamente en la sesión QA pausada antes de instalar las sombras del diorama. Una integración real debe aislar los propietarios de escena y restaurar los hooks al entrar al juego; la desactivación permanente de este harness no es una solución de producción.
