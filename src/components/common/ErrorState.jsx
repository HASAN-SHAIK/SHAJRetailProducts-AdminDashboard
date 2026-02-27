import React from "react";
import { Alert, Box } from "@mui/material";

const ErrorState = ({ message }) => (
  <Box sx={{ py: 3 }}>
    <Alert severity="error">{message || "Something went wrong."}</Alert>
  </Box>
);

export default ErrorState;
