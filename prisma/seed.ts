import { PrismaClient, Role, AuctionStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Example Dubai car models
const carModels: string[] = [
  'Lamborghini Aventador',
  'Ferrari 488 GTB',
  'Rolls-Royce Ghost',
  'Bentley Continental GT',
  'Mercedes-Benz G63 AMG',
  'Porsche 911 Turbo S',
  'McLaren 720S',
  'Audi R8 V10',
  'BMW M5 Competition',
  'Range Rover SVR',
  'Nissan Patrol Platinum',
  'Toyota Land Cruiser VXR',
  'Chevrolet Camaro ZL1',
  'Dodge Challenger SRT',
  'Ford Mustang GT',
];

// Example users
const users = [
  {
    username: 'ali',
    email: 'ali@example.com',
    firstName: 'Ali',
    lastName: 'Al-Farsi',
    role: Role.USER,
  },
  {
    username: 'fatima',
    email: 'fatima@example.com',
    firstName: 'Fatima',
    lastName: 'Al-Mansoori',
    role: Role.USER,
  },
  {
    username: 'omar',
    email: 'omar@example.com',
    firstName: 'Omar',
    lastName: 'Al-Suwaidi',
    role: Role.USER,
  },
  {
    username: 'sara',
    email: 'sara@example.com',
    firstName: 'Sara',
    lastName: 'Al-Nuaimi',
    role: Role.USER,
  },
  {
    username: 'admin',
    email: 'admin@auction.com',
    firstName: 'Admin',
    lastName: 'User',
    role: Role.ADMIN,
  },
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  // Create users
  const createdUsers = {} as Record<string, any>;
  for (const user of users) {
    createdUsers[user.username] = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    });
  }

  const now = new Date();
  const auctions: any[] = [];
  let carIdx = 0;

  // 5 ended auctions with bids and winners
  for (let i = 0; i < 5; i++) {
    const startTime = new Date(
      now.getTime() - randomInt(5, 10) * 24 * 60 * 60 * 1000,
    ); // 5-10 days ago
    const endTime = new Date(
      startTime.getTime() + randomInt(1, 3) * 60 * 60 * 1000,
    ); // 1-3 hours duration
    const startingBid = randomInt(100000, 500000);
    const auction = await prisma.auction.create({
      data: {
        carId: carModels[carIdx++],
        startTime,
        endTime,
        startingBid,
        status: AuctionStatus.ENDED,
      },
    });
    // 2-5 bids
    const bidCount = randomInt(2, 5);
    let highestBid = startingBid;
    let winnerId = null;
    for (let b = 0; b < bidCount; b++) {
      const user = users[randomInt(0, users.length - 2)]; // not admin
      const amount = highestBid + randomInt(10000, 50000);
      highestBid = amount;
      const bid = await prisma.bid.create({
        data: {
          amount,
          timestamp: new Date(startTime.getTime() + (b + 1) * 30 * 60 * 1000),
          userId: createdUsers[user.username].id,
          auctionId: auction.id,
        },
      });
      winnerId = createdUsers[user.username].id;
    }
    await prisma.auction.update({
      where: { id: auction.id },
      data: { winnerId, currentHighestBid: highestBid },
    });
    auctions.push(auction);
  }

  // 5 live auctions (some with bids, some without)
  for (let i = 0; i < 5; i++) {
    const startTime = new Date(
      now.getTime() - randomInt(1, 3) * 60 * 60 * 1000,
    ); // 1-3 hours ago
    const endTime = new Date(
      startTime.getTime() + randomInt(1, 3) * 60 * 60 * 1000,
    ); // 1-3 hours duration
    const startingBid = randomInt(100000, 500000);
    const auction = await prisma.auction.create({
      data: {
        carId: carModels[carIdx++],
        startTime,
        endTime,
        status: AuctionStatus.LIVE,
        startingBid,
      },
    });
    // 50% chance to have bids
    let highestBid = startingBid;
    let winnerId = null;
    if (Math.random() > 0.5) {
      const bidCount = randomInt(1, 4);
      for (let b = 0; b < bidCount; b++) {
        const user = users[randomInt(0, users.length - 2)];
        const amount = highestBid + randomInt(10000, 50000);
        highestBid = amount;
        const bid = await prisma.bid.create({
          data: {
            amount,
            timestamp: new Date(startTime.getTime() + (b + 1) * 20 * 60 * 1000),
            userId: createdUsers[user.username].id,
            auctionId: auction.id,
          },
        });
        winnerId = createdUsers[user.username].id;
      }
      await prisma.auction.update({
        where: { id: auction.id },
        data: { currentHighestBid: highestBid },
      });
    }
    auctions.push(auction);
  }

  // 5 upcoming auctions (not shown in UI, but for completeness)
  for (let i = 0; i < 5; i++) {
    const startTime = new Date(
      now.getTime() + randomInt(1, 5) * 24 * 60 * 60 * 1000,
    ); // 1-5 days in future
    const endTime = new Date(
      startTime.getTime() + randomInt(1, 3) * 60 * 60 * 1000,
    ); // 1-3 hours duration
    const startingBid = randomInt(100000, 500000);
    const auction = await prisma.auction.create({
      data: {
        carId: carModels[carIdx++],
        startTime,
        endTime,
        status: AuctionStatus.UPCOMING,
        startingBid,
      },
    });
    auctions.push(auction);
  }

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
