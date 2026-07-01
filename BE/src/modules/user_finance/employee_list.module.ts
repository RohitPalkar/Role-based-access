import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from '../users/entities/user.entity';
import { Role, UserFinances } from 'src/entities';
import { EmployeeListService } from './employee_list.service';
import { EmployeeListController } from './employee_list.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Users, UserFinances, Role])],
  providers: [EmployeeListService],
  controllers: [EmployeeListController],
  exports: [EmployeeListService],
})
export class UserFinanceModule {}
