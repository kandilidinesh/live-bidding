import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AuctionsService } from './auctions.service';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CreateAuctionDto } from './dto/create-auction.dto';

@UseGuards(ApiKeyGuard)
@Controller('auctions')
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  // Create a new auction
  @Post()
  addAuction(@Body() data: CreateAuctionDto) {
    return this.auctionsService.startAuction(data);
  }

  // End an auction by ID
  @Patch(':id/end')
  endAuction(@Param('id') id: string) {
    return this.auctionsService.endAuction(Number(id));
  }

  // Schedule a future auction
  @Post('schedule')
  scheduleAuction(
    @Body()
    data: {
      carId: string;
      startingBid: number;
      scheduledStartTime: string;
      scheduledEndTime: string;
    },
  ) {
    return this.auctionsService.scheduleAuction(data);
  }

  // Get all auctions
  @Get()
  findAll() {
    return this.auctionsService.findAllAuctions();
  }

  // Get a single auction by ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.auctionsService.findAuctionById(Number(id));
  }

  // Delete an auction by ID
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.auctionsService.deleteAuction(Number(id));
  }
}
