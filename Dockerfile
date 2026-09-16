FROM node:18-alpine

# xmllint (libxml2-utils): valida el XML Veri*factu contra los XSD oficiales
# de la AEAT sin depender de ningún servicio externo (ver
# services/verifactuXmlValidator.service.js).
# tzdata: node:18-alpine no trae la base de datos de zonas horarias -sin
# ella, `process.env.TZ = 'Europe/Madrid'` (ver index.js) no tiene ningún
# efecto y Node cae en UTC en silencio, con horas equivocadas en toda la app
# (facturas, Veri*factu FechaHoraHusoGenRegistro incluido).
RUN apk add --no-cache libxml2-utils tzdata

WORKDIR /usr/src/app

COPY package*.json ./

# Instalamos únicamente las dependencias de producción (omitiendo devDependencies si las hubiera)
RUN npm ci --only=production

COPY . .

EXPOSE 3000

# Usamos node directamente en lugar de nodemon
CMD ["npm", "start"]
