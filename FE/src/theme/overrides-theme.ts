import type { ThemeUpdateOptions } from './types';

// ----------------------------------------------------------------------

export const overridesTheme: ThemeUpdateOptions = {
  components: {
    MuiPickersDay: {
      styleOverrides: {
        root: {
          "&.Mui-selected": {
            backgroundColor: "#1A407D !important",  // Blue selected date
            color: "white !important",
          },
          "&.Mui-selected:hover": {
            backgroundColor: "#1A407D !important",  // Darker blue on hover
          },
        },
      },
    },
    MuiPickersYear: {
      styleOverrides: {
        root: {
          "&.Mui-selected": {
            backgroundColor: "#1A407D !important",
            color: "white !important",
          },
        },
      },
    },
    MuiPickersMonth: {
      styleOverrides: {
        root: {
          "&.Mui-selected": {
            backgroundColor: "#1A407D !important",
            color: "white !important",
          },
        },
      },
    },
  },
};


