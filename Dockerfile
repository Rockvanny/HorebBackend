FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

# Instalamos únicamente las dependencias de producción (omitiendo devDependencies si las hubiera)
RUN npm ci --only=production

COPY . .

EXPOSE 3000

# Usamos node directamente en lugar de nodemon
CMD ["npm", "start"]
