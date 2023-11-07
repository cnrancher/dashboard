import cluster from '@shell/models/provisioning.cattle.io.cluster.js';
import { BLANK_CLUSTER } from '@shell/store/store-types.js';

export default class K8sAuditLogcluster extends cluster {
  get _availableActions() {
    const out = super._availableActions;
    const k8sAuditLog = {
      action:   'viewK8sAuditLog',
      label:    this.t( 'auditLog.cluster.k8sAuditLog'),
      bulkable: false,
      icon:     'icon icon-file',
    };

    out.splice(0, 0, k8sAuditLog);

    return out;
  }

  viewK8sAuditLog() {
    const type1 = this.machineProvider && this.machineProviderDisplay;
    const type2 = this.isCustom ? 'custom' : '';
    const type3 = this.mgmt?.providerForEmberParam === 'import' ? 'imported' : '';

    const r = {
      name:   `c-cluster-manager-k8sAuditLog`,
      params: { cluster: BLANK_CLUSTER },
      query:  {
        clusterId: this.mgmt?.id, cluster: this.metadata.name, clusterName: this.nameDisplay, clusterType: type1 || type2 || type3
      }
    };

    this.currentRouter().push(r);
  }
}
