# calendar-gql quick start

This guide shows the shortest path to verify the repo locally:

1. build the Docker image
2. start the local services
3. start the app container
4. run the GraphQL smoke test

## Prerequisites

- Docker
- the repo `.env` file in place

The current `.env` is set up for local testing with:

- `DATABASE_URL=postgres://postgres:postgres@localhost:15432/calendar`
- `ELASTICSEARCH_URL=http://localhost:9200`

It also includes a demo calendar feed so the query smoke test returns an event.

## 1. Build the image

```bash
docker build -t calendar-gql:test .
```

## 2. Create the Docker network

```bash
docker network create calendar-net
```

## 3. Start Postgres

```bash
docker run -d --name calendar-db --network calendar-net -p 15432:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=calendar \
  postgres:15-alpine
```

## 4. Start Elasticsearch

```bash
docker run -d --name calendar-elastic --network calendar-net -p 9200:9200 \
  -e discovery.type=single-node \
  -e xpack.security.enabled=false \
  docker.elastic.co/elasticsearch/elasticsearch:7.17.9
```

## 5. Start the app container

Mount the repo `.env` so the app gets the calendar feed and credentials it expects.

```bash
docker run -d --name calendar-app-test --network calendar-net -p 4000:4000 \
  -v "$PWD/.env":/app/.env \
  -e DATABASE_URL=postgres://postgres:postgres@calendar-db:5432/calendar \
  -e ELASTICSEARCH_URL=http://calendar-elastic:9200 \
  calendar-gql:test
```

## 6. Check the app logs

```bash
docker logs --tail 100 calendar-app-test
```

You should see a message similar to:

```text
Server ready at http://localhost:5000/
```

## 7. Run the GraphQL smoke test

```bash
docker run --rm -v "$PWD":/app -w /app --network calendar-net \
  -e GRAPHQL_URL=http://calendar-app-test:5000/graphql \
  node:20-alpine3.18 sh -lc "corepack enable && corepack prepare yarn@stable --activate && yarn install --network-timeout 100000 && yarn run test-queries"
```

Expected result:

- `events` returns at least one demo event
- `event(id: ...)` returns the same event

## 8. Clean up

```bash
docker rm -f calendar-app-test calendar-db calendar-elastic
docker network rm calendar-net
```

## Notes

- The app starts on port `4000` in Docker, but the server itself listens on `5000` inside the container.
- If you change `.env`, restart the app container so the new values are loaded.
- The repo uses Yarn via Corepack in the Docker-based test flow.
