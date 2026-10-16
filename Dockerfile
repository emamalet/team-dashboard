FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

FROM node:20-alpine AS backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=frontend /app/frontend/dist frontend/dist
COPY --from=backend /app/backend/dist backend/dist
WORKDIR /app/backend
CMD ["node", "dist/server.js"]
