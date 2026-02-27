const asObject = (value) => (value && typeof value === "object" ? value : {});

export const resolveTenantFeatures = (tenant) => {
  return asObject(tenant?.plan?.features || tenant?.features);
};

export const isFeatureEnabled = (features, key, fallback = false) => {
  if (typeof features?.[key] === "boolean") return features[key];
  return fallback;
};
