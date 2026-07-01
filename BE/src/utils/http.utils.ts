import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';

// Generic GET
export async function httpGet<T = any>(
  httpService: HttpService,
  url: string,
  token?: string,
): Promise<T> {
  const response = await firstValueFrom(
    httpService.get(url, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      responseType: 'json',
    }),
  );

  let data: any = response?.data;

  // If server returned JSON as string, parse it
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      // leave it as string if not valid JSON
    }
  }

  return data as T;
}

// Generic POST
export async function httpPost<T = any>(
  httpService: HttpService,
  url: string,
  body: any,
  token?: string,
): Promise<T> {
  const response = await firstValueFrom(
    httpService.post<T>(url, body, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }),
  );
  return response.data;
}

// Generic PUT
export async function httpPut<T = any>(
  httpService: HttpService,
  url: string,
  body: any,
  token?: string,
): Promise<T> {
  const response = await firstValueFrom(
    httpService.put<T>(url, body, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }),
  );
  return response.data;
}
