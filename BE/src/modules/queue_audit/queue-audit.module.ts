import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueJobAuditLog } from './entities/queue-job-audit-log.entity';
import { QueueJobAuditService } from './queue-job-audit.service';

/**
 * Global so any feature module can inject `QueueJobAuditService` without importing this module.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([QueueJobAuditLog])],
  providers: [QueueJobAuditService],
  exports: [QueueJobAuditService],
})
export class QueueAuditModule {}
