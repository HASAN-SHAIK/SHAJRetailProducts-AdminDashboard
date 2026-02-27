import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1f5eff"
    },
    secondary: {
      main: "#ff7a18"
    },
    background: {
      default: "#f5f7fb",
      paper: "#ffffff"
    }
  },
  typography: {
    fontFamily: "Montserrat, Segoe UI, sans-serif",
    h4: {
      fontFamily: "Space Grotesk, Montserrat, sans-serif",
      fontWeight: 700
    },
    h5: {
      fontFamily: "Space Grotesk, Montserrat, sans-serif",
      fontWeight: 700
    }
  },
  shape: {
    borderRadius: 14
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
          border: "1px solid rgba(148, 163, 184, 0.2)"
        }
      }
    }
  }
});

export default theme;
