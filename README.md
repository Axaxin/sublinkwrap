# SubLinkWrap

A lightweight API service built with Node.js and Express.

## Deployment

### Prerequisites

- Docker
- Docker Compose

### Quick Start

1. Clone the repository:
```bash
git clone https://github.com/Axaxin/sublinkwrap.git
cd sublinkwrap
```

2. Start the service:
```bash
docker-compose up -d
```

The service will be available at `http://localhost:3000`.

## API Endpoints

- `GET /`: Health check endpoint
- `GET /mysub`: Subscription configuration endpoint

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |

## Development

Built with:
- Node.js
- Express
- Docker
- GitHub Actions