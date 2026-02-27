import React from "react";
import { Box, CircularProgress } from "@mui/material";

const LoadingSpinner = () => (
  <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
    <CircularProgress />
  </Box>
);

export default LoadingSpinner;
