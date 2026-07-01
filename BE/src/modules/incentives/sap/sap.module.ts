import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { SapService } from './sap.service';

@Module({
  imports: [
    HttpModule, // Import HttpModule to make API calls
    ConfigModule, // Import ConfigModule to load environment variables
  ],
  providers: [SapService], // Provide SapService for DI
  exports: [SapService], // Export SapService for use in other modules
})
export class SapModule {}
