FROM nginx:alpine
COPY index.html styles.css app.js favicon.svg favicon.ico apple-touch-icon.png site.webmanifest /usr/share/nginx/html/
COPY icons/ /usr/share/nginx/html/icons/
EXPOSE 80
