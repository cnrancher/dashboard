export function hasNonEmptyDriverConfig(config) {
  if (!config) {
    return false;
  }

  if (typeof config === 'object' && !Array.isArray(config)) {
    return Object.keys(config).length > 0;
  }

  return true;
}

export function shouldUseAckProvisionerEditForm({ mgmt, normanCluster, clusterId }) {
  if (!clusterId) {
    return true;
  }

  const ackConfig = mgmt?.spec?.ackConfig ?? normanCluster?.ackConfig;

  return hasNonEmptyDriverConfig(ackConfig);
}
