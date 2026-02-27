import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from "@mui/material";
import { formatDateTimeIST } from "../../utils/date";

const shouldFormatDate = (colId, value) => {
  if (value instanceof Date) return true;
  if (typeof value !== "string") return false;
  if (!colId) return false;
  return /date|created|start|end|expiry|last_login|lastlogin/i.test(colId);
};

const DataTable = ({ columns, rows, onRowClick }) => {
  return (
    <TableContainer component={Paper} sx={{ borderRadius: 3, maxWidth: "100%", overflowX: "auto" }}>
      <Table sx={{ width: "100%" }}>
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell key={col.id} sx={{ fontWeight: 600, color: "#475569" }}>
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow
              key={row.id || idx}
              hover
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              sx={onRowClick ? { cursor: "pointer" } : undefined}
            >
              {columns.map((col) => (
                <TableCell key={col.id}>
                  {col.render
                    ? col.render(row)
                    : shouldFormatDate(col.id, row[col.id])
                      ? formatDateTimeIST(row[col.id])
                      : row[col.id]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DataTable;
