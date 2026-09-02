# System Architecture

## Application Type

Node.js REST API.

## Architecture

The application uses Express as its web framework.

The application starts from:

src/index.js

## API

### GET /

Returns the application status.

### GET /health

Returns the health status of the application.

## Runtime

Node.js 20 or later.

## Configuration

The application supports:

- PORT
- NODE_ENV