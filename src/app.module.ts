import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { AuctionsModule } from './auctions/auctions.module';
import { BidsModule } from './bids/bids.module';
import { RedisModule } from './redis/redis.module';
import { RabbitmqModule } from './rabbitmq/rabbitmq.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    UsersModule,
    AuctionsModule,
    BidsModule,
    RedisModule,
    RabbitmqModule,
    PrismaModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
