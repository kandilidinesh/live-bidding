
import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { AuctionsService } from './auctions.service';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@UseGuards(ApiKeyGuard)
@Controller('auctions')
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  // Start auction immediately

  @Post('start')
  startAuction(@Body() data: { carId: string; startingBid: number }) {
    return this.auctionsService.startAuction(data);
  }

  // End auction manually
  @Patch(':id/end')
  endAuction(@Param('id') id: string) {
    return this.auctionsService.endAuction(Number(id));
  }

  // Schedule auction for future
  @Post('schedule')
  scheduleAuction(@Body() data: { carId: string; startingBid: number; scheduledStartTime: string; scheduledEndTime: string }) {
    return this.auctionsService.scheduleAuction(data);
  }

  @Get()
  findAll() {
    return this.auctionsService.findAllAuctions();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.auctionsService.findAuctionById(Number(id));
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.auctionsService.deleteAuction(Number(id));
  }
}
