import React, { createContext, useCallback, useMemo, useState } from "react";
import { Snackbar, Alert } from "@mui/material";

const ToastContext = createContext({
  showToast: () => {}
});

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

  const showToast = useCallback((message, severity = "success") => {
    setToast({ open: true, message, severity });
  }, []);

  const handleClose = () => {
    setToast((prev) => ({ ...prev, open: false }));
  };

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert onClose={handleClose} severity={toast.severity} variant="filled">
          {toast.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
};

export default ToastContext;
