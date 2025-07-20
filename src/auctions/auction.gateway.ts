import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseGuards, UseInterceptors } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { AuctionsService } from './auctions.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { CreateBidDto } from 'src/bids/dto/create-bid.dto';
import { PubsubService } from 'src/redis/pubsub/pubsub.service';
import { RabbitmqService } from 'src/rabbitmq/rabbitmq.service';
import { WsConnectionRateLimitGuard } from 'src/common/guards/ws-connection-rate-limit.guard';
import { BidThrottleInterceptor } from 'src/common/interceptors/bid-throttle.interceptor';

@WebSocketGateway({ namespace: '/auctions', cors: true })
@UseGuards(WsConnectionRateLimitGuard)
export class AuctionGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private socketHandlers = new WeakMap<
    Socket,
    Map<number, (bid: any) => void>
  >();

  constructor(
    private readonly auctionsService: AuctionsService,
    private readonly pubsubService: PubsubService,
    private readonly rabbitmqService: RabbitmqService,
  ) {}

  async afterInit() {
    const pubClient = createClient();
    const subClient = createClient();
    await pubClient.connect();
    await subClient.connect();
    const io = (this.server as any).server || this.server;
    io.adapter(createAdapter(pubClient, subClient));
  }

  handleConnection(_client: Socket) {}

  handleDisconnect(client: Socket) {
    const handlerMap = this.socketHandlers.get(client);
    if (handlerMap) {
      for (const [auctionId, handler] of handlerMap.entries()) {
        void this.pubsubService.unsubscribeBidUpdates(auctionId, handler);
      }
      this.socketHandlers.delete(client);
    }
  }

  @SubscribeMessage('joinAuction')
  async handleJoinAuction(
    @MessageBody() data: { auctionId: number },
    @ConnectedSocket() client: Socket,
  ) {
    await client.join(`auction_${data.auctionId}`);
    let highestBid = await this.pubsubService.getHighestBid(data.auctionId);
    if (!highestBid) {
      const auction = await this.auctionsService.findAuctionById(
        Number(data.auctionId),
      );
      if (auction) {
        highestBid = { currentHighestBid: auction.currentHighestBid };
      }
    }
    if (highestBid) {
      client.emit('bidUpdate', highestBid);
    }
    const handler = (bid: any) => {
      client.emit('bidUpdate', bid);
    };
    await this.pubsubService.subscribeBidUpdates(data.auctionId, handler);
    let handlerMap = this.socketHandlers.get(client);
    if (!handlerMap) {
      handlerMap = new Map();
      this.socketHandlers.set(client, handlerMap);
    }
    handlerMap.set(data.auctionId, handler);
  }

  @SubscribeMessage('placeBid')
  @UseInterceptors(BidThrottleInterceptor)
  async handlePlaceBid(
    @MessageBody() data: CreateBidDto,
    @ConnectedSocket() client: Socket,
  ) {
    const result = await this.auctionsService.placeBid(
      data.auctionId,
      data.userId,
      data.amount,
    );
    if (result.success) {
      await this.rabbitmqService.publishBid(result.bid);
      await this.pubsubService.setHighestBid(data.auctionId, result.bid);
      await this.pubsubService.publishBidUpdate(data.auctionId, result.bid);
      await this.rabbitmqService.publishAudit({ type: 'bid', bid: result.bid });
      await this.rabbitmqService.publishNotification({
        type: 'bid',
        bid: result.bid,
      });
    } else {
      client.emit('bidError', result.message);
    }
  }
  @SubscribeMessage('auctionEnd')
  async handleAuctionEnd(@MessageBody() data: { auctionId: number }) {
    const result = await this.auctionsService.endAuction(data.auctionId);
    await this.rabbitmqService.publishNotification({
      type: 'auctionEnd',
      auction: result,
    });
    await this.rabbitmqService.publishAudit({
      type: 'auctionEnd',
      auction: result,
    });
    this.server.to(`auction_${data.auctionId}`).emit('auctionEnded', result);
  }
  @SubscribeMessage('auctionStart')
  async handleAuctionStart(
    @MessageBody() data: CreateAuctionDto,
    @ConnectedSocket() _client: Socket,
  ) {
    const result = await this.auctionsService.startAuction(data);
    await this.rabbitmqService.publishNotification({
      type: 'auctionStart',
      auction: result,
    });
    await this.rabbitmqService.publishAudit({
      type: 'auctionStart',
      auction: result,
    });
    this.server.to(`auction_${result.id}`).emit('auctionStarted', result);
  }
}
