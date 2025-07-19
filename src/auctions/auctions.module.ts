import { Module } from '@nestjs/common';
import { AuctionsService } from './auctions.service';
import { AuctionGateway } from './auction/auction.gateway';

@Module({
  providers: [AuctionsService, AuctionGateway]
})
export class AuctionsModule {}
