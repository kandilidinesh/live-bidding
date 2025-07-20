import { Controller, Get, Param, Logger } from '@nestjs/common';
import { AuctionsService } from '../auctions/auctions.service';

@Controller('bids')
export class BidsController {
  private readonly logger = new Logger(BidsController.name);
  constructor(private readonly auctionsService: AuctionsService) {}

  // Get all bids for a given auction
  @Get('auction/:auctionId')
  async getBidsForAuction(@Param('auctionId') auctionId: string) {
    this.logger.log(`[GET /bids/auction/${auctionId}]`);
    return this.auctionsService.findBidsByAuctionId(Number(auctionId));
  }
}
