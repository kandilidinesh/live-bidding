import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

export class CreateAuctionDto {
  @ApiProperty({
    example: 'CAR123',
    description: 'ID of the car to be auctioned',
  })
  @IsString()
  @IsNotEmpty()
  carId: string;

  @ApiProperty({ example: 1000, description: 'Starting bid amount' })
  @IsInt()
  @Min(0)
  startingBid: number;
}
