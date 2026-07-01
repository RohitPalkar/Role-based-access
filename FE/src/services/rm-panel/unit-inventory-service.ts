import { toast } from "sonner";

import { toPlainRecord } from 'src/utils/inventory-block-timer';
import { downloadSampleExcelFromApiResponse } from "src/utils/download-sample-excel";

import { CONFIG } from "src/config-global";

import { route } from "../apiRoutes";
import { eoiRoutes } from "../EoiRoutes";
import { GET, POST, PATCH } from "../axiosInstance";

export type BlockInventoryUnitPayload = {
  campaignId: number;
  inventoryUnitId: string;
  voucherId: number;
};

/** POST `/inventory-unit/update-payment-mapping` — same payment shape as voucher update (see `UpdateVoucherEOI.paymentDetails`). */
export type UpdateInventoryPaymentMappingPayload = {
  blockingId: string;
  inventoryUnitId: string;
  voucherId: number;
  paymentDetails: {
    amountPayable: number;
    payments: Array<{
      id: number | null;
      paymentMode: string;
      paidAmount: number;
      date: string;
      status: string;
      paymentDetails: Record<string, unknown>;
    }>;
  };
};

export type BlockInventoryUnitResponseData = {
  blockingId?: string;
  unitBlockExpiry?: string | null;
  /** Block start time from server — used with `unitBlockDuration` when `unitBlockExpiry` is absent. */
  createdAt?: string | null;
  timerDurationMinutes?: number;
  unitBlockDuration?: number;
  timerExtension?: number;
  message?: string;
  /** Present when API returns `data.voucher` / `data.blocking` (map-unit payment threshold UX). */
  voucher?: Record<string, unknown>;
  blocking?: Record<string, unknown>;
};

const parseBlockInventoryResponse = (
  envelope: Record<string, unknown> | undefined
): BlockInventoryUnitResponseData => {
  if (!envelope || typeof envelope !== 'object') {
    throw new Error('Unexpected response body');
  }

  const responseData = envelope.data;
  const responseBody =
    responseData && typeof responseData === 'object' && !Array.isArray(responseData)
      ? (responseData as Record<string, unknown>)
      : envelope;

  const messageFromEnvelope = typeof envelope.message === 'string' ? envelope.message : undefined;
  const messageFromResponseBody =
    typeof responseBody.message === 'string' ? (responseBody.message as string) : undefined;

  const normalizedResponse: BlockInventoryUnitResponseData = {
    ...(responseBody as BlockInventoryUnitResponseData),
  };
  const blockingPayload = toPlainRecord(responseBody.blocking);

  if (blockingPayload) {
    if (typeof blockingPayload.id === 'string' && blockingPayload.id.trim()) {
      normalizedResponse.blockingId = blockingPayload.id;
    }
    if (
      typeof blockingPayload.unitBlockExpiry === 'string' &&
      blockingPayload.unitBlockExpiry.trim()
    ) {
      normalizedResponse.unitBlockExpiry = blockingPayload.unitBlockExpiry;
    }
    if (typeof blockingPayload.createdAt === 'string' && blockingPayload.createdAt.trim()) {
      normalizedResponse.createdAt = blockingPayload.createdAt;
    }
  }

  return {
    ...normalizedResponse,
    ...(messageFromEnvelope || messageFromResponseBody
      ? { message: messageFromEnvelope ?? messageFromResponseBody }
      : {}),
  };
};

export type UnitInventoryDropdownPayload = {
  campaignId: number;
  towerName?: string[];
  floor?: string[];
};

// fetch unit inventory list
export const fetchUnitInventory = async (params: Record<string, any>) => {
  const filteredParams: Record<string, any> = {};
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (
        value !== undefined && 
        value !== null && 
        value !== '' &&
        !(Array.isArray(value) && value.length === 0)
      ) {
        filteredParams[key] = value;
      }
  });

  const queryString = new URLSearchParams(filteredParams).toString();
  const url = queryString ? `${route.UNIT_INVENTORY}?${queryString}` : route.UNIT_INVENTORY;

  try {
    const response = await GET(url);
    if (response?.status === 200) {
      const apiResponse = response?.response?.response?.data;
      return {
        data: apiResponse?.result || [],
        total:apiResponse?.total ?? 0,
      };
    }

    throw new Error('Failed to fetch unit inventory');
  } catch (error: any) {
    console.error('Unit inventory error:', error);

    const message =
      error?.response?.data?.message || error?.message || 'Error while fetching unit inventory';

    throw new Error(message);
  }
};

export const changeUnitStatus = async (id: string, payload: { status: string }) => {
  try {
    const response = await PATCH(`${eoiRoutes.UPDATE_UNIT_STATUS}/${id}`, payload);

    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.message;
    }

    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(
      error.response?.data?.errors?.message || 'Something went wrong'
    );
  }
};

export const downloadSampleUnitInventoryExcel = async () => {
  try {
    const response = await GET(route.DOWNLOAD_SAMPLE_UNIT_INVENTORY_DOCUMENT);
    return downloadSampleExcelFromApiResponse(response);
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getUnitInventoryDropdowns = async (params: UnitInventoryDropdownPayload) => {
  try {
    const query = new URLSearchParams({
      campaignId: String(params.campaignId),
      ...(params.towerName?.length && { towerName: params.towerName.join(',') }),
      ...(params.floor?.length && { floor: params.floor.join(',') }),
    });

    const response = await GET(
      `${route.UNIT_INVENTORY_DROPDOWNS}?${query.toString()}`
    );

    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.data;
    }

    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(
      error.response?.data?.errors?.message || 'Something went wrong'
    );
  }
};

export const exportUnitInventoryList = async (payload: Record<string, any>) => {
   try {
    const queryParams = new URLSearchParams(payload as any).toString();
    const response = await GET(`${route.EXPORT_UNIT_INVENTORY_LIST}?${queryParams}`);
    const path = response?.response?.response?.data?.filePath;
    const s3BaseUrl = CONFIG.site.s3BasePath;
    const fileUrl = `${s3BaseUrl}/${path}`;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.setAttribute('download', path);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(response?.response?.response?.message);
    return true;
  } catch (error) {
    toast.error(error?.response?.data?.errors?.message);
    return false;
  }
};

export const getUnitInventoryById = async (id: string) => {
  try {
    const response = await GET(`${route.GET_UNIT_INVENTORY_BY_ID}/${id}`);

    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.data;
    }

    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(
      error.response?.data?.errors?.message || 'Something went wrong'
    );
  }
};

export const fetchVoucherForMapping = async (params: {
  campaignId: number;
  search: string;
}) => {
  try {
    const { campaignId, search } = params;

    const query = new URLSearchParams({
      campaignId: String(campaignId),
      search,
    }).toString();

    const response = await GET(
      `${route.FETCH_VOUCHER_FOR_MAPPING}?${query}`
    );

    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.data;
    }

    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(
      error.response?.data?.errors?.message || 'Something went wrong'
    );
  }
};

export const blockInventoryUnit = async (
  payload: BlockInventoryUnitPayload
): Promise<BlockInventoryUnitResponseData> => {
  try {
    const response = await POST(eoiRoutes.BLOCK_INVENTORY_UNIT, payload);

    if (response?.status !== 200 && response?.status !== 201) {
      throw new Error('Unexpected response status');
    }

    const envelope = response?.response?.response as Record<string, unknown> | undefined;
    return parseBlockInventoryResponse(envelope);
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.errors?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed to block inventory unit'
    );
  }
};

export const updateInventoryPaymentMapping = async (
  payload: UpdateInventoryPaymentMappingPayload
): Promise<string | undefined> => {
  try {
    const response = await POST(eoiRoutes.UPDATE_PAYMENT_MAPPING, payload as unknown as Record<string, unknown>);

    if (response?.status !== 200 && response?.status !== 201) {
      throw new Error('Unexpected response status');
    }

    const body = response?.response?.response as Record<string, unknown> | undefined;
    if (typeof body?.message === 'string') {
      return body.message;
    }
    const data = body?.data;
    if (data && typeof data === 'object' && typeof (data as { message?: string }).message === 'string') {
      return (data as { message: string }).message;
    }
    return undefined;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.errors?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed to update payment mapping'
    );
  }
};

export const releaseInventoryUnit = async (blockingId: string): Promise<string | undefined> => {
  try {
    const response = await PATCH(
      `${eoiRoutes.RELEASE_INVENTORY_UNIT}/${encodeURIComponent(blockingId)}`,
      {}
    );

    if (response?.status !== 200 && response?.status !== 201) {
      throw new Error('Unexpected response status');
    }

    const body = response?.response?.response as Record<string, unknown> | undefined;
    if (typeof body?.message === 'string') {
      return body.message;
    }
    const data = body?.data;
    if (data && typeof data === 'object' && typeof (data as { message?: string }).message === 'string') {
      return (data as { message: string }).message;
    }
    return undefined;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.errors?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed to release unit'
    );
  }
};

/**
 * Parses `GET …/mapped-transactions/:voucherId` bodies, including:
 * `{ success, response: { statusCode, message, data: [...] } }` (axios `data`).
 */
export const extractMappedTransactionsPayments = (envelope: unknown): unknown[] => {
  if (envelope == null) {
    return [];
  }
  if (Array.isArray(envelope)) {
    return envelope;
  }
  if (typeof envelope !== 'object') {
    return [];
  }
  const r = envelope as Record<string, unknown>;

  const tryArray = (v: unknown): unknown[] | null => (Array.isArray(v) ? v : null);

  const direct = tryArray(r.data) ?? tryArray(r.payments) ?? tryArray(r.result);
  if (direct) {
    return direct;
  }

  const inner = r.response;
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const ir = inner as Record<string, unknown>;
    const fromInner = tryArray(ir.data) ?? tryArray(ir.payments);
    if (fromInner) {
      return fromInner;
    }
    const inner2 = ir.response;
    if (inner2 && typeof inner2 === 'object' && !Array.isArray(inner2)) {
      const fromInner2 = tryArray((inner2 as Record<string, unknown>).data);
      if (fromInner2) {
        return fromInner2;
      }
    }
  }

  return [];
};

/** `GET eoi-management/mapped-transactions/:voucherId` — voucher payment rows for map-unit. */
export const fetchMappedTransactionsByVoucherId = async (
  voucherId: string | number
): Promise<unknown[]> => {
  const url = `${route.EOI_MAPPED_TRANSACTIONS}/${voucherId}`;
  try {
    const response = await GET(url);
    if (response?.status !== 200) {
      throw new Error('Failed to fetch mapped transactions');
    }
    const body = response.response;
    const rows = extractMappedTransactionsPayments(body);
    if (rows.length > 0) {
      return rows;
    }
    return extractMappedTransactionsPayments(
      body && typeof body === 'object' ? (body as Record<string, unknown>).response : undefined
    );
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    console.error('Mapped transactions service error:', error);
    const message =
      err?.response?.data?.message || err?.message || 'Error while fetching mapped transactions';
    throw new Error(message);
  }
};