## Live Car Auction System (NestJS Assessment)

This project is a minimal, full-stack live car auction system built with NestJS, Prisma/PostgreSQL, Redis, and RabbitMQ. It features a real-time chat-style bidding UI and admin controls.

### Features
- Real-time live car auctions with chat-style bid history
- User selection and color-coded chat
- Admin controls: add, end, and delete auctions
- Starting bid support and persistent bid storage
- REST API for bid history
- Winner display and auction timer
- Modern, compact frontend (HTML/JS, no framework)

### Quick Start

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

6. **Serve the test client:**
   ```bash
   npx serve .
   ```
   Then open [http://localhost:3000/test-client-chat.html](http://localhost:3000/test-client-chat.html) in your browser for the live auction UI.

### Usage
- Use the sidebar to select or add auctions.
- Admin can add auctions (with starting bid), end, or delete them.
- Users can place bids in real time; all bids and the starting bid are shown in the chat.
- Winner and auction status are displayed when the auction ends.

### Tech Stack
- NestJS, Prisma, PostgreSQL, Redis, RabbitMQ
- Socket.IO for real-time updates
- HTML/JS frontend (no framework)
