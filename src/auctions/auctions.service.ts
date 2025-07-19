import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuctionsService {
  constructor(private readonly prisma: PrismaService) {}

  // Place a bid (for WebSocket live bidding)
  async placeBid(
    auctionId: number,
    userId: number,
    amount: number,
  ): Promise<{ success: boolean; bid?: any; message?: string }> {

    // 1. Validate auction is live
    console.log(`[placeBid] Received bid: auctionId=${auctionId}, userId=${userId}, amount=${amount}`);
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });
    if (!auction) {
      console.warn(`[placeBid] Auction not found: ${auctionId}`);
      return { success: false, message: 'Auction not found' };
    }
    if (auction.status !== 'LIVE') {
      console.warn(`[placeBid] Auction not live: ${auctionId}`);
      return { success: false, message: 'Auction is not live' };
    }
    if (amount <= auction.currentHighestBid) {
      console.warn(`[placeBid] Bid too low: ${amount} <= ${auction.currentHighestBid}`);
      return {
        success: false,
        message: 'Bid must be higher than current highest bid',
      };
    }

    // 2. Validate user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.warn(`[placeBid] User not found: ${userId}`);
      return { success: false, message: 'User not found' };
    }

    // 3. Create bid and update auction in a transaction
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const updatedAuction = await tx.auction.update({
          where: { id: auctionId },
          data: { currentHighestBid: amount },
        });
        const bid = await tx.bid.create({
          data: { auctionId, userId, amount },
        });
        return { updatedAuction, bid };
      });
      console.log(`[placeBid] Bid placed successfully: bidId=${result.bid.id}`);
      return { success: true, bid: result.bid };
    } catch (err) {
      console.error(`[placeBid] Bid failed: ${err.message}`);
      return { success: false, message: 'Bid failed: ' + err.message };
    }
  }

  // Start auction immediately (no endTime, admin will end manually)
  async startAuction(data: { carId: string; startingBid: number }) {
    console.log(`[startAuction] Starting auction for carId=${data.carId}, startingBid=${data.startingBid}`);
    // Set endTime to a far-future date as a placeholder; admin will end manually
    const farFuture = new Date('2999-12-31T23:59:59.999Z');
    const auction = await this.prisma.auction.create({
      data: {
        carId: data.carId,
        startingBid: data.startingBid,
        currentHighestBid: data.startingBid,
        startTime: new Date(),
        endTime: farFuture,
        status: 'LIVE',
      },
    });
    console.log(`[startAuction] Auction started: id=${auction.id}`);
    return auction;
  }

  // End auction manually
  async endAuction(id: number) {
    console.log(`[endAuction] Ending auction id=${id}`);
    const auction = await this.prisma.auction.update({
      where: { id },
      data: {
        status: 'ENDED',
        endTime: new Date(),
      },
    });
    console.log(`[endAuction] Auction ended: id=${auction.id}`);
    return auction;
  }

  // Schedule auction for future
  async scheduleAuction(data: {
    carId: string;
    startingBid: number;
    scheduledStartTime: string;
    scheduledEndTime: string;
  }) {
    console.log(`[scheduleAuction] Scheduling auction for carId=${data.carId}, startingBid=${data.startingBid}, start=${data.scheduledStartTime}, end=${data.scheduledEndTime}`);
    const auction = await this.prisma.auction.create({
      data: {
        carId: data.carId,
        startingBid: data.startingBid,
        currentHighestBid: data.startingBid,
        startTime: new Date(data.scheduledStartTime),
        endTime: new Date(data.scheduledEndTime),
        status: 'UPCOMING',
      },
    });
    console.log(`[scheduleAuction] Auction scheduled: id=${auction.id}`);
    return auction;
  }

  findAllAuctions() {
    console.log(`[findAllAuctions] Fetching all auctions`);
    return this.prisma.auction.findMany();
  }

  findAuctionById(id: number) {
    console.log(`[findAuctionById] Fetching auction id=${id}`);
    return this.prisma.auction.findUnique({ where: { id } });
  }

  deleteAuction(id: number) {
    console.log(`[deleteAuction] Deleting auction id=${id}`);
    return this.prisma.auction.delete({ where: { id } });
  }
}
