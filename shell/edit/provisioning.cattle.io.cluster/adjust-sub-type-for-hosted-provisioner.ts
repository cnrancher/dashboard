const IMPORTED_SUB_TYPE = 'imported';

export function hasNonEmptyDriverConfig(config: unknown): boolean {
  if (!config) {
    return false;
  }

  if (typeof config === 'object' && !Array.isArray(config)) {
    return Object.keys(config).length > 0;
  }

  return true;
}

export interface AdjustSubTypeProvisionerArgs {
  mgmt?: {
    spec?: Record<string, unknown>;
    normanCluster?: Record<string, unknown>;
  } | null;
  normanCluster?: Record<string, unknown> | null;
  clusterId?: string;
}

export interface AdjustSubTypeParams {
  subType: string | null;
  clusterId?: string;
  extensions: Array<{
    id: string;
    shouldUseProvisionerEditForm?: (args: AdjustSubTypeProvisionerArgs) => boolean;
  }>;
  mgmt?: AdjustSubTypeProvisionerArgs['mgmt'];
}

/**
 * resolveSubType 之后用。扩展的 shouldUseProvisionerEditForm 为 false 时改回 imported，
 * 避免仅有 provider（如 tke/ack）却没有 *Config 时误进 CruTke/CruAck。
 */
export function adjustSubTypeForHostedProvisioner({
  subType, clusterId, extensions, mgmt
}: AdjustSubTypeParams): string | null {
  if (!subType || !clusterId) {
    return subType;
  }

  const extension = extensions.find((ext) => ext.id === subType);

  if (!extension || typeof extension.shouldUseProvisionerEditForm !== 'function') {
    return subType;
  }

  const normanCluster = mgmt?.normanCluster ?? null;
  const useProvisionerForm = extension.shouldUseProvisionerEditForm({
    mgmt, normanCluster, clusterId
  });

  return useProvisionerForm ? subType : IMPORTED_SUB_TYPE;
}
