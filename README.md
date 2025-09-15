# move37-polling

A real-time polling application built with Node.js, Express, Prisma, PostgreSQL, and WebSockets. Users can create polls, vote, and see results update live.

---

## Features

- **RESTful API** for users and polls management
- **Vote endpoint** with real-time results broadcast via WebSockets
- **PostgreSQL** used for persistent storage (via Docker Compose)
- **Prisma ORM** for data modeling and migrations

---

## Project Structure

```
.
├── docker-compose.yml
├── index.js
├── package.json
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── README.md
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) (version 16+ recommended)
- [Docker](https://www.docker.com/get-started) (for running PostgreSQL)
- [npm](https://www.npmjs.com/) (comes with Node.js)

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yakitoritrash/move37-polling.git
cd move37-polling
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the PostgreSQL database

```bash
docker-compose up -d
```

This will start a PostgreSQL database with credentials as defined in `docker-compose.yml`.

### 4. Set up your environment

Create a `.env` file in the root directory (if not present) and add the following:

```
DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/pollingapp"
```

### 5. Run migrations

```bash
npx prisma migrate deploy
```
or if running for the first time and want to generate a new migration:
```bash
npx prisma migrate dev
```

### 6. Start the server

```bash
npm start
```

The server will run at [http://localhost:3000](http://localhost:3000).

---

## API Endpoints

### Users

- `POST /users` - Create a new user
- `GET /users` - List all users

### Polls

- `POST /polls` - Create a new poll
- `GET /polls` - List all polls

### Voting (with WebSocket broadcast)

- `POST /vote`  
  Request body:
  ```json
  {
    "userId": 1,
    "pollOptionId": 2
  }
  ```
  Response:  
  - 201 Created on success
  - 409 Conflict if user already voted for this option

### WebSocket

- Connect to `ws://localhost:3000` to receive real-time poll result updates after each vote.

---

## Testing the Endpoints

You can use [Postman](https://www.postman.com/) or [curl](https://curl.se/) to interact with the API.

Example: Create a user
```bash
curl -X POST -H "Content-Type: application/json" -d '{"name":"Alice"}' http://localhost:3000/users
```

Example: Vote and watch WebSocket messages
- Open a WebSocket client (like [websocat](https://github.com/vi/websocat) or browser extension) to `ws://localhost:3000`
- Submit a vote via POST `/vote`
- See the poll results update live in the WebSocket client

---

## Prisma

- Your schema is located at `prisma/schema.prisma`.  
- To generate the client after changes:

```bash
npx prisma generate
```

---

## Development

- `npm run dev` to start the server with nodemon for auto-reload
- Modify `.env` for custom DB settings

---

## License

MIT

---

## Repository

[https://github.com/yakitoritrash/move37-polling](https://github.com/yakitoritrash/move37-polling)
