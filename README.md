# Live Car Bidding System

## Objective

This project implements a scalable, real-time live car auction system. It is designed to handle high-frequency bids from multiple users, ensure concurrency and data integrity, and provide resilience against DDoS attacks. The backend is built with NestJS, Prisma/PostgreSQL, Redis, and RabbitMQ, and the frontend is a modern, minimal HTML/JS client.


## Features

- **Real-time Bidding:** High-frequency, concurrent bid handling using WebSocket (Socket.IO) and scalable NestJS gateway.
- **Auction Management:** Create, end, delete, and schedule auctions with persistent storage in PostgreSQL via Prisma ORM.
- **Bid Management:** All bids are stored with full audit trail, transactional safety, and concurrency control.
- **User Management:** User records with unique username/email, role, and status; extensible for authentication/authorization.
- **Scalability:** Redis Pub/Sub for distributed real-time updates and RabbitMQ for reliable, ordered message processing (bids, notifications, audit, DLQ).
- **DDoS Protection:** Rate limiting and throttling for WebSocket connections and bid events using custom guards and interceptors.
- **Resilience:** Handles connection failures, message retries, and dead letter queues for robust distributed operation.
- **REST API:** Comprehensive endpoints for auctions, bids, and users (see below for details).
- **User Simulation:** Built-in user simulation (see "User Simulation" section) to test and demonstrate real-time, concurrent, and high-frequency bidding scenarios.
- **Authentication Ready:** Backend and API structure can be easily extended to support real user authentication and authorization for enhanced security and user management.

## Architecture Overview

### 1. WebSocket Gateway (NestJS + Socket.IO)

- Implements a WebSocket gateway using NestJS decorators and Socket.IO.
- **Events:**
  - `joinAuction`: Join a specific auction room.
  - `placeBid`: Place a bid in real time; highest bid is broadcast to all clients in the room.
  - `auctionEnd`: Notify all clients when the auction ends with the final winning bid.
- **Concurrency:** Uses NestJS services and guards to manage auction rooms and current bids.
- **Rate Limiting:** Custom guards and interceptors limit WebSocket connections and bid frequency per user/IP.

### 2. Database Integration (PostgreSQL + Prisma ORM)

- **Schema:**
  - **Auctions:** Auction ID, Car ID, Start/End time, Starting Bid, Current Highest Bid, Winner ID, Status, etc.
  - **Bids:** Bid ID, User ID, Auction ID, Bid Amount, Timestamp.
  - **Users:** User ID, Username, Email, etc.
- **Transactions:**
  - All bid placements use Prisma transactions for atomicity and concurrency safety.
  - Optimistic locking and database constraints prevent race conditions.

### 3. Redis Caching and Pub/Sub

- **Caching:**
  - Current highest bid for each auction is cached in Redis to minimize DB load.
- **Pub/Sub:**
  - Redis channels broadcast bid updates across server instances.
  - Cache invalidation and real-time data sync via Redis Pub/Sub.
  - Redis used for session management and real-time synchronization.
- **Resilience:**
  - Handles connection failures and reconnection logic.
  - Uses separate Redis channels for each auction room.

### 4. Message Queue Integration (RabbitMQ)

- **Bid Processing:**
  - RabbitMQ exchanges and queues handle bid processing, notifications, and audit logs.
  - Dead letter queues (DLQ) for failed bid processing.
  - Message acknowledgments and retry mechanisms for reliability.
- **Queue Structure:**
  - **Bid Processing Queue:** Handles incoming bids with ordering.
  - **Notification Queue:** Sends real-time notifications to users.
  - **Audit Queue:** Logs all auction activities for compliance.
  - **Dead Letter Queue:** Handles failed message processing.

### 5. DDoS Mitigation Strategy

- **Rate Limiting:**
  - WebSocket connections per user/IP are limited using custom guards (`WsConnectionRateLimitGuard`).
  - Bid requests are throttled using a custom interceptor (`BidThrottleInterceptor`).
  - In-memory and Redis-based tracking for high-frequency bid prevention.
- **Guards/Interceptors:**
  - Guards and interceptors are applied to WebSocket and REST endpoints to prevent abuse.

## Quick Start

1. **Install Docker:**
   - [Download Docker Desktop](https://www.docker.com/products/docker-desktop/) and install for your OS.

2. **Start backend dependencies:**

   ```bash
   docker-compose up -d
   ```

   This will start PostgreSQL, Redis, and RabbitMQ.

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Set up the database:**
   - Update your `.env` with the correct `DATABASE_URL` if needed.
   - Run Prisma migrations:

   ```bash
   npx prisma migrate dev
   ```

5. **Start the backend:**

   ```bash
   npm run start:dev
   ```

6. **Access the test client UI:**
   The test client UI is served directly by the NestJS backend.

   Open [http://localhost:3000/index.html](http://localhost:3000/index.html) in your browser for the live auction UI.

## Usage

- Use the sidebar to select or add auctions.
- Admin can add auctions (with starting bid), end, or delete them.
- Users can place bids in real time; all bids and the starting bid are shown in the chat.
- Winner and auction status are displayed when the auction ends.
- REST API endpoints are available for bid history and auction management.

## Tech Stack

- **Backend:** NestJS, Prisma, PostgreSQL, Redis, RabbitMQ
- **Real-time:** Socket.IO, Redis Pub/Sub
- **Frontend:** HTML/JS (no framework)

## Security & Scalability

- **Concurrency:** All bid operations are transactional and concurrency-safe.
- **DDoS Protection:** WebSocket and bid rate limiting, connection throttling, and request filtering.
- **Distributed:** Redis and RabbitMQ enable horizontal scaling and multi-instance deployments.

## Implementation Details

### WebSocket Events

- `joinAuction`: Join a specific auction room.
- `placeBid`: Place a bid in real time.
- `auctionEnd`: Notify all clients when the auction ends.

### REST API Endpoints

#### Auctions
- `GET /auctions` — List all auctions.
- `POST /auctions` — Create a new auction. Body: `{ carId: string, startingBid: number }`
- `GET /auctions/:id` — Get details of a specific auction by ID.
- `PATCH /auctions/:id/end` — End an auction by ID. (Marks auction as ended and determines winner)
- `DELETE /auctions/:id` — Delete an auction by ID.
- `POST /auctions/schedule` — Schedule a future auction. Body: `{ carId: string, startingBid: number, scheduledStartTime: string, scheduledEndTime: string }`

#### Bids
- `GET /auctions/:id/bids` — Get all bids for a specific auction (ordered by timestamp).

#### Users
- `GET /users` — List all users.
- `POST /users` — Create a new user. Body: `{ username: string, email: string, firstName?: string, lastName?: string }`
- `GET /users/:id` — Get details of a specific user by ID.

#### Security
- All endpoints require an API key header: `x-api-key: <your-api-key>`

#### Notes
- All POST and PATCH endpoints expect JSON bodies.
- Error responses are returned with appropriate HTTP status codes and error messages.

### Prisma


#### Database Schema

- **User:** id, username, email, firstName, lastName, role, isActive, createdAt, updatedAt
- **Auction:** id, carId, startTime, endTime, startingBid, currentHighestBid, status, winnerId
- **Bid:** id, amount, timestamp, userId, auctionId

#### Concurrency

- **Transactional Bid Placement:** All bid placements are handled using Prisma's `$transaction` API, ensuring that updating the auction's `currentHighestBid` and creating a new bid happen atomically. This prevents race conditions and guarantees that only one highest bid is accepted at a time, even under high-frequency, concurrent bidding scenarios.
- **Database Constraints:** The database schema enforces constraints (such as unique and foreign keys) to further prevent data corruption and ensure integrity during concurrent operations.
- **Optimistic Locking:** The backend logic checks the current highest bid before accepting a new bid, and the transaction will fail if another bid is accepted in the meantime, ensuring safe concurrent updates.


### Redis

- **Cache:** Highest bid per auction.
- **Pub/Sub:** Bid updates per auction room.
- **Session:** Used for real-time data sync.

### RabbitMQ

- **Exchanges:** bid, notification, audit, dlx
- **Queues:** bid, notification, audit, dlq
- **DLQ:** Dead letter queue for failed messages.

### DDoS & Rate Limiting

- **WebSocket Guard:** Limits connections per user/IP.
- **Bid Throttle Interceptor:** Throttles bid frequency per user/IP.



## UI Coverage Notice

The provided UI (test client) is focused on the core live bidding experience and does not expose all backend or infrastructure features. Here are the technical details:

- **Exposed in UI:**
  - Users can join auctions, place bids, and see real-time updates and winners via Socket.IO WebSocket events (`joinAuction`, `placeBid`, `auctionEnd`).
  - Admin actions: Add, end, and delete auctions (via REST endpoints and WebSocket events).
  - User selection, color-coded chat, and bid history are available.

- **Not Exposed in UI (Backend Only):**
  - **Audit Logging:** All bid and auction events are published to a RabbitMQ audit exchange/queue for compliance and traceability. These logs are not viewable in the UI.
  - **RabbitMQ Dead Letter Queue (DLQ):** Failed bid or notification messages are routed to a DLQ for later inspection and retry. DLQ status and contents are not visible in the UI.
  - **Message Acknowledgments & Retry:** The backend implements message acknowledgments and retry logic for reliable processing, but this is not surfaced in the UI.
  - **System Health & Monitoring:** There is no UI dashboard for system health, queue status, or Redis/RabbitMQ connection state.
  - **DDoS Protection:** WebSocket connection rate limiting (`WsConnectionRateLimitGuard`) and bid throttling (`BidThrottleInterceptor`) are enforced in the backend, but users only see error messages if limits are hit.
  - **Redis Pub/Sub & Caching:** The backend uses Redis to cache the current highest bid and to broadcast bid updates across server instances. These mechanisms are transparent to the UI.
  - **Session & Real-Time Data Sync:** Redis is used for real-time data synchronization and session-like state, but session management is not exposed in the UI.
  - **Full REST API:** The backend exposes a comprehensive set of REST endpoints for auctions, bids, and users (see "REST API Endpoints" section above for details). Only a subset of these endpoints are surfaced in the UI. The following endpoints are **not** covered in the UI:
    - `POST /auctions/schedule` — Schedule a future auction
    - `PATCH /auctions/:id/end` — End an auction via REST (UI uses WebSocket event instead)
    - `POST /users` — Create a new user
    - `GET /users/:id` — Get details of a specific user
  - **Optimistic Locking & Concurrency:** Prisma transactions and database-level constraints ensure safe concurrent bidding, but the UI does not display transaction or locking status.

**Summary:**
The UI covers the main user/admin flows (bidding, auction management, real-time updates), but advanced backend features—such as audit trails, infrastructure health, message queue internals, and distributed cache/pubsub—are only implemented and observable in the backend code and infrastructure, not in the UI.

## User Simulation

To test high-frequency bidding and multi-user scenarios, you can simulate multiple users interacting with the system:

- **Manual Simulation:**
  - Open multiple browser tabs or windows at [http://localhost:3000/index.html](http://localhost:3000/index.html).
  - Select different users from the dropdown in each tab and place bids simultaneously.

- **Observing Results:**
  - The UI will update in real time for all simulated users.
  - Rate limiting and throttling will be enforced as per the backend configuration.
