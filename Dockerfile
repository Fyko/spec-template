FROM node:12-alpine

LABEL name "Spec-tacles Template @ Proxy"
LABEL version "0.1.0"
LABEL maintainer "Carter Himmel <me@fyko.net>"

WORKDIR /usr/spec-template/proxy

COPY package.json pnpm-lock.yaml ./

RUN apk add --update \
&& apk add --no-cache ca-certificates \
&& apk add --no-cache --virtual .build-deps git curl build-base python g++ make \
&& curl -L https://unpkg.com/@pnpm/self-installer | node \
&& pnpm i

COPY . .

RUN pnpm run build

CMD ["node", "."]

