import { Controller, Get, Param } from '@nestjs/common';
import { AuctionsService } from '../auctions/auctions.service';

@Controller('auctions/:auctionId/bids')
export class BidsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  @Get()
  async getBidsForAuction(@Param('auctionId') auctionId: string) {
    return this.auctionsService.findBidsByAuctionId(Number(auctionId));
  }
}
