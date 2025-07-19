import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuctionsService } from './auctions.service';

@WebSocketGateway({ namespace: '/auctions', cors: true })
export class AuctionGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly auctionsService: AuctionsService) {}


  afterInit(server: Server) {
    console.log('[AuctionGateway] WebSocket server initialized');
  }


  handleConnection(client: Socket) {
    console.log(`[AuctionGateway] Client connected: ${client.id}`);
  }


  handleDisconnect(client: Socket) {
    console.log(`[AuctionGateway] Client disconnected: ${client.id}`);
  }


  @SubscribeMessage('joinAuction')
  async handleJoinAuction(@MessageBody() data: { auctionId: number }, @ConnectedSocket() client: Socket) {
    console.log(`[AuctionGateway] joinAuction: client=${client.id}, auctionId=${data.auctionId}`);
    await client.join(`auction_${data.auctionId}`);
    // Send current highest bid to the joining client
    const auction = await this.auctionsService.findAuctionById(data.auctionId);
    if (auction) {
      client.emit('bidUpdate', { currentHighestBid: auction.currentHighestBid });
    }
  }


  @SubscribeMessage('placeBid')
  async handlePlaceBid(@MessageBody() data: { auctionId: number; userId: number; amount: number }, @ConnectedSocket() client: Socket) {
    console.log(`[AuctionGateway] placeBid: client=${client.id}, auctionId=${data.auctionId}, userId=${data.userId}, amount=${data.amount}`);
    const result = await this.auctionsService.placeBid(data.auctionId, data.userId, data.amount);
    if (result.success) {
      // Only emit to users in the auction room
      this.server.to(`auction_${data.auctionId}`).emit('bidUpdate', result.bid);
    } else {
      client.emit('bidError', result.message);
    }
  }


  @SubscribeMessage('auctionEnd')
  async handleAuctionEnd(@MessageBody() data: { auctionId: number }) {
    console.log(`[AuctionGateway] auctionEnd: auctionId=${data.auctionId}`);
    const result = await this.auctionsService.endAuction(data.auctionId);
    this.server.to(`auction_${data.auctionId}`).emit('auctionEnded', result);
  }
}
