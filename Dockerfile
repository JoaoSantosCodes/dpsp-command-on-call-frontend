# dpsp-command-on-call-frontend
# Build do React e serve via Nginx

# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY src ./src
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig.json ./

RUN npx vite build --outDir dist

# Stage 2: Nginx
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built frontend
COPY --from=build /app/dist .

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
