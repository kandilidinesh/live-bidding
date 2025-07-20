import { Module } from '@nestjs/common';
import { BidsService } from './bids.service';
import { BidsController } from './bids.controller';
import { AuctionsModule } from '../auctions/auctions.module';

@Module({
  imports: [AuctionsModule],
  controllers: [BidsController],
  providers: [BidsService],
})
export class BidsModule {}
