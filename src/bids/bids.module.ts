import { Module } from '@nestjs/common';
import { BidsService } from './bids.service';

@Module({
  providers: [BidsService]
})
export class BidsModule {}
