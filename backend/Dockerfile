FROM golang:1.27-alpine AS base

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

# Development: live reload (mount ./backend:/app and use `target: dev`)
FROM base AS dev

CMD ["go", "tool", "air"]

# Production: static compiled binary
FROM base AS build

RUN CGO_ENABLED=0 go build -o /bin/api .

FROM alpine:latest AS prod

RUN apk add --no-cache ca-certificates tzdata

COPY --from=build /bin/api /usr/local/bin/api

CMD ["api"]
