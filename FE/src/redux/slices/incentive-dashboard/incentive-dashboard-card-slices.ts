import type { PayloadAction } from '@reduxjs/toolkit';

import { createSlice } from '@reduxjs/toolkit';

import { TYPE } from 'src/utils/constant';

import { fetchIncentiveCardData } from 'src/redux/actions/incentive-dashboard/incentive-dashboard-actions';

// Function to determine gradient color
const getGradientColor = (status: string): string => {
  switch (status) {
    case TYPE.Risk:
      return 'rgba(122,9,22,1)';
    case TYPE.Paid_YTD:
      return 'rgba(34,197,94,1)';
    case TYPE.Payable:
      return 'rgba(255,171,0,1)';
    case TYPE.Paid:
      return 'rgba(142,51,255,1)';
    default:
      return 'rgba(0,0,0,0.5)'; // Default color
  }
};

interface IncentiveCardsState {
  loading: boolean;
  error: string | null;
  cards: IncentiveCardData[] | null;
  activeCardId: any | null;
  rmName: string | null;
}

const initialState: IncentiveCardsState = {
  loading: false,
  error: null,
  activeCardId: null,
  cards: [],
  rmName: null,
};

export interface IncentiveCardData {
  type: string;
  id: number;
  title: string;
  amount: number;
  subtitle?: string;
  subtitleAmount: number;
  status: string;
  gradientColor: string;
}

const incentiveCardsSlice = createSlice({
  name: 'cards',
  initialState,
  reducers: {
    setActiveCardId: (state, action: PayloadAction<any>) => {
      state.activeCardId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchIncentiveCardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIncentiveCardData.fulfilled, (state, action) => {
        state.loading = false;
        
        if (action.payload) {
          const payload = action.payload as any;
          state.rmName = payload.rmName || null; 
          const cardsArray = payload.cards || payload;
          state.cards = cardsArray
          ? (cardsArray as unknown as IncentiveCardData[]).map((card) => ({
              ...card,
              type: card.status,
              gradientColor: getGradientColor(card.status),
            }))
          : [];
        } else {
          state.cards = [];
          state.rmName = null;
        }
      })

      .addCase(fetchIncentiveCardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch incentive cards';
      });
  },
});

export const { setActiveCardId } = incentiveCardsSlice.actions;

export default incentiveCardsSlice.reducer;
