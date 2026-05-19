FROM node:20-alpine3.18 AS build

ENV NODE_ENV=development
RUN mkdir -p /app
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml .yarn/install-state.gz ./
RUN apk add --no-cache postgresql-client
RUN corepack enable && corepack prepare yarn@stable --activate
RUN yarn install --immutable --network-timeout 100000
COPY . /app
RUN yarn run build
RUN mkdir -p /app/dist

FROM node:20-alpine3.18 AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app
RUN apk add --no-cache postgresql-client
COPY ./docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
CMD ["/docker-entrypoint.sh"]
