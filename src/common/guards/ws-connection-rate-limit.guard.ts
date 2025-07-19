import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Socket } from 'socket.io';

// In-memory store for connection counts per IP
const connectionCounts: Record<string, number> = {};
const MAX_CONNECTIONS_PER_IP = 5; // Adjust as needed

@Injectable()
export class WsConnectionRateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const ip = client.handshake.address;
    connectionCounts[ip] = (connectionCounts[ip] || 0) + 1;
    if (connectionCounts[ip] > MAX_CONNECTIONS_PER_IP) {
      client.disconnect(true);
      return false;
    }
    // Clean up on disconnect
    client.on('disconnect', () => {
      connectionCounts[ip] = Math.max((connectionCounts[ip] || 1) - 1, 0);
    });
    return true;
  }
}
