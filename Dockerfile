# syntax=docker/dockerfile:1
# Placeholder container: this repository has not been scaffolded yet.
# Serves a static "waiting for code" page on port 80 so the deploy pipeline
# can produce a healthy URL. Replace this Dockerfile once real application
# code (FastAPI backend + React frontend) has been generated.

FROM nginx:1.27-alpine

RUN rm -f /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*.html

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
