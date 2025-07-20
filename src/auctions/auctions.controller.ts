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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiSecurity,
} from '@nestjs/swagger';

@ApiTags('Auctions')
@ApiSecurity('x-api-key')
@UseGuards(ApiKeyGuard)
@Controller('auctions')
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  // Create a new auction
  @Post()
  @ApiOperation({ summary: 'Create a new auction' })
  @ApiBody({ type: CreateAuctionDto })
  @ApiResponse({ status: 201, description: 'Auction created' })
  addAuction(@Body() data: CreateAuctionDto) {
    return this.auctionsService.startAuction(data);
  }

  // End an auction by ID
  @Patch(':id/end')
  @ApiOperation({ summary: 'End an auction by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Auction ended' })
  endAuction(@Param('id') id: string) {
    return this.auctionsService.endAuction(Number(id));
  }

  // Schedule a future auction
  @Post('schedule')
  @ApiOperation({ summary: 'Schedule a future auction' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        carId: { type: 'string' },
        startingBid: { type: 'number' },
        scheduledStartTime: { type: 'string', format: 'date-time' },
        scheduledEndTime: { type: 'string', format: 'date-time' },
      },
      required: [
        'carId',
        'startingBid',
        'scheduledStartTime',
        'scheduledEndTime',
      ],
    },
  })
  @ApiResponse({ status: 201, description: 'Auction scheduled' })
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
  @ApiOperation({ summary: 'Get all auctions' })
  @ApiResponse({ status: 200, description: 'List of auctions' })
  findAll() {
    return this.auctionsService.findAllAuctions();
  }

  // Get a single auction by ID
  @Get(':id')
  @ApiOperation({ summary: 'Get a single auction by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Auction details' })
  findOne(@Param('id') id: string) {
    return this.auctionsService.findAuctionById(Number(id));
  }

  // Delete an auction by ID
  @Delete(':id')
  @ApiOperation({ summary: 'Delete an auction by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Auction deleted' })
  remove(@Param('id') id: string) {
    return this.auctionsService.deleteAuction(Number(id));
  }
}
