import { Test, TestingModule } from '@nestjs/testing';
import { SfdcLogsController } from './sfdc_logs.controller';
import { SfdcLogsService } from './sfdc_logs.service';
import { EventMessagesEnum } from 'src/enums/event-messages.enum';
import { SaveSFDCLogsPayload } from './interfaces/save-logs.interface';
import { SfdcLogs } from './entities/sfdc_logs.entity';
import { TEST_EXECUTION_TIME } from 'src/config/constants';

describe('SfdcLogsController', () => {
  let controller: SfdcLogsController;
  let sfdcLogsService: SfdcLogsService;

  const mockSfdcLogsService = {
    saveSFDCLogs: jest.fn(),
    getSfdcLogs: jest.fn(),
    getSfdcLogById: jest.fn(),
  };

  const mockSfdcLogData: SfdcLogs = {
    id: 1,
    opportunityId: 'OPP123456',
    entityType: 'Bookings',
    batchId: 'batch-001',
    attemptNo: 1,
    logEvent: EventMessagesEnum.OPP_UPDATED,
    payload: {
      opportunityId: 'OPP123456',
      status: 'updated',
      changes: {
        amount: 500000,
        stage: 'Proposal/Price Quote',
      },
    },
    response: {
      success: true,
      sfdcId: 'SFDC789',
      message: 'Opportunity updated successfully',
    },
    status: 'success',
    createdAt: new Date('2025-01-15T10:30:00Z'),
    modifiedAt: new Date('2025-01-15T10:30:00Z'),
  };

  const mockSaveSFDCLogsPayload: SaveSFDCLogsPayload = {
    opportunityId: 'OPP123456',
    logEvent: EventMessagesEnum.OPP_UPDATED,
    payload: {
      opportunityId: 'OPP123456',
      status: 'updated',
      changes: {
        amount: 500000,
        stage: 'Proposal/Price Quote',
      },
    },
    response: {
      success: true,
      sfdcId: 'SFDC789',
      message: 'Opportunity updated successfully',
    },
    status: 'success',
  };

  const mockGetSfdcLogsResponse = {
    message: 'SFDC logs fetched successfully.',
    data: {
      count: 1,
      referrals: [mockSfdcLogData],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SfdcLogsController],
      providers: [
        {
          provide: SfdcLogsService,
          useValue: mockSfdcLogsService,
        },
      ],
    }).compile();

    controller = module.get<SfdcLogsController>(SfdcLogsController);
    sfdcLogsService = module.get<SfdcLogsService>(SfdcLogsService);

    jest.clearAllMocks();
  });

  describe('handleLogsCreatedEvent', () => {
    it('should handle logs created event successfully (success + response time)', async () => {
      mockSfdcLogsService.saveSFDCLogs.mockResolvedValue(undefined);

      const start = Date.now();
      await controller.handleLogsCreatedEvent(mockSaveSFDCLogsPayload);
      const duration = Date.now() - start;

      expect(sfdcLogsService.saveSFDCLogs).toHaveBeenCalledWith(
        mockSaveSFDCLogsPayload,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle logs created event with different log events (success + response time)', async () => {
      const leadCreatedPayload: SaveSFDCLogsPayload = {
        ...mockSaveSFDCLogsPayload,
        logEvent: EventMessagesEnum.LEAD_CREATED,
        payload: {
          leadId: 'LEAD123',
          name: 'John Doe',
          email: 'john@example.com',
        },
        response: {
          success: true,
          sfdcLeadId: 'SFDC_LEAD456',
        },
        status: 'success',
      };

      mockSfdcLogsService.saveSFDCLogs.mockResolvedValue(undefined);

      const start = Date.now();
      await controller.handleLogsCreatedEvent(leadCreatedPayload);
      const duration = Date.now() - start;

      expect(sfdcLogsService.saveSFDCLogs).toHaveBeenCalledWith(
        leadCreatedPayload,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle logs created event with OPP_PUSH_TO_SFDC event (success + response time)', async () => {
      const oppPushPayload: SaveSFDCLogsPayload = {
        ...mockSaveSFDCLogsPayload,
        logEvent: EventMessagesEnum.OPP_PUSH_TO_SFDC,
        payload: {
          opportunityId: 'OPP123456',
          action: 'push_to_sfdc',
          data: {
            name: 'Test Opportunity',
            amount: 500000,
          },
        },
        response: {
          success: true,
          sfdcId: 'SFDC789',
        },
        status: 'success',
      };

      mockSfdcLogsService.saveSFDCLogs.mockResolvedValue(undefined);

      const start = Date.now();
      await controller.handleLogsCreatedEvent(oppPushPayload);
      const duration = Date.now() - start;

      expect(sfdcLogsService.saveSFDCLogs).toHaveBeenCalledWith(oppPushPayload);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle different event types correctly', async () => {
      const eventTypes = [
        EventMessagesEnum.OPP_UPDATED,
        EventMessagesEnum.OPP_PUSH_TO_SFDC,
        EventMessagesEnum.LEAD_CREATED,
        EventMessagesEnum.CREATE_SFDC_LOG,
        EventMessagesEnum.FORM_AMENDMENT_REQUEST,
        EventMessagesEnum.GET_INCENTIVE_POLICY,
        EventMessagesEnum.CREATE_NOTIFICATIONS,
        EventMessagesEnum.SEND_EMAIL,
        EventMessagesEnum.FETCH_FILE_FROM_S3,
        EventMessagesEnum.SV_FORM,
        EventMessagesEnum.CREATE_ACTIVITY_LOG,
      ];

      mockSfdcLogsService.saveSFDCLogs.mockResolvedValue(undefined);

      for (const eventType of eventTypes) {
        const payload: SaveSFDCLogsPayload = {
          ...mockSaveSFDCLogsPayload,
          logEvent: eventType,
        };

        await controller.handleLogsCreatedEvent(payload);
        expect(sfdcLogsService.saveSFDCLogs).toHaveBeenCalledWith(payload);
      }

      expect(sfdcLogsService.saveSFDCLogs).toHaveBeenCalledTimes(
        eventTypes.length,
      );
    });

    it('should handle different status values (success + response time)', async () => {
      const statuses = ['success', 'error', 'pending', 'failed', 'retry'];

      mockSfdcLogsService.saveSFDCLogs.mockResolvedValue(undefined);

      for (const status of statuses) {
        const payload: SaveSFDCLogsPayload = {
          ...mockSaveSFDCLogsPayload,
          status,
        };

        const start = Date.now();
        await controller.handleLogsCreatedEvent(payload);
        const duration = Date.now() - start;

        expect(sfdcLogsService.saveSFDCLogs).toHaveBeenCalledWith(payload);
        expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
      }
    });

    it('should handle complex nested payload structures (success + response time)', async () => {
      const complexPayload: SaveSFDCLogsPayload = {
        opportunityId: 'OPP123456',
        logEvent: EventMessagesEnum.OPP_UPDATED,
        payload: {
          opportunityId: 'OPP123456',
          status: 'updated',
          changes: {
            amount: 500000,
            stage: 'Proposal/Price Quote',
            contacts: [
              {
                id: 1,
                name: 'John Doe',
                email: 'john@example.com',
                phone: '+1234567890',
                address: {
                  street: '123 Main St',
                  city: 'New York',
                  state: 'NY',
                  zipCode: '10001',
                  country: 'USA',
                },
              },
            ],
            products: [
              {
                id: 'PROD001',
                name: 'Product A',
                quantity: 2,
                price: 250000,
                specifications: {
                  color: 'Blue',
                  size: 'Large',
                  material: 'Steel',
                },
              },
            ],
            metadata: {
              source: 'web',
              userAgent: 'Mozilla/5.0...',
              timestamp: new Date().toISOString(),
              version: '1.0.0',
            },
          },
        },
        response: {
          success: true,
          sfdcId: 'SFDC789',
          message: 'Opportunity updated successfully',
          warnings: ['Minor validation warning'],
          errors: [],
        },
        status: 'success',
      };

      mockSfdcLogsService.saveSFDCLogs.mockResolvedValue(undefined);

      const start = Date.now();
      await controller.handleLogsCreatedEvent(complexPayload);
      const duration = Date.now() - start;

      expect(sfdcLogsService.saveSFDCLogs).toHaveBeenCalledWith(complexPayload);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle very large payload data (success + response time)', async () => {
      const largePayload: SaveSFDCLogsPayload = {
        opportunityId: 'OPP123456',
        logEvent: EventMessagesEnum.OPP_UPDATED,
        payload: {
          opportunityId: 'OPP123456',
          status: 'updated',
          changes: {
            amount: 500000,
            stage: 'Proposal/Price Quote',
            description: 'A'.repeat(10000), // Large description
            customFields: Array.from({ length: 100 }, (_, i) => ({
              field: `customField${i}`,
              value: `value${i}`.repeat(100),
            })),
          },
        },
        response: {
          success: true,
          sfdcId: 'SFDC789',
          message: 'Opportunity updated successfully',
        },
        status: 'success',
      };

      mockSfdcLogsService.saveSFDCLogs.mockResolvedValue(undefined);

      const start = Date.now();
      await controller.handleLogsCreatedEvent(largePayload);
      const duration = Date.now() - start;

      expect(sfdcLogsService.saveSFDCLogs).toHaveBeenCalledWith(largePayload);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle special characters in opportunity ID (success + response time)', async () => {
      const specialCharPayload: SaveSFDCLogsPayload = {
        ...mockSaveSFDCLogsPayload,
        opportunityId: 'OPP-123_456@#$%',
      };

      mockSfdcLogsService.saveSFDCLogs.mockResolvedValue(undefined);

      const start = Date.now();
      await controller.handleLogsCreatedEvent(specialCharPayload);
      const duration = Date.now() - start;

      expect(sfdcLogsService.saveSFDCLogs).toHaveBeenCalledWith(
        specialCharPayload,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle concurrent event processing (success + response time)', async () => {
      const payloads = Array.from({ length: 5 }, (_, i) => ({
        ...mockSaveSFDCLogsPayload,
        opportunityId: `OPP${i + 1}`,
      }));

      mockSfdcLogsService.saveSFDCLogs.mockResolvedValue(undefined);

      const start = Date.now();
      const promises = payloads.map((payload) =>
        controller.handleLogsCreatedEvent(payload),
      );
      await Promise.all(promises);
      const duration = Date.now() - start;

      expect(sfdcLogsService.saveSFDCLogs).toHaveBeenCalledTimes(5);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME * 2); // Allow more time for concurrent operations
    });
  });

  describe('getSfdcLogs', () => {
    it('should return SFDC logs successfully (success + response time)', async () => {
      mockSfdcLogsService.getSfdcLogs.mockResolvedValue(
        mockGetSfdcLogsResponse,
      );

      const start = Date.now();
      const mockQueryDto = { page: 1, limit: 10 };
      const result = await controller.getSfdcLogs(mockQueryDto);
      const duration = Date.now() - start;

      expect(result).toEqual(mockGetSfdcLogsResponse);
      expect(sfdcLogsService.getSfdcLogs).toHaveBeenCalledWith(mockQueryDto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should return empty logs when no data exists (success + response time)', async () => {
      const emptyResponse = {
        message: 'SFDC logs fetched successfully.',
        data: {
          count: 0,
          referrals: [],
        },
      };

      mockSfdcLogsService.getSfdcLogs.mockResolvedValue(emptyResponse);

      const start = Date.now();
      const mockQueryDto = { page: 1, limit: 10 };
      const result = await controller.getSfdcLogs(mockQueryDto);
      const duration = Date.now() - start;

      expect(result).toEqual(emptyResponse);
      expect(result.data.count).toBe(0);
      expect(result.data.referrals).toHaveLength(0);
      expect(sfdcLogsService.getSfdcLogs).toHaveBeenCalledWith(mockQueryDto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should return multiple logs successfully (success + response time)', async () => {
      const multipleLogsResponse = {
        message: 'SFDC logs fetched successfully.',
        data: {
          count: 3,
          referrals: [
            mockSfdcLogData,
            {
              ...mockSfdcLogData,
              id: 2,
              opportunityId: 'OPP789012',
              logEvent: EventMessagesEnum.LEAD_CREATED,
            },
            {
              ...mockSfdcLogData,
              id: 3,
              opportunityId: 'OPP345678',
              logEvent: EventMessagesEnum.OPP_PUSH_TO_SFDC,
            },
          ],
        },
      };

      mockSfdcLogsService.getSfdcLogs.mockResolvedValue(multipleLogsResponse);

      const start = Date.now();
      const mockQueryDto = { page: 1, limit: 10 };
      const result = await controller.getSfdcLogs(mockQueryDto);
      const duration = Date.now() - start;

      expect(result).toEqual(multipleLogsResponse);
      expect(result.data.count).toBe(3);
      expect(result.data.referrals).toHaveLength(3);
      expect(sfdcLogsService.getSfdcLogs).toHaveBeenCalledWith(mockQueryDto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle large dataset retrieval efficiently', async () => {
      const largeDatasetResponse = {
        message: 'SFDC logs fetched successfully.',
        data: {
          count: 1000,
          referrals: Array.from({ length: 1000 }, (_, i) => ({
            ...mockSfdcLogData,
            id: i + 1,
            opportunityId: `OPP${i + 1}`,
          })),
        },
      };

      mockSfdcLogsService.getSfdcLogs.mockResolvedValue(largeDatasetResponse);

      const start = Date.now();
      const mockQueryDto = { page: 1, limit: 10 };
      const result = await controller.getSfdcLogs(mockQueryDto);
      const duration = Date.now() - start;

      expect(result.data.count).toBe(1000);
      expect(result.data.referrals).toHaveLength(1000);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME * 2); // Allow more time for large dataset
    });

    it('should maintain consistent performance across multiple calls', async () => {
      mockSfdcLogsService.getSfdcLogs.mockResolvedValue(
        mockGetSfdcLogsResponse,
      );

      const durations: number[] = [];

      // Make 5 calls and measure each duration
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        const mockQueryDto = { page: 1, limit: 10 };
        await controller.getSfdcLogs(mockQueryDto);
        const duration = Date.now() - start;
        durations.push(duration);
      }

      // All calls should complete within acceptable time
      durations.forEach((duration) => {
        expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
      });

      // Performance should be consistent (no significant variance)
      const avgDuration =
        durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);

      expect(maxDuration - minDuration).toBeLessThan(TEST_EXECUTION_TIME / 2); // Variance should be reasonable
      expect(avgDuration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('Integration Test Scenarios', () => {
    it('should handle complete workflow: create logs -> retrieve logs', async () => {
      // Create logs
      mockSfdcLogsService.saveSFDCLogs.mockResolvedValue(undefined);
      await controller.handleLogsCreatedEvent(mockSaveSFDCLogsPayload);

      // Retrieve logs
      mockSfdcLogsService.getSfdcLogs.mockResolvedValue(
        mockGetSfdcLogsResponse,
      );
      const mockQueryDto = { page: 1, limit: 10 };
      const result = await controller.getSfdcLogs(mockQueryDto);

      expect(sfdcLogsService.saveSFDCLogs).toHaveBeenCalledWith(
        mockSaveSFDCLogsPayload,
      );
      expect(sfdcLogsService.getSfdcLogs).toHaveBeenCalled();
      expect(result).toEqual(mockGetSfdcLogsResponse);
    });

    it('should handle rapid successive calls', async () => {
      mockSfdcLogsService.saveSFDCLogs.mockResolvedValue(undefined);

      const start = Date.now();

      // Make 10 rapid successive calls
      const promises = Array.from({ length: 10 }, (_, i) =>
        controller.handleLogsCreatedEvent({
          ...mockSaveSFDCLogsPayload,
          opportunityId: `OPP${i + 1}`,
        }),
      );

      await Promise.all(promises);
      const duration = Date.now() - start;

      expect(sfdcLogsService.saveSFDCLogs).toHaveBeenCalledTimes(10);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME * 3); // Allow more time for multiple operations
    });
  });

  describe('Performance and Response Time Tests', () => {
    it('should complete all operations within acceptable time limits', async () => {
      mockSfdcLogsService.saveSFDCLogs.mockResolvedValue(undefined);
      mockSfdcLogsService.getSfdcLogs.mockResolvedValue(
        mockGetSfdcLogsResponse,
      );

      const start = Date.now();

      // Execute all operations
      await controller.handleLogsCreatedEvent(mockSaveSFDCLogsPayload);
      const mockQueryDto = { page: 1, limit: 10 };
      await controller.getSfdcLogs(mockQueryDto);

      const duration = Date.now() - start;

      // All operations should complete within 2 seconds
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME * 2);
    });
  });

  describe('Data Validation Tests', () => {
    it('should handle payload with all required fields', async () => {
      const completePayload: SaveSFDCLogsPayload = {
        opportunityId: 'OPP123456',
        logEvent: EventMessagesEnum.OPP_UPDATED,
        payload: {
          opportunityId: 'OPP123456',
          status: 'updated',
        },
        response: {
          success: true,
          sfdcId: 'SFDC789',
        },
        status: 'success',
      };

      mockSfdcLogsService.saveSFDCLogs.mockResolvedValue(undefined);

      await controller.handleLogsCreatedEvent(completePayload);
      expect(sfdcLogsService.saveSFDCLogs).toHaveBeenCalledWith(
        completePayload,
      );
    });

    it('should handle payload with optional fields as null', async () => {
      const payloadWithNulls: SaveSFDCLogsPayload = {
        opportunityId: 'OPP123456',
        logEvent: EventMessagesEnum.OPP_UPDATED,
        payload: null,
        response: null,
        status: 'success',
      };

      mockSfdcLogsService.saveSFDCLogs.mockResolvedValue(undefined);

      await controller.handleLogsCreatedEvent(payloadWithNulls);
      expect(sfdcLogsService.saveSFDCLogs).toHaveBeenCalledWith(
        payloadWithNulls,
      );
    });

    it('should handle payload with empty objects', async () => {
      const payloadWithEmptyObjects: SaveSFDCLogsPayload = {
        opportunityId: 'OPP123456',
        logEvent: EventMessagesEnum.OPP_UPDATED,
        payload: {},
        response: {},
        status: 'success',
      };

      mockSfdcLogsService.saveSFDCLogs.mockResolvedValue(undefined);

      await controller.handleLogsCreatedEvent(payloadWithEmptyObjects);
      expect(sfdcLogsService.saveSFDCLogs).toHaveBeenCalledWith(
        payloadWithEmptyObjects,
      );
    });
  });

  describe('getSfdcLogById', () => {
    it('should return specific SFDC log by logId', async () => {
      const logId = 123456;
      const expected = {
        message: 'SFDC log retrieved successfully.',
        data: mockSfdcLogData,
      };

      mockSfdcLogsService.getSfdcLogById.mockResolvedValue(expected);

      const result = await controller.getSfdcLogById(logId);

      expect(result).toEqual(expected);
      expect(sfdcLogsService.getSfdcLogById).toHaveBeenCalledWith(logId);
    });

    it('should propagate service errors', async () => {
      const logId = 123456;
      const error = new Error('Not found');
      mockSfdcLogsService.getSfdcLogById.mockRejectedValue(error);

      await expect(controller.getSfdcLogById(logId)).rejects.toThrow(error);
      expect(sfdcLogsService.getSfdcLogById).toHaveBeenCalledWith(logId);
    });
  });
});
