# syntax=docker/dockerfile:1
# Combined-container image for FastAPI (Python) + React/Vite (Node) stack.
# nginx serves the compiled SPA and reverse-proxies /api/ to uvicorn on 127.0.0.1:3000.
# supervisord runs BOTH processes as PID 1's children.

# ── Stage 1: build the React/Vite SPA ───────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /web
COPY web/package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --loglevel=error || \
    npm install --no-audit --no-fund --loglevel=error
COPY web/ ./
# BASE_HREF baked at build time. Single-preview subdomain root ("/").
RUN npx vite build --base=/

# ── Stage 2: runtime — Python + nginx + supervisord ─────────────────────────
FROM python:3.12-slim AS runtime
ENV PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

# Install nginx + supervisord (both provided as OS packages on Debian slim)
RUN apt-get update && \
    apt-get install -y --no-install-recommends nginx supervisor curl && \
    rm -rf /var/lib/apt/lists/* && \
    # Clean out the default nginx site
    rm -f /etc/nginx/sites-enabled/default /etc/nginx/conf.d/default.conf

WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install -r requirements.txt

COPY backend/ /app/backend/

# Copy compiled SPA from the frontend-builder stage into nginx's document root
COPY --from=frontend-builder /web/dist /usr/share/nginx/html

# nginx site config (combined container: proxy /api/ to uvicorn on 127.0.0.1:3000)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# supervisord config: nginx (PID 1's foreground) + backend uvicorn
COPY supervisord.conf /etc/supervisord.conf

EXPOSE 80
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
