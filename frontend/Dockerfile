FROM node:20-alpine AS builder
WORKDIR /app

ARG VITE_ENGINE_URL=http://localhost:12001
ARG VITE_KEYCLOAK_URL=http://keycloak.localtest.me:11000
ARG VITE_NC_KC_REALM=sampleapp
ARG VITE_NC_KC_CLIENT_ID=sampleapp

ENV VITE_ENGINE_URL=${VITE_ENGINE_URL}
ENV VITE_KEYCLOAK_URL=${VITE_KEYCLOAK_URL}
ENV VITE_NC_KC_REALM=${VITE_NC_KC_REALM}
ENV VITE_NC_KC_CLIENT_ID=${VITE_NC_KC_CLIENT_ID}

COPY package*.json ./
RUN npm install

COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY src/ ./src/
COPY public/ ./public/

RUN printf "VITE_ENGINE_URL=%s\nVITE_KEYCLOAK_URL=%s\nVITE_NC_KC_REALM=%s\nVITE_NC_KC_CLIENT_ID=%s\n" \
      "$VITE_ENGINE_URL" "$VITE_KEYCLOAK_URL" "$VITE_NC_KC_REALM" "$VITE_NC_KC_CLIENT_ID" \
      > ../.env

RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/health || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
