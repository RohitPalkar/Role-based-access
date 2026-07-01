import { Module } from '@nestjs/common';
import { WsPublisherService } from './ws_publisher.service';

@Module({
  providers: [WsPublisherService],
})
export class WsPublisherModule {}
