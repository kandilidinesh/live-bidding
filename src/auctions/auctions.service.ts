import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuctionsService {
  constructor(private readonly prisma: PrismaService) {}

  // Place a bid for an auction
  async placeBid(
    auctionId: number,
    userId: number,
    amount: number,
  ): Promise<{ success: boolean; bid?: any; message?: string }> {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });
    if (!auction) return { success: false, message: 'Auction not found' };
    if (auction.status !== 'LIVE')
      return { success: false, message: 'Auction is not live' };
    if (amount <= auction.currentHighestBid) {
      return {
        success: false,
        message: 'Bid must be higher than current highest bid',
      };
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, message: 'User not found' };

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        await tx.auction.update({
          where: { id: auctionId },
          data: { currentHighestBid: amount },
        });
        const bid = await tx.bid.create({
          data: { auctionId, userId, amount },
        });
        return { bid };
      });
      return { success: true, bid: result.bid };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { success: false, message: 'Bid failed: ' + errorMsg };
    }
  }

  // Create a new auction
  async startAuction(data: { carId: string; startingBid: number }) {
    const farFuture = new Date('2999-12-31T23:59:59.999Z');
    return this.prisma.auction.create({
      data: {
        carId: data.carId,
        startingBid: data.startingBid,
        currentHighestBid: data.startingBid,
        startTime: new Date(),
        endTime: farFuture,
        status: 'LIVE',
      },
    });
  }

  // End an auction by ID
  async endAuction(id: number) {
    const highestBid = await this.prisma.bid.findFirst({
      where: { auctionId: id },
      orderBy: { amount: 'desc' },
      include: { user: true },
    });
    let winnerId: number | null = null;
    if (highestBid) {
      winnerId = highestBid.userId;
    }
    return this.prisma.auction.update({
      where: { id },
      data: {
        status: 'ENDED',
        endTime: new Date(),
        winnerId: winnerId,
      },
    });
  }

  // Schedule a future auction
  async scheduleAuction(data: {
    carId: string;
    startingBid: number;
    scheduledStartTime: string;
    scheduledEndTime: string;
  }) {
    return this.prisma.auction.create({
      data: {
        carId: data.carId,
        startingBid: data.startingBid,
        currentHighestBid: data.startingBid,
        startTime: new Date(data.scheduledStartTime),
        endTime: new Date(data.scheduledEndTime),
        status: 'UPCOMING',
      },
    });
  }

  // Get all auctions
  findAllAuctions() {
    return this.prisma.auction.findMany();
  }

  // Get a single auction by ID
  findAuctionById(id: number) {
    return this.prisma.auction.findUnique({ where: { id } });
  }

  // Delete an auction by ID
  deleteAuction(id: number) {
    return this.prisma.auction.delete({ where: { id } });
  }

  // Get all bids for a given auction
  async findBidsByAuctionId(auctionId: number) {
    return this.prisma.bid.findMany({
      where: { auctionId },
      orderBy: { timestamp: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  }
}
