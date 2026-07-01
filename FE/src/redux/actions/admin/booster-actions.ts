import type { BoosterResponse } from 'src/types/admin/services/booster';

import { createAsyncThunk } from '@reduxjs/toolkit';

import { getBoosterById, getBoosterList } from 'src/services/admin-services/booster-srvice';


// Async thunk for fetching booster
export const fetchBooster = createAsyncThunk<BoosterResponse, any>(
  'fetchBooster',
  // @ts-ignore
  async (payload: any) => {
    try {
      const result = await getBoosterList(payload);
      
      const newData = result?.boosters?.map((data: any) => {
        const projects = data?.projects?.map(
          (project: { id: number; name: string }) => project.name
        );
        const brand = data?.projects?.map(
          (project: any) => project?.brand.name
        ).filter((value: any, index: any, self: string | any[]) => self.indexOf(value) === index);;
        const city = data?.projects?.map(
          (project: any) => project?.city.name
        );
        return {
          id: data.id,
          name: data.name,
          duration: data.duration,
          status: data.status,
          projects,
          brand,
          city
        };
      });

        return {booster:newData,total:result?.total};
    } catch (error: any) {
      return { data: null, error: error?.message };
    }
  }
);


// Async thunk for fetching booster
export const fetchBoosterById = createAsyncThunk<BoosterResponse, any>(
  'fetchBoosterById',
  // @ts-ignore
  async (payload: any) => {
    try {
      const result = await getBoosterById(payload);
      
      const projects = result?.projects?.map(
        (project: { id: number; name: string }) => project.name
      );

      const newData = {
        id: result?.id,
        name: result?.name,
        startDate: result?.startDate,
        endDate: result?.endDate,
        status: result?.status,
        boosterSlabs: result?.boosterSlabs,
        projects,
      };

      return {booster:newData};
    } catch (error: any) {
      return { data: null, error: error?.message };
    }
  }
);