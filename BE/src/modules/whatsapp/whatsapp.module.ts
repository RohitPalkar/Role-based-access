import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { WhatsappListener } from './whatsapp.listener';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [WhatsappService, WhatsappListener],
})
export class WhatsappModule {}
