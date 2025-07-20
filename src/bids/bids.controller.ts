import { Controller, Get, Param } from '@nestjs/common';
import { AuctionsService } from '../auctions/auctions.service';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

@ApiTags('Bids')
@Controller('auctions/:auctionId/bids')
export class BidsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all bids for an auction' })
  @ApiParam({ name: 'auctionId', type: String })
  @ApiResponse({ status: 200, description: 'List of bids for the auction' })
  async getBidsForAuction(@Param('auctionId') auctionId: string) {
    return this.auctionsService.findBidsByAuctionId(Number(auctionId));
  }
}
