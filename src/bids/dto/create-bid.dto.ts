import { IsInt, IsPositive, Min } from 'class-validator';

export class CreateBidDto {
  @IsInt()
  @IsPositive()
  auctionId: number;

  @IsInt()
  @IsPositive()
  userId: number;

  @IsInt()
  @Min(1)
  amount: number;
}
