# Usar Node.js LTS como base
FROM node:18-alpine AS builder

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies para el build)
RUN npm ci

# Copiar código fuente
COPY . .

# Build de producción
RUN npm run build

# Etapa de producción con nginx
FROM nginx:alpine

# Copiar build a nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Crear configuración mínima de nginx solo para SPA routing
# El WebServer nginx manejará el proxy y el resto de la configuración
# El contenedor escucha en el puerto 5006 como está configurado en el WebServer
RUN echo 'server { \
    listen 5006; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Exponer puerto 5006
#EXPOSE 5006

# Comando de inicio
CMD ["nginx", "-g", "daemon off;"]
