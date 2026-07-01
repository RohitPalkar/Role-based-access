import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandsService } from './brands.service';
import { BrandsController } from './brands.controller';
import { Brands } from './entities/brand.entity';
import { Users } from '../../../entities/index';

@Module({
  imports: [TypeOrmModule.forFeature([Brands, Users])],
  controllers: [BrandsController],
  providers: [BrandsService],
  exports: [BrandsService],
})
export class BrandsModule {}
