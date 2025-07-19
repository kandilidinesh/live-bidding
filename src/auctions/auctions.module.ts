import { Module } from '@nestjs/common';
import { AuctionsService } from './auctions.service';
import { AuctionGateway } from './auction.gateway';
import { AuctionsController } from './auctions.controller';
import { PubsubService } from '../redis/pubsub/pubsub.service';

@Module({
  controllers: [AuctionsController],
  providers: [AuctionsService, AuctionGateway, PubsubService]
})
export class AuctionsModule {}
