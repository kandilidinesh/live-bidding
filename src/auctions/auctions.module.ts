import { Module } from '@nestjs/common';
import { AuctionsService } from './auctions.service';
import { AuctionGateway } from './auction/auction.gateway';
import { AuctionsController } from './auctions.controller';

@Module({
  controllers: [AuctionsController],
  providers: [AuctionsService, AuctionGateway]
})
export class AuctionsModule {}
