# syntax = docker/dockerfile:1

# Define la versión de Node.js
ARG NODE_VERSION=20.12.0
FROM node:${NODE_VERSION}-slim as base

LABEL fly_launch_runtime="Next.js"

# Configuración inicial
WORKDIR /app
ENV NODE_ENV="production"
ENV PLAYWRIGHT_BROWSERS_PATH="/ms-playwright"
ENV PLAYWRIGHT_SKIP_BROWSER_GC=1

# Etapa de construcción
FROM base as build

# Instalar dependencias del sistema
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    node-gyp \
    pkg-config \
    python-is-python3 \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Instalar dependencias del proyecto
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Instalar navegadores de Playwright con dependencias
RUN npx playwright install --with-deps

# Copiar el código fuente
COPY . .

# Construir la aplicación
RUN npm run build

# Reducir el tamaño de la imagen eliminando dependencias de desarrollo
RUN npm prune --omit=dev

# Etapa final
FROM base

# Instalar dependencias necesarias para los navegadores
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copiar la aplicación construida
COPY --from=build /app /app

# Exponer el puerto de la aplicación
EXPOSE 3000

# Comando para iniciar la aplicación
#CMD [ "npm", "run", "start" ]
CMD ["sh", "-c", "npx playwright install --with-deps && npm run start"]
