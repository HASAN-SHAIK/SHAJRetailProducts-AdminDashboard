import React from "react";
import PropTypes from "prop-types";

const FeatureFlags = ({ planFeatures }) => {
  if (!planFeatures) return null;

  return (
    <div className="feature-flags">
      <h3>Plan Features</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {Object.entries(planFeatures).map(([key, value]) => (
          <li key={key} style={{ marginBottom: 12, display: "flex", alignItems: "center" }}>
            <span style={{ flex: 1, textTransform: "capitalize" }}>{key.replace(/_/g, " ")}</span>
            {typeof value === "boolean" ? (
              <label className="switch">
                <input type="checkbox" checked={value} disabled readOnly />
                <span className="slider round"></span>
              </label>
            ) : (
              <span>{value}</span>
            )}
          </li>
        ))}
      </ul>
      <style>{`
        .switch {
          position: relative;
          display: inline-block;
          width: 40px;
          height: 22px;
        }
        .switch input {display:none;}
        .slider {
          position: absolute;
          cursor: not-allowed;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #ccc;
          transition: .4s;
          border-radius: 22px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 2px;
          bottom: 2px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        input:checked + .slider {
          background-color: #4caf50;
        }
        input:checked + .slider:before {
          transform: translateX(18px);
        }
      `}</style>
    </div>
  );
};

FeatureFlags.propTypes = {
  planFeatures: PropTypes.object
};

export default FeatureFlags;
