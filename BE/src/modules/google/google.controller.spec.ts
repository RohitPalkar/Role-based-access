import { Test, TestingModule } from '@nestjs/testing';
import { GoogleController } from './google.controller';
import { GoogleService } from './google.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { TEST_EXECUTION_TIME } from 'src/config/constants';

describe('GoogleController', () => {
  let controller: GoogleController;
  let googleService: jest.Mocked<GoogleService>;

  beforeEach(async () => {
    const mockGoogleService = {
      getAutocomplete: jest.fn(),
      getAddressDetails: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoogleController],
      providers: [{ provide: GoogleService, useValue: mockGoogleService }],
    }).compile();

    controller = module.get<GoogleController>(GoogleController);
    googleService = module.get(GoogleService);
  });

  afterEach(() => jest.clearAllMocks());

  /**
   * AUTOCOMPLETE TESTS
   */
  describe('GET /google/autocomplete', () => {
    it('should return success response from service', async () => {
      const mockResponse = {
        statusCode: 200,
        data: [{ description: 'Delhi', placeId: 'abc123' }],
        message: 'Address suggestions fetched successfully',
      };
      googleService.getAutocomplete.mockResolvedValueOnce(mockResponse);

      const startTime = Date.now();
      const result = await controller.autocomplete('Delhi');
      const responseTime = Date.now() - startTime;

      expect(result).toEqual(mockResponse);
      expect(googleService.getAutocomplete).toHaveBeenCalledWith('Delhi');
      expect(responseTime).toBeLessThan(100); // should be very fast
    });

    it('should handle service error gracefully', async () => {
      googleService.getAutocomplete.mockRejectedValueOnce(
        new HttpException('Google API failed', HttpStatus.BAD_GATEWAY),
      );

      const startTime = Date.now();
      try {
        await controller.autocomplete('Delhi');
        fail('Expected an exception but none was thrown');
      } catch (error) {
        const responseTime = Date.now() - startTime;
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
        expect(responseTime).toBeLessThan(TEST_EXECUTION_TIME);
      }
    });
  });

  /**
   * ADDRESS DETAILS TESTS
   */
  describe('GET /google/address-details/:placeId', () => {
    it('should return address details successfully', async () => {
      const mockResponse = {
        statusCode: 200,
        data: {
          areaName: 'New Delhi, India',
          city: 'Delhi',
          state: 'Delhi',
          country: 'India',
          pinCode: '110001',
        },
        message: 'Address details fetched successfully',
      };
      googleService.getAddressDetails.mockResolvedValueOnce(mockResponse);

      const startTime = Date.now();
      const result = await controller.getAddressDetails('abc123');
      const responseTime = Date.now() - startTime;

      expect(result).toEqual(mockResponse);
      expect(googleService.getAddressDetails).toHaveBeenCalledWith('abc123');
      expect(responseTime).toBeLessThan(100);
    });

    it('should throw exception when service fails', async () => {
      googleService.getAddressDetails.mockRejectedValueOnce(
        new HttpException(
          'Failed to fetch address details',
          HttpStatus.BAD_GATEWAY,
        ),
      );

      const startTime = Date.now();
      try {
        await controller.getAddressDetails('xyz987');
        fail('Expected exception not thrown');
      } catch (error) {
        const responseTime = Date.now() - startTime;
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
        expect(responseTime).toBeLessThan(TEST_EXECUTION_TIME);
      }
    });
  });
});
