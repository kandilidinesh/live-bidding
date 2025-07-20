import { Module } from '@nestjs/common';
import { AuctionsService } from './auctions.service';
import { AuctionGateway } from './auction.gateway';
import { AuctionsController } from './auctions.controller';
import { PubsubService } from '../redis/pubsub/pubsub.service';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';

@Module({
  imports: [RabbitmqModule],
  controllers: [AuctionsController],
  providers: [AuctionsService, AuctionGateway, PubsubService],
  exports: [AuctionsService],
})
export class AuctionsModule {}
