import { Test, TestingModule } from '@nestjs/testing';
import { UserActivityLogsController } from './user_activity_logs.controller';
import { UserActivityLogService } from './user_activity_logs.service';

describe('UserActivityLogsController', () => {
  let controller: UserActivityLogsController;
  let service: UserActivityLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserActivityLogsController],
      providers: [
        {
          provide: UserActivityLogService,
          useValue: {
            getLogsByUser: jest.fn().mockResolvedValue([]), // mock only what's used
          },
        },
      ],
    }).compile();

    controller = module.get<UserActivityLogsController>(
      UserActivityLogsController,
    );
    service = module.get<UserActivityLogService>(UserActivityLogService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service.getLogsByUser', async () => {
    await controller.getLogs(1);
    expect(service.getLogsByUser).toHaveBeenCalledWith(1);
  });
});
