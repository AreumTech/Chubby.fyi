# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum* ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o /server ./cmd/server

# Runtime stage - using distroless for minimal image size
FROM gcr.io/distroless/static:nonroot

WORKDIR /

# Copy binary from builder
COPY --from=builder /server /server

# Expose port (Cloudflare Containers default is 8080)
EXPOSE 8080

# Run as non-root user
USER nonroot:nonroot

# Run the server
ENTRYPOINT ["/server"]
