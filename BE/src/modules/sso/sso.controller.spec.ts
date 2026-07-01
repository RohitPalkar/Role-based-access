import { Test, TestingModule } from '@nestjs/testing';
import { SsoController } from './sso.controller';
import { SsoService } from './sso.service';
import { CustomConfigService } from 'src/config/custom-config.service';
import { SUCCESS } from 'src/config/constants';
import { RolesEnum } from 'src/enums/roles.enum';
import * as fs from 'fs';
import { OtpThrottleGuard } from 'src/guards/otp-throttle.guard';

describe('SsoController', () => {
  let controller: SsoController;
  let ssoService: jest.Mocked<SsoService>;
  let configService: jest.Mocked<CustomConfigService>;

  const mockRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.type = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SsoController],
      providers: [
        {
          provide: SsoService,
          useValue: {
            generateAuthToken: jest.fn(),
            refreshAuthToken: jest.fn(),
            sendOtp: jest.fn(),
            verifyOtp: jest.fn(),
            resendOtp: jest.fn(),
          },
        },
        {
          provide: CustomConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(OtpThrottleGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = module.get<SsoController>(SsoController);
    ssoService = module.get(SsoService);
    configService = module.get(CustomConfigService);
  });

  describe('getMetadata', () => {
    it('should return metadata XML', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'SSO_ISSUER_URL') return 'issuer';
        if (key === 'SSO_CALLBACK_URL') return 'callback';
        return '';
      });

      jest.spyOn(fs, 'readFileSync').mockReturnValue('mock-cert');

      const res = mockRes();

      controller.getMetadata(res);

      expect(res.type).toHaveBeenCalledWith('application/xml');
      expect(res.status).toHaveBeenCalledWith(SUCCESS);
      expect(res.send).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should exist and be callable', () => {
      expect(controller.login).toBeDefined();
    });
  });

  describe('callback', () => {
    it('should redirect user based on role', async () => {
      jest.spyOn(configService, 'get').mockReturnValue('http://portal');

      ssoService.generateAuthToken.mockResolvedValue({
        statusCode: SUCCESS,
        data: {
          accessToken: 'access',
          refreshToken: 'refresh',
          userRole: RolesEnum.ADMIN,
        },
      });

      const req = { user: { id: 1 } };
      const res = mockRes();

      await controller.callback(req as any, res);

      expect(res.cookie).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith('http://portal/admin/user');
    });

    it('should redirect to 401 on failure', async () => {
      jest.spyOn(configService, 'get').mockReturnValue('http://portal');

      ssoService.generateAuthToken.mockResolvedValue({
        statusCode: 400,
        data: null,
      });

      const req = { user: {} };
      const res = mockRes();

      await controller.callback(req as any, res);

      expect(res.redirect).toHaveBeenCalledWith('http://portal/401');
    });
  });

  describe('refreshAuthToken', () => {
    it('should refresh token', async () => {
      ssoService.refreshAuthToken.mockResolvedValue('new-token');

      const result = await controller.refreshAuthToken('refresh');

      expect(result).toBe('new-token');
      expect(ssoService.refreshAuthToken).toHaveBeenCalledWith('refresh');
    });
  });

  describe('logout', () => {
    it('should clear cookies and return success response', () => {
      const res = mockRes();

      controller.logout({}, res);

      expect(res.clearCookie).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(SUCCESS);
      expect(res.send).toHaveBeenCalled();
    });
  });

  describe('logoutUser', () => {
    it('should clear cookies and redirect', () => {
      jest.spyOn(configService, 'get').mockReturnValue('http://portal');
      const res = mockRes();

      controller.logoutUser({} as any, res);

      expect(res.redirect).toHaveBeenCalledWith('http://portal');
    });
  });

  describe('sendOtp', () => {
    it('should send OTP', async () => {
      ssoService.sendOtp.mockResolvedValue('sent');

      const result = await controller.sendOtp({ email: 'a@test.com' });

      expect(result).toBe('sent');
      expect(ssoService.sendOtp).toHaveBeenCalledWith('a@test.com');
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP', async () => {
      ssoService.verifyOtp.mockResolvedValue('verified');

      const result = await controller.verifyOtp({
        email: 'a@test.com',
        otp: '123456',
      });

      expect(result).toBe('verified');
      expect(ssoService.verifyOtp).toHaveBeenCalledWith('a@test.com', '123456');
    });
  });

  describe('resendOtp', () => {
    it('should resend OTP', async () => {
      ssoService.resendOtp.mockResolvedValue('resent');

      const result = await controller.resendOtp({ email: 'a@test.com' });

      expect(result).toBe('resent');
      expect(ssoService.resendOtp).toHaveBeenCalledWith('a@test.com');
    });
  });
});
