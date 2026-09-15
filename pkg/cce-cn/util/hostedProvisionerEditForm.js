export function hasNonEmptyDriverConfig(config) {
  if (!config) {
    return false;
  }

  if (typeof config === 'object' && !Array.isArray(config)) {
    return Object.keys(config).length > 0;
  }

  return true;
}

export function shouldUseCceProvisionerEditForm({ mgmt, normanCluster, clusterId }) {
  if (!clusterId) {
    return true;
  }

  const cceConfig = mgmt?.spec?.cceConfig ?? normanCluster?.cceConfig;

  return hasNonEmptyDriverConfig(cceConfig);
}
