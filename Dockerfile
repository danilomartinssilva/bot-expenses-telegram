FROM golang:1.24-bookworm AS build

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    gcc \
    libc6-dev \
    libtesseract-dev \
    libleptonica-dev \
  && rm -rf /var/lib/apt/lists/*

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=1 go build -o /bot ./cmd/bot

FROM debian:bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    tesseract-ocr \
    tesseract-ocr-por \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /bot /usr/local/bin/bot

EXPOSE ${PORT:-10000}

CMD ["bot"]
