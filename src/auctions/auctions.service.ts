import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuctionsService {
  constructor(private readonly prisma: PrismaService) {}


  // Start auction immediately
  async startAuction(data: { carId: string; startingBid: number; endTime: string }) {
    return this.prisma.auction.create({
      data: {
        carId: data.carId,
        startingBid: data.startingBid,
        currentHighestBid: data.startingBid,
        startTime: new Date(),
        endTime: new Date(data.endTime),
        status: 'LIVE',
      },
    });
  }

  // End auction manually
  async endAuction(id: number) {
    return this.prisma.auction.update({
      where: { id },
      data: {
        status: 'ENDED',
        endTime: new Date(),
      },
    });
  }

  // Schedule auction for future
  async scheduleAuction(data: { carId: string; startingBid: number; scheduledStartTime: string; scheduledEndTime: string }) {
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

  findAllAuctions() {
    return this.prisma.auction.findMany();
  }

  findAuctionById(id: number) {
    return this.prisma.auction.findUnique({ where: { id } });
  }

  deleteAuction(id: number) {
    return this.prisma.auction.delete({ where: { id } });
  }
}
