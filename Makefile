.PHONY: build test vet fmt run clean

CGO_CPPFLAGS ?= -I/opt/homebrew/include
CGO_LDFLAGS ?= -L/opt/homebrew/lib

build:
	CGO_ENABLED=1 CGO_CPPFLAGS="$(CGO_CPPFLAGS)" CGO_LDFLAGS="$(CGO_LDFLAGS)" go build -o bin/bot ./cmd/bot

test:
	CGO_ENABLED=1 CGO_CPPFLAGS="$(CGO_CPPFLAGS)" CGO_LDFLAGS="$(CGO_LDFLAGS)" go test ./...

vet:
	CGO_ENABLED=1 CGO_CPPFLAGS="$(CGO_CPPFLAGS)" CGO_LDFLAGS="$(CGO_LDFLAGS)" go vet ./...

fmt:
	gofmt -l -w .

run:
	CGO_ENABLED=1 CGO_CPPFLAGS="$(CGO_CPPFLAGS)" CGO_LDFLAGS="$(CGO_LDFLAGS)" go run ./cmd/bot

clean:
	rm -rf bin
