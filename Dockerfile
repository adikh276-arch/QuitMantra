FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Create the subdirectory and copy files
COPY . /usr/share/nginx/html/quit_assessments

# Remove default config and copy our custom config
RUN rm /etc/nginx/conf.d/default.conf
COPY vite-nginx.conf /etc/nginx/conf.d/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
