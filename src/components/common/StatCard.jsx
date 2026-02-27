import React from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";

const StatCard = ({ title, value, subtitle, accent }) => (
  <Card sx={{ borderLeft: accent ? `4px solid ${accent}` : "4px solid #1f5eff" }}>
    <CardContent>
      <Typography variant="body2" sx={{ color: "#64748b" }}>
        {title}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: "#94a3b8" }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </CardContent>
  </Card>
);

export default StatCard;
