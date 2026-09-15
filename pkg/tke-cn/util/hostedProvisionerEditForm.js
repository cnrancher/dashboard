export function hasNonEmptyDriverConfig(config) {
  if (!config) {
    return false;
  }

  if (typeof config === 'object' && !Array.isArray(config)) {
    return Object.keys(config).length > 0;
  }

  return true;
}

export function shouldUseTkeProvisionerEditForm({ mgmt, normanCluster, clusterId }) {
  if (!clusterId) {
    return true;
  }

  const tkeConfig = mgmt?.spec?.tkeConfig ?? normanCluster?.tkeConfig;

  return hasNonEmptyDriverConfig(tkeConfig);
}
