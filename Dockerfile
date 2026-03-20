FROM node:20-alpine AS base

# Backend build
FROM base AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --production=false
COPY backend/ ./
RUN npm run build

# Frontend build
FROM base AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ARG VITE_API_URL=/api
ARG VITE_DEMO_MODE=false
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_DEMO_MODE=$VITE_DEMO_MODE
RUN npm run build

# Production
FROM base AS production
WORKDIR /app

COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/node_modules ./node_modules
COPY --from=backend-build /app/backend/package.json ./
COPY --from=frontend-build /app/frontend/dist ./public

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
