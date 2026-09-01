# Etapa 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# Etapa 2: Producción
FROM node:20-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production

# Copiar archivos compilados
COPY --from=builder /app/dist ./dist

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Cambiar a usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Iniciar aplicación
CMD ["node", "dist/server.js"]