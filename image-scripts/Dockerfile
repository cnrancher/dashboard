FROM node:12-alpine as builder

RUN apk --update add git less openssh bash && \
    rm -rf /var/lib/apt/lists/* && \
    rm /var/cache/apk/*

ARG BRANCH=release-2.5.8
ARG TAG=v2.5.6

# RUN mkdir /src

# WORKDIR /src

# RUN git clone https://github.com/rancher/dashboard.git -b $BRANCH

# WORKDIR /src/dashboard

# RUN if test $BRANCH != 'release-2.4' ; then git checkout $TAG ; fi

RUN mkdir -p /src/dashboard
WORKDIR /src/dashboard
COPY . /src/dashboard/

RUN ./scripts/build-hosted

FROM nginx:1.21.1-alpine

RUN rm -rf /usr/share/nginx/html/*
RUN mkdir /usr/share/nginx/html/dashboard
COPY --from=builder /src/dashboard/dist /usr/share/nginx/html/dashboard
COPY image-scripts/nginx.conf.template /etc/nginx/conf.d/default.conf.template
COPY image-scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
VOLUME /etc/nginx/ssl
ENV HOST releases.rancher.com
ENV ALLOW_ORIGIN *

RUN ln -s `find /usr/share/nginx/html/ -maxdepth 3 -type f -name "index.html" | head -n 1` /usr/share/nginx/html/index.html

CMD [ "sh", "-c", "/entrypoint.sh" ]

