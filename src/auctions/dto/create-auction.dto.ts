import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

export class CreateAuctionDto {
  @IsString()
  @IsNotEmpty()
  carId: string;

  @IsInt()
  @Min(0)
  startingBid: number;
}
