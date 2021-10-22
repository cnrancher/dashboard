import { AGE, NAME as NAME_COL, STATE } from '@/config/table-headers';
import {
  CAPI,
  CATALOG,
  MANAGEMENT,
  NORMAN,
  HCI
} from '@/config/types';
import { MULTI_CLUSTER } from '@/store/features';
import { DSL } from '@/store/type-map';
import { SETTING } from '@/config/settings';

export const NAME = 'manager';

export function init(store) {
  const {
    product,
    basicType,
    headers,
    configureType,
    virtualType,
    weightType,
    weightGroup
  } = DSL(store, NAME);

  product({
    ifHaveType:          CAPI.RANCHER_CLUSTER,
    ifFeature:           MULTI_CLUSTER,
    inStore:             'management',
    icon:                'cluster-management',
    removable:           false,
    showClusterSwitcher: false,
  });

  virtualType({
    name:        'cloud-credentials',
    label:       'Cloud Credentials',
    group:      'Root',
    namespaced:  false,
    icon:       'globe',
    weight:      99,
    route:       { name: 'c-cluster-manager-cloudCredential' },
  });

  virtualType({
    labelKey:       'legacy.psps',
    name:           'pod-security-policies',
    group:          'Root',
    namespaced:     false,
    weight:         0,
    icon:           'folder',
    route:          { name: 'c-cluster-manager-pages-page', params: { cluster: 'local', page: 'pod-security-policies' } },
    exact:          true
  });

  basicType([
    CAPI.RANCHER_CLUSTER,
    'cloud-credentials',
    'drivers',
    'pod-security-policies',
  ]);

  configureType(CAPI.RANCHER_CLUSTER, {
    showListMasthead: false, namespaced: false, alias: [HCI.CLUSTER]
  });
  // configureType(NORMAN.CLOUD_CREDENTIAL, { showListMasthead: false, namespaced: false });
  weightType(CAPI.RANCHER_CLUSTER, 100, true);
  weightType('cloud-credentials', 99, true);
  weightType('drivers', 98, true);
  weightType(CATALOG.CLUSTER_REPO, 97, true);

  configureType(NORMAN.CLOUD_CREDENTIAL, {
    showState: false, showAge: false, canYaml: false
  });

  virtualType({
    label:      'Drivers',
    name:       'drivers',
    group:      'Root',
    namespaced: false,
    icon:       'globe',
    route:      { name: 'c-cluster-manager-pages-page', params: { cluster: 'local', page: 'rke-drivers' } },
    exact:      true
  });

  virtualType({
    label:      'RKE Templates',
    name:       'rke-templates',
    group:      'Root',
    namespaced: false,
    icon:       'globe',
    route:      { name: 'c-cluster-manager-pages-page', params: { cluster: 'local', page: 'rke-templates' } },
    exact:      true
  });

  virtualType({
    label:      'Node Templates',
    name:       'rke-node-templates',
    group:      'Root',
    namespaced: false,
    icon:       'globe',
    route:      { name: 'c-cluster-manager-pages-page', params: { cluster: 'local', page: 'node-templates' } },
    exact:      true
  });

  basicType([
    'rke-templates',
    'rke-node-templates'
  ], 'RKE1 Configuration');

  // image repo start
  virtualType({
    label:      'Configuration',
    labelKey:   'nav.imageRepo.config',
    name:       'image-repo-config',
    group:      'Root',
    namespaced: false,
    icon:       'globe',
    route:      { name: 'c-cluster-manager-pages-page', params: { cluster: 'local', page: 'image-repo-config' } },
    exact:      true
  });

  virtualType({
    showMenuFun(state, getters, rootState, rootGetters) {
      return rootState.auth?.isAdmin || rootState.auth?.v3User?.annotations?.['management.harbor.pandaria.io/synccomplete'] === 'true';
    },
    label:      'Image Management',
    labelKey:   'nav.imageRepo.projects',
    name:       'image-repo-projects',
    group:      'Root',
    namespaced: false,
    icon:       'globe',
    route:      { name: 'c-cluster-manager-pages-page', params: { cluster: 'local', page: 'image-repo-projects' } },
    exact:      true
  });

  virtualType({
    showMenuFun(state, getters, rootState, rootGetters) {
      return rootState.auth?.isAdmin || rootState.auth?.v3User?.annotations?.['management.harbor.pandaria.io/synccomplete'] === 'true';
    },
    label:      'Logs',
    labelKey:   'nam.imageRepo.logs',
    name:       'image-repo-logs',
    group:      'Root',
    namespaced: false,
    icon:       'globe',
    route:      { name: 'c-cluster-manager-pages-page', params: { cluster: 'local', page: 'image-repo-logs' } },
    exact:      true
  });

  basicType([
    'image-repo-config',
    'image-repo-projects',
    'image-repo-logs',
  ], 'imageRepo');
  // image repo end

  // global audit log start
  virtualType({
    showMenuFun(state, getters, rootState, rootGetters) {
      return rootGetters['management/byId'](MANAGEMENT.SETTING, SETTING.AUDIT_LOG_SERVER_URL);
    },
    label:      'Audit Log',
    labelKey:   'nav.auditLog',
    name:       'global-audit-log',
    group:      'Root',
    namespaced: false,
    icon:       'globe',
    route:      { name: 'c-cluster-manager-pages-page', params: { cluster: 'local', page: 'global-audit-log' } },
    exact:      true
  });

  basicType([
    'global-audit-log',
  ]);
  // global audit log end

  weightType(CAPI.MACHINE_DEPLOYMENT, 3, true);
  weightType(CAPI.MACHINE_SET, 2, true);
  weightType(CAPI.MACHINE, 1, true);
  weightType(CATALOG.CLUSTER_REPO, 0, true);

  configureType(CATALOG.CLUSTER_REPO, { showListMasthead: false });

  basicType([
    MANAGEMENT.CLUSTER,
    CAPI.MACHINE_DEPLOYMENT,
    CAPI.MACHINE_SET,
    CAPI.MACHINE,
    CATALOG.CLUSTER_REPO,
  ], 'Advanced');

  weightGroup('Advanced', -1, true);

  const MACHINE_SUMMARY = {
    name:      'summary',
    labelKey:  'tableHeaders.machines',
    sort:      false,
    search:    false,
    formatter: 'MachineSummaryGraph',
    align:     'center',
    width:     100,
  };

  headers(CAPI.RANCHER_CLUSTER, [
    STATE,
    NAME_COL,
    {
      name:   'kubernetesVesion',
      label:  'Version',
      value:  'kubernetesVersion',
      sort:   'kubernetesVersion',
      search: 'kubernetesVersion',
    },
    {
      name:   'provider',
      label:  'Provider',
      value:  'machineProvider',
      sort:   ['machineProvider', 'provisioner'],
    },
    MACHINE_SUMMARY,
    AGE,
    {
      name:  'explorer',
      label: ' ',
      align: 'right',
      width: 65,
    },
  ]);

  headers(CAPI.MACHINE_DEPLOYMENT, [
    STATE,
    NAME_COL,
    MACHINE_SUMMARY,
    AGE
  ]);
}
