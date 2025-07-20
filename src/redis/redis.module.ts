import { Module } from '@nestjs/common';
import { PubsubService } from './pubsub/pubsub.service';

@Module({
  providers: [PubsubService],
})
export class RedisModule {}
