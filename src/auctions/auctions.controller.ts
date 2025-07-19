import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AuctionsService } from './auctions.service';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@UseGuards(ApiKeyGuard)
@Controller('auctions')
export class AuctionsController {
  private readonly logger = new Logger(AuctionsController.name);
  constructor(private readonly auctionsService: AuctionsService) {}

  // Start auction immediately

  @Post('start')
  startAuction(@Body() data: { carId: string; startingBid: number }) {
    this.logger.log(`[POST /auctions/start] ${JSON.stringify(data)}`);
    return this.auctionsService.startAuction(data);
  }

  // End auction manually
  @Patch(':id/end')
  endAuction(@Param('id') id: string) {
    this.logger.log(`[PATCH /auctions/${id}/end]`);
    return this.auctionsService.endAuction(Number(id));
  }

  // Schedule auction for future
  @Post('schedule')
  scheduleAuction(
    @Body()
    data: {
      carId: string;
      startingBid: number;
      scheduledStartTime: string;
      scheduledEndTime: string;
    },
  ) {
    this.logger.log(`[POST /auctions/schedule] ${JSON.stringify(data)}`);
    return this.auctionsService.scheduleAuction(data);
  }

  @Get()
  findAll() {
    this.logger.log(`[GET /auctions]`);
    return this.auctionsService.findAllAuctions();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    this.logger.log(`[GET /auctions/${id}]`);
    return this.auctionsService.findAuctionById(Number(id));
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    this.logger.log(`[DELETE /auctions/${id}]`);
    return this.auctionsService.deleteAuction(Number(id));
  }

  // Get all bids for a given auction
  @Get(':id/bids')
  async getBids(@Param('id') id: string) {
    this.logger.log(`[GET /auctions/${id}/bids]`);
    return this.auctionsService.findBidsByAuctionId(Number(id));
  }

  // Add auction (admin, minimal: carId only)
  @Post()
  addAuction(@Body() data: { carId: string; startingBid?: number }) {
    this.logger.log(`[POST /auctions] ${JSON.stringify(data)}`);
    // Use provided startingBid or default to 0
    return this.auctionsService.startAuction({ carId: data.carId, startingBid: data.startingBid ?? 0 });
  }
}
