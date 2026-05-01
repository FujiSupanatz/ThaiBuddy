# syntax=docker/dockerfile:1

FROM golang:1.23-alpine AS builder
WORKDIR /src

COPY go.mod ./
COPY *.go ./

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /bin/go-chat-api .

FROM alpine:3.20
WORKDIR /app
RUN adduser -D -u 10001 appuser

COPY --from=builder /bin/go-chat-api /app/go-chat-api

ENV GO_CHAT_API_ADDR=:8080

EXPOSE 8080

USER appuser

CMD ["/app/go-chat-api"]
