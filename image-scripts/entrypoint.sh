#!/bin/sh

find /usr/share/nginx/html -name '*.html' -o -name '*.js' | xargs sed -i.bak -e 's/releases.rancher.com\//'$HOST'\//g'
find /usr/share/nginx/html -name '*.bak' | xargs rm -rf
envsubst '${ALLOW_ORIGIN}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/nginx.conf

nginx -g 'daemon off;'
