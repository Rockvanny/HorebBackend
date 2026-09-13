# Generador de licencias

Herramienta interna, **no se distribuye con el backend**. Nada de esta carpeta se importa desde `index.js` ni desde ningún fichero que `pkg` empaquete — vive aquí solo por comodidad (comparte `node_modules` con el resto del repo), pero conceptualmente es un proyecto aparte.

## Primer uso (una sola vez)

```bash
node license-generator/generate-keys.js
```

Genera `license-generator/keys/private.pem` y `keys/public.pem`. La carpeta `keys/` está en `.gitignore`: **la clave privada no debe salir de tu máquina**. Guárdala también en un gestor de secretos aparte — si la pierdes, no podrás emitir más licencias con las que ya están instaladas en clientes; si se filtra, cualquiera puede fabricar licencias válidas.

Copia el contenido de `keys/public.pem` a `config/license-public-key.pem` en el backend (esa sí se versiona: es pública, solo sirve para verificar, no para firmar).

## Emitir una licencia para un cliente

1. El cliente instala el backend y llama a `GET /api/v1/license/fingerprint` (autenticado) para obtener la huella de su máquina.
2. Con esa huella:

```bash
node license-generator/create-license.js \
  --customer "Acme SL" \
  --fingerprint <huella-del-cliente> \
  --plan PRO \
  --modules GESTION,SALES,PURCHASES,SETUP \
  --days 365 \
  --out acme.lic
```

3. Envías `acme.lic` al cliente. Lo activa con `POST /api/v1/license/activate` (el contenido del fichero como `licenseToken`).

## Notas

- La licencia es un JWT (RS256) con `{ customer, plan, modules, fingerprint, exp }`. No lleva datos sensibles del cliente, solo lo necesario para que el backend decida qué puede hacer.
- Si la huella no coincide con la máquina donde se activa, el backend rechaza la licencia (`403`).
- No hay revocación: una licencia firmada es válida hasta su fecha de caducidad pase lo que pase. Si se necesita revocar antes (ej. impago), hoy no hay mecanismo — está anotado como pendiente en `SEGURIDAD.md`.
