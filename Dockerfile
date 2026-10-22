FROM nginx:alpine

# curl for the healthcheck
RUN apk add --no-cache curl

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5000

CMD ["nginx", "-g", "daemon off;"]
