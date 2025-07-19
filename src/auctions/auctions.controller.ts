
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
    console.log(`[AuctionsController] POST /auctions/start`, data);
    return this.auctionsService.startAuction(data);
  }

  // End auction manually
  @Patch(':id/end')
  endAuction(@Param('id') id: string) {
    console.log(`[AuctionsController] PATCH /auctions/${id}/end`);
    return this.auctionsService.endAuction(Number(id));
  }

  // Schedule auction for future
  @Post('schedule')
  scheduleAuction(@Body() data: { carId: string; startingBid: number; scheduledStartTime: string; scheduledEndTime: string }) {
    console.log(`[AuctionsController] POST /auctions/schedule`, data);
    return this.auctionsService.scheduleAuction(data);
  }

  @Get()
  findAll() {
    console.log(`[AuctionsController] GET /auctions`);
    return this.auctionsService.findAllAuctions();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    console.log(`[AuctionsController] GET /auctions/${id}`);
    return this.auctionsService.findAuctionById(Number(id));
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    console.log(`[AuctionsController] DELETE /auctions/${id}`);
    return this.auctionsService.deleteAuction(Number(id));
  }
}
