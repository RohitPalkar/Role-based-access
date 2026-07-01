import { LeaderBoardController } from './leaderboard.controller';

describe('LeaderBoardController', () => {
  let controller: LeaderBoardController;

  const mockLeaderBoardService = {
    getHighestUnitsSold: jest.fn(),
    getMostEfficientRMs: jest.fn(),
    getHighestRevenue: jest.fn(),
    exportRmSummary: jest.fn(),
    getRmSummary: jest.fn(),
    getTopPerformers: jest.fn(),
    getTopTenRm: jest.fn(),
    getCancellationsData: jest.fn(),
  };

  beforeEach(() => {
    // reset mocks
    Object.values(mockLeaderBoardService).forEach((fn: any) => fn.mockReset());
    controller = new LeaderBoardController(mockLeaderBoardService as any);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHighestUnitsSold', () => {
    it('should call service.getHighestUnitsSold with provided financialYear', async () => {
      mockLeaderBoardService.getHighestUnitsSold.mockResolvedValue([{ id: 1 }]);
      const res = await controller.getHighestUnitsSold('2024-2025');
      expect(res).toEqual([{ id: 1 }]);
      expect(mockLeaderBoardService.getHighestUnitsSold).toHaveBeenCalledWith(
        '2024-2025',
      );
    });

    it('should call service.getHighestUnitsSold with undefined when not provided', async () => {
      mockLeaderBoardService.getHighestUnitsSold.mockResolvedValue([]);
      await controller.getHighestUnitsSold(undefined);
      expect(mockLeaderBoardService.getHighestUnitsSold).toHaveBeenCalledWith(
        undefined,
      );
    });
  });

  describe('getMostEfficientRMs', () => {
    it('should call service.getMostEfficientRMs with provided financialYear', async () => {
      mockLeaderBoardService.getMostEfficientRMs.mockResolvedValue([{ id: 2 }]);
      const res = await controller.getMostEfficientRMs('2024-2025');
      expect(res).toEqual([{ id: 2 }]);
      expect(mockLeaderBoardService.getMostEfficientRMs).toHaveBeenCalledWith(
        '2024-2025',
      );
    });
  });

  describe('getHighestRevenue', () => {
    it('should call service.getHighestRevenue with provided financialYear', async () => {
      mockLeaderBoardService.getHighestRevenue.mockResolvedValue([{ r: 1 }]);
      const res = await controller.getHighestRevenue('2024-2025');
      expect(res).toEqual([{ r: 1 }]);
      expect(mockLeaderBoardService.getHighestRevenue).toHaveBeenCalledWith(
        '2024-2025',
      );
    });
  });

  describe('getRmSummary', () => {
    it('should call exportRmSummary when isExcel is true and parse dates', async () => {
      const query: any = {
        page: 1,
        limit: 10,
        unitStatus: 'QUALIFIED',
        brandId: 5,
        cityIds: '1,2',
        projectIds: '3',
        startDate: '2025-04-01',
        endDate: '2025-04-30',
        search: 'abc',
        isExcel: true,
      };
      const parsedStart = new Date(query.startDate);
      const parsedEnd = new Date(query.endDate);

      mockLeaderBoardService.exportRmSummary.mockResolvedValue({ ok: true });

      const res = await controller.getRmSummary(query);
      expect(res).toEqual({ ok: true });
      expect(mockLeaderBoardService.exportRmSummary).toHaveBeenCalledWith({
        unitStatus: query.unitStatus,
        brandId: query.brandId,
        cityIds: query.cityIds,
        projectIds: query.projectIds,
        startDate: parsedStart,
        endDate: parsedEnd,
        search: query.search,
        isExcel: true,
      });
    });

    it('should call getRmSummary when isExcel is false and include pagination and parse dates', async () => {
      const query: any = {
        page: 2,
        limit: 25,
        unitStatus: 'REGULARIZED',
        brandId: 6,
        cityIds: '10,11',
        projectIds: '7,8',
        startDate: '2025-05-01',
        endDate: '2025-05-31',
        search: 'term',
        isExcel: false,
      };
      const parsedStart = new Date(query.startDate);
      const parsedEnd = new Date(query.endDate);

      mockLeaderBoardService.getRmSummary.mockResolvedValue({
        data: [],
        total: 0,
      });

      const res = await controller.getRmSummary(query);
      expect(res).toEqual({ data: [], total: 0 });
      expect(mockLeaderBoardService.getRmSummary).toHaveBeenCalledWith({
        unitStatus: query.unitStatus,
        brandId: query.brandId,
        cityIds: query.cityIds,
        projectIds: query.projectIds,
        startDate: parsedStart,
        endDate: parsedEnd,
        search: query.search,
        isExcel: false,
        page: query.page,
        limit: query.limit,
      });
    });

    it('should handle missing dates and pass undefined for start/end', async () => {
      const query: any = {
        page: 1,
        limit: 10,
        isExcel: false,
      };
      mockLeaderBoardService.getRmSummary.mockResolvedValue({ data: [] });
      await controller.getRmSummary(query);
      expect(mockLeaderBoardService.getRmSummary).toHaveBeenCalledWith({
        unitStatus: undefined,
        brandId: undefined,
        cityIds: undefined,
        projectIds: undefined,
        startDate: undefined,
        endDate: undefined,
        search: undefined,
        isExcel: false,
        page: 1,
        limit: 10,
      });
    });
  });

  describe('getTopPerformers', () => {
    it('should call service.getTopPerformers with dto values', async () => {
      const query: any = {
        type: 'brand',
        id: 5,
        page: 1,
        limit: 10,
        financialYear: '2024-2025',
      };
      mockLeaderBoardService.getTopPerformers.mockResolvedValue([{ t: 1 }]);
      const res = await controller.getTopPerformers(query);
      expect(res).toEqual([{ t: 1 }]);
      expect(mockLeaderBoardService.getTopPerformers).toHaveBeenCalledWith(
        query.type,
        query.id,
        query.page,
        query.limit,
        query.financialYear,
      );
    });
  });

  describe('getTopTenRm', () => {
    it('should call service.getTopTenRm with DTO values', async () => {
      const dto: any = { page: 3, limit: 20, financialYear: '2024-2025' };
      mockLeaderBoardService.getTopTenRm.mockResolvedValue({ list: [] });
      const res = await controller.getTopTenRm(dto);
      expect(res).toEqual({ list: [] });
      expect(mockLeaderBoardService.getTopTenRm).toHaveBeenCalledWith(
        dto.page,
        dto.limit,
        dto.financialYear,
      );
    });
  });

  describe('getCancellationsData', () => {
    it('should call service.getCancellationsData with dto values', async () => {
      const query: any = { type: 'city', id: 9, financialYear: '2024-2025' };
      mockLeaderBoardService.getCancellationsData.mockResolvedValue({
        cancellations: [],
      });
      const res = await controller.getCancellationsData(query);
      expect(res).toEqual({ cancellations: [] });
      expect(mockLeaderBoardService.getCancellationsData).toHaveBeenCalledWith(
        query.type,
        query.id,
        query.financialYear,
      );
    });
  });
});
