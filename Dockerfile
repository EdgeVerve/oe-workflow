FROM ${REGISTRY}/alpine-node:12-alpine

RUN mkdir -p /home/src

EXPOSE 3000

ENV NODE_ENV docker
ENV MONGO_HOST mongo
ENV POSTGRES_HOST postgres

WORKDIR /home/src

COPY . /home/src

CMD node bin/app.js
