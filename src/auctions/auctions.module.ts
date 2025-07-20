import { Module, OnModuleInit } from '@nestjs/common';
import { AuctionsService } from './auctions.service';
import { AuctionGateway } from './auction.gateway';
import { AuctionsController } from './auctions.controller';
import { PubsubService } from '../redis/pubsub/pubsub.service';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';

@Module({
  imports: [RabbitmqModule],
  controllers: [AuctionsController],
  providers: [AuctionsService, AuctionGateway, PubsubService],
  exports: [AuctionsService],
})
export class AuctionsModule implements OnModuleInit {
  constructor(
    private readonly rabbitmqService: RabbitmqService,
    private readonly auctionsService: AuctionsService,
    private readonly pubsubService: PubsubService,
  ) {}

  onModuleInit() {
    this.rabbitmqService.setDependencies(
      this.auctionsService,
      this.pubsubService,
    );
  }
}
