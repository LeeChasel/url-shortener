# URL shortner

## TODO

- [x] url shortener module
- [x] short url redirect module
- [ ] og-scraper

## Project setup

1. Setup environment variables.
   Make a copy of [.env.example](./.env.example) and rename it to `.env`.

```bash
# .env
APP_PORT=
BASE_URL=
DATABASE_URL=
REDIS_URL=
NODE_ENV=
ENABLE_SCHEDULER=
```

2. Install dependencies (this will also generate the Prisma Client):

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```
