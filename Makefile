.PHONY: web build run dev test clean

# Build the frontend into web/dist (required before `build`/`run` since the Go
# binary embeds it).
web:
	cd web && npm install && npm run build

# Produce the single self-contained binary with the UI embedded.
build: web
	go build -o meopardy .

# Build everything and run it. Then open http://localhost:8080 (big screen) and
# http://localhost:8080/moderator (control surface).
run: build
	./meopardy

# Development: run the Go API and the Vite dev server in two terminals.
#   Terminal 1:  go run . -dev
#   Terminal 2:  cd web && npm run dev   (open http://localhost:5173)
dev:
	@echo "Terminal 1:  go run . -dev"
	@echo "Terminal 2:  cd web && npm run dev   ->  http://localhost:5173"

# End-to-end tests (Playwright). Builds the UI, starts the server, drives a
# headless browser. First run needs: cd web && npx playwright install chromium
test:
	cd web && npm run test:e2e

clean:
	rm -f meopardy
	rm -rf web/dist web/node_modules
