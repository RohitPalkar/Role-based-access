import { Module } from '@nestjs/common';
import { LeaderBoardController } from './leaderboard.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from '../../users/entities/user.entity';
import { HttpModule } from '@nestjs/axios';
import { LeaderBoardService } from './leaderboard.service';
import { Role } from '../../roles/entities/roles.entity';
import { IncentiveBooking } from 'src/entities';
import { AwsService } from '../../aws/aws.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Users, Role, IncentiveBooking]),
    HttpModule,
  ],
  controllers: [LeaderBoardController],
  providers: [LeaderBoardService, AwsService],
  exports: [LeaderBoardService],
})
export class LeaderBoardModule {}
