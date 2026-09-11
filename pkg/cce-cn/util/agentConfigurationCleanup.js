const CLUSTER_AGENT_DEPLOYMENT_CUSTOMIZATION = 'clusterAgentDeploymentCustomization';
const FLEET_AGENT_DEPLOYMENT_CUSTOMIZATION = 'fleetAgentDeploymentCustomization';

function cleanAgentConfigurationField(model, key) {
  if (!model || !model[key]) {
    return;
  }

  const v = model[key];

  if (Array.isArray(v) && v.length === 0) {
    delete model[key];
  } else if (v && typeof v === 'object') {
    Object.keys(v).forEach((k) => {
      if (k === '_namespaceOption' || k === '_namespaces' || k === '_anti' || k === '_id') {
        delete v[k];
      }

      if (k !== 'namespaceSelector') {
        cleanAgentConfigurationField(v, k);
      }
    });

    if (Object.keys(v).length === 0) {
      delete model[key];
    }
  }
}

export function cleanupNormanClusterAgentConfiguration(normanCluster) {
  if (!normanCluster) {
    return;
  }

  cleanAgentConfigurationField(normanCluster, CLUSTER_AGENT_DEPLOYMENT_CUSTOMIZATION);
  cleanAgentConfigurationField(normanCluster, FLEET_AGENT_DEPLOYMENT_CUSTOMIZATION);
}
