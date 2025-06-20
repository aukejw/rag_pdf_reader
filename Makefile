## Variables

## Targets 

# Run pytests
test:
	uv run pytest --cov-report=term-missing --cov-report=html && uv run coverage html

.PHONY: install-backend install-frontend start-backend start-frontend start-all

# Install dependencies
install-backend:
	uv sync --group=dev

install-frontend:
	cd frontend && npm install

install: install-backend install-frontend

# Start services
start-backend:
	cd pdf_reader && uv run uvicorn main:app --reload --port 8000

start-frontend:
	cd frontend && npm run dev

# Start both services in parallel
start-all:
	@echo "Starting both backend and frontend..."
	@make start-backend & make start-frontend & wait

# Development setup
dev: install start-all
