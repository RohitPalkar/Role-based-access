import React from "react";

import { Box, Typography } from "@mui/material";

import { getStatusStyles } from "src/utils/constant";

interface TransactionCardProps {
  amount: string | number;
  date: string;
  method: string;
  status: string;
  index: number;
  paymentId: string;
}

function formatDateIST(isoDate?: string | Date | null): string {
  if (!isoDate) return "--";

  const newDate = new Date(isoDate);

  // Convert to IST (UTC + 5:30)
  const istOffset = 5 * 60 + 30; // minutes
  const istTime = new Date(newDate.getTime() + istOffset * 60 * 1000);

  const day = String(istTime.getUTCDate()).padStart(2, "0");
  const month = istTime.toLocaleString("en-GB", {
    month: "short",
    timeZone: "UTC",
  });
  const year = istTime.getUTCFullYear();

  return `${day}-${month}-${year}`;
}

function formatIndianNumber(num?: number | string | null): string {
  if (num === null || num === undefined || Number.isNaN(Number(num))) {
    return "0";
  }
  return Number(num).toLocaleString("en-IN");
}

const TransactionCard: React.FC<TransactionCardProps> = ({ amount, date, method, status, index, paymentId }) => {
  const { bg, color, text, icon } = getStatusStyles(status);

  return (
    <>
    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Transaction {index + 1}</Typography>
    <Box
      sx={{
        border: "1px solid rgba(26, 64, 125, 0.3)",
        borderRadius: "8px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        p: 2,
        mb: 2,
      }}
    >
      {/* Left side: Icon + Amount stacked with Date */}
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <img
          src={icon}
          alt={`${status}-icon`}
          style={{ marginRight: 8, marginTop: 2 }}
        />
        <Box>
          <Typography sx={{ fontWeight: 500, fontSize: "16px" }}>₹{formatIndianNumber(amount)}</Typography>
          <Typography
            sx={{
              fontSize: "14px",
              fontWeight: 500,
              color: "rgba(0, 0, 0, 0.6)",
            }}
          >
            {paymentId} • {formatDateIST(date)} • {method.toUpperCase()}
          </Typography>
        </Box>
      </Box>

      {/* Right side: Status Badge */}
      <Box
        sx={{
          backgroundColor: bg,
          color,
          borderRadius: "6px",
          px: 1.5,
          py: 0.5,
          fontWeight: 700,
          fontSize: "14px",
        }}
      >
        {text}
      </Box>
    </Box>
    </>
  );
};

export default TransactionCard;
