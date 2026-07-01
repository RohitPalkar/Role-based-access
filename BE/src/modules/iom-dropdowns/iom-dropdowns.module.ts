import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProjectUserMapping } from 'src/entities';
import { IomStatus } from '../iom/entities/iom-status.entity';

import { IomDropdownController } from './iom-dropdowns.controller';
import { IomDropdownService } from './iom-dropdowns.service';

/**
 * Standalone module exposing IOM-related dropdowns.
 *
 * Decoupled from `IomModule` so screens that only need catalog reads
 * (e.g. filters, form pickers) don't drag in the heavier IOM service
 * graph.
 *
 * Registered entities:
 *  - `IomStatus`         - read live from `iom_statuses` for the
 *                          `IomStatus` dropdown.
 *  - `ProjectUserMapping`- used to scope the `projects` dropdown to
 *                          the authenticated user (matches the same
 *                          source-of-truth as `IomListingService`).
 *
 * Both entities are owned by other modules and consumed here as
 * read-only masters.
 */
@Module({
  imports: [TypeOrmModule.forFeature([IomStatus, ProjectUserMapping])],
  controllers: [IomDropdownController],
  providers: [IomDropdownService],
  exports: [IomDropdownService],
})
export class IomDropdownsModule {}
