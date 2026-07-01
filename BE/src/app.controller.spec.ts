import { AppController } from './app.controller';
import { compressImage } from './utils/image.utils';
import { ImageCompression } from './enums/image-compression.enum';

jest.mock('./utils/image.utils', () => ({
  compressImage: jest.fn(),
}));

describe('AppController', () => {
  let controller: AppController;
  const mockedCompressImage = compressImage as jest.MockedFunction<
    typeof compressImage
  >;

  beforeEach(() => {
    controller = new AppController();
    jest.clearAllMocks();
  });

  describe('checkHealth', () => {
    it('should return service up payload with ISO timestamp', () => {
      const result = controller.checkHealth();
      expect(result).toHaveProperty('message', 'Api service is up and running');
      expect(result).toHaveProperty('data');
      expect(typeof result.data.timestamp).toBe('string');
      // timestamp should be a valid ISO date
      expect(!Number.isNaN(Date.parse(result.data.timestamp))).toBe(true);
    });
  });

  describe('sentryTest', () => {
    it('should throw an error when called', () => {
      expect(() => controller.sentryTest()).toThrow('My first Sentry error!');
    });
  });

  describe('compressImage', () => {
    const sampleBuffer = Buffer.from('sample-image-bytes');
    const sampleFile: any = {
      buffer: sampleBuffer,
      originalname: 'test.png',
    };

    function createMockResponse() {
      const jsonMock = jest.fn();
      const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
      const res: any = {
        status: statusMock,
      };
      return { res, statusMock, jsonMock };
    }

    it('should compress image with provided width/height and return base64 payload', async () => {
      // Arrange
      const compressedBuffer = Buffer.from('compressed-bytes');
      mockedCompressImage.mockResolvedValueOnce(compressedBuffer);

      const { res, statusMock, jsonMock } = createMockResponse();

      const body = { width: '100', height: '50' };

      // Act
      const result = await controller.compressImage(sampleFile, body, res);

      // Assert
      expect(mockedCompressImage).toHaveBeenCalledTimes(1);
      expect(mockedCompressImage).toHaveBeenCalledWith(sampleBuffer, 100, 50);

      const expectedBase64 = compressedBuffer.toString('base64');

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        filename: 'test.jpeg',
        success: true,
        message: 'Image compressed successfully',
        data: expectedBase64,
      });

      // controller returns whatever res.status(...).json(...) returned; ensure that value is returned
      expect(result).toBeUndefined(); // The controller returns the Response json call return; our mock returns undefined
    });

    it('should use default width/height when body not provided or invalid', async () => {
      // Arrange
      const compressedBuffer = Buffer.from('compressed-default');
      mockedCompressImage.mockResolvedValueOnce(compressedBuffer);

      const { res, statusMock, jsonMock } = createMockResponse();

      // body missing width/height (empty object)
      const body = {};

      // Act
      await controller.compressImage(sampleFile, body as any, res);

      // Assert: it should call compressImage with defaults from ImageCompression enum
      expect(mockedCompressImage).toHaveBeenCalledWith(
        sampleBuffer,
        ImageCompression.width,
        ImageCompression.height,
      );

      const expectedBase64 = compressedBuffer.toString('base64');

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        filename: 'test.jpeg',
        success: true,
        message: 'Image compressed successfully',
        data: expectedBase64,
      });
    });

    it('should throw if compressImage util throws', async () => {
      // Arrange
      const err = new Error('compression failed');
      mockedCompressImage.mockRejectedValueOnce(err);

      const { res } = createMockResponse();

      const body = { width: '10', height: '10' };

      // Act & Assert
      await expect(
        controller.compressImage(sampleFile, body, res),
      ).rejects.toThrow('compression failed');

      // ensure response not called due to thrown error
      expect((res as any).status).not.toHaveBeenCalled();
    });

    it('should throw if file is missing', async () => {
      const { res } = createMockResponse();
      // Act & Assert
      await expect(
        //intentionally pass undefined to simulate missing file
        controller.compressImage(undefined, {}, res),
      ).rejects.toThrow();
    });
  });
});
