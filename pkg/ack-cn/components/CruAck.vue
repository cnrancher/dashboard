<script setup>
import semver from 'semver';
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { NORMAN } from '@shell/config/types';
import Loading from '@shell/components/Loading.vue';
import { useCreateEditView } from '../composables/useCreateEditView.js';
import LabeledMultiSelect from './LabeledMultiSelect';
import NodePool from './NodePool';
import ImportAck from './ImportAck';
import CruResource from '@shell/components/CruResource.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import LabeledInputSelect from './LabeledInputSelect';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import ACKValidators, { doCidrOverlap, isValidCIDR } from '../util/validators';
import PrivateRegistry from '@shell/components/form/PrivateRegistry.vue';
import { PRIVATE_REGISTRY_CONTEXT } from '@shell/components/form/PrivateRegistry.constants';
import SelectCredential from '@shell/edit/provisioning.cattle.io.cluster/SelectCredential.vue';
import { CREATOR_PRINCIPAL_ID } from '@shell/config/labels-annotations';
import Labels from '@shell/components/form/Labels.vue';
import Banner from '@components/Banner/Banner.vue';
import CONFIG_ENV from '../util/config';
import { fetchResources, fetchResourcesNoPagination } from '../util/request';
import Tab from '@shell/components/Tabbed/Tab.vue';
import Tabbed from '@shell/components/Tabbed/index.vue';
import { _CREATE, _VIEW, _IMPORT, _EDIT } from '@shell/config/query-params';
import AgentConfiguration from '@shell/edit/provisioning.cattle.io.cluster/tabs/AgentConfiguration.vue';
import ClusterMembershipEditor, { canViewClusterMembershipEditor } from '@shell/components/form/Members/ClusterMembershipEditor.vue';
import { stringify } from '@shell/utils/error';
import { syncUpstreamConfig } from '@shell/utils/kontainer';
import Accordion from '@components/Accordion/Accordion.vue';
import ClusterPlanSelector from './ClusterPlanSelector.vue';
import FloatingHelpPanel from './FloatingHelpPanel.vue';
import {
  filter, find, cloneDeep, pullAt, uniqBy, uniq, compact, flatten,
} from 'lodash';
import { RadioGroup } from '@components/Form/Radio';

const props = defineProps({
  mode: {
    type:     String,
    required: true
  },
  value: {
    type:    Object,
    default: () => {
      return {};
    }
  }
});

const SUPPORTED_VERSION_RANGE = '>=1.33.0 <1.37.0';
const store = useStore();
const route = useRoute();
const intl = computed(() => store.getters['i18n/t']);
const ackConfig = ref({});
const normanCluster = ref({});
const nodePools = ref([]);
const options = ref({
  resourceGroupOptions: [
    {
      label: intl.value('ackCn.resourceGroup.all'),
      value: ''
    }
  ],
  regionOptions:             [],
  vpcOptions:                [],
  vswitchOptions:            [],
  keyPairOptions:            [],
  zoneOptions:               [],
  k8sVersionOptions:         [],
  k8sAllImages:              {},
  platformOptions:           [],
  allInstanceTypeOptions:    {},
  deletionProtectionOptions: [
    intl.value('generic.enabled'),
    intl.value('generic.disabled'),
  ],
});
const RUNTIME_VERSION_LE_132 = '1.6.39';
const RUNTIME_VERSION_LT_132 = '2.1.5';

const state = ref({
  loading:                       false,
  regionAndResourceGroupLoading: false,
  vpcLoading:                    false,
  zoneLoading:                   false,
  vswitchLoading:                false,
  instanceTypeLoading:           false,
  keyPairLoading:                false,
  isFlannel:                     true,
  versionCustom:                 false,
  importClusterRegion:           false,
  privateRegistryEnabled:        false,
  k8sVersionOptionsLoading:      false,
  errors:                        [],
  ackCNI:                        'terway-eniip',
  vswitchIds:                    [],
  historyK8sVersion:             '',
  autoCreateVpc:                 'auto',
  zones:                         new Set(),
});
const emit = defineEmits(['done']);
const cruresource = ref(null);
const {
  save,
  doneRoute,
  registerBeforeHook,
  registerAfterHook,
} = useCreateEditView(props, {
  emit, normanCluster, ackConfig, nodePools, state
});

const membershipUpdate = ref({});

function ensureImportedConfig() {
  if (!normanCluster.value.importedConfig) {
    normanCluster.value.importedConfig = {};
  }
}

function ensureAgentDeploymentCustomization() {
  if (!normanCluster.value.fleetAgentDeploymentCustomization) {
    normanCluster.value.fleetAgentDeploymentCustomization = {};
  }
  if (!normanCluster.value.clusterAgentDeploymentCustomization) {
    normanCluster.value.clusterAgentDeploymentCustomization = {};
  }
}

function onMembershipUpdate(update) {
  membershipUpdate.value = update;
}

async function saveRoleBindings() {
  if (membershipUpdate.value.save) {
    await membershipUpdate.value.save(normanCluster.value.id);
  }
}

const canManageMembers = computed(() => canViewClusterMembershipEditor(store));

const isEditMode = computed(() => props.mode === _CREATE || props.mode === _EDIT);

const pullSecrets = computed({
  get() {
    const secrets = normanCluster.value?.importedConfig?.privateRegistryPullSecrets;

    return secrets?.[0] ?? undefined;
  },
  set(val) {
    ensureImportedConfig();
    if (val) {
      normanCluster.value.importedConfig.privateRegistryPullSecrets = [val];
    } else if (normanCluster.value.importedConfig.privateRegistryPullSecrets) {
      delete normanCluster.value.importedConfig.privateRegistryPullSecrets;
    }
  },
});

const SERVICE_CIDR_CANDIDATES = ['172.21.0.0/20', '172.22.0.0/20', '172.23.0.0/20'];
const CONTAINER_CIDR_CANDIDATES = ['172.20.0.0/16', '172.30.0.0/16', '192.168.0.0/16'];

async function initCustomConfig() {
  state.value.loading = true;
  state.value.errors = [];
  if (props.value.id) {
    const liveNormanCluster = await props.value.findNormanCluster();

    normanCluster.value = await store.dispatch(`rancher/clone`, { resource: liveNormanCluster });
    if (!isNewOrUnprovisioned.value) {
      syncUpstreamConfig('ack', normanCluster);
    }

    formatAckConfig(normanCluster);
    ensureImportedConfig();
    ensureAgentDeploymentCustomization();
    state.value.privateRegistryEnabled = !!normanCluster.value.importedConfig?.privateRegistryURL;
    state.value.historyK8sVersion = normanCluster.value?.ackConfig?.kubernetesVersion;
  } else {
    normanCluster.value = await store.dispatch('rancher/create', { type: NORMAN.CLUSTER }, { root: true });

    const principalId = store.getters['auth/principalId'];

    if (principalId.includes('local://')) {
      normanCluster.value.annotations = { ...normanCluster.value.annotations, [CREATOR_PRINCIPAL_ID]: principalId };
    }
    ensureImportedConfig();
    ensureAgentDeploymentCustomization();
  }

  if (!normanCluster?.value?.ackConfig) {
    normanCluster.value['ackConfig'] = { ...CONFIG_ENV.DEFAULTACKCONFIG };
  }
  if (!normanCluster?.value?.ackConfig['node_pool_list']) {
    normanCluster.value.ackConfig['node_pool_list'] = [{ ...CONFIG_ENV.DEFAULT_NODE_GROUP_CONFIG }];
  }
  ackConfig.value = cloneDeep({ ...normanCluster.value.ackConfig });
  nodePools.value = cloneDeep(normanCluster.value.ackConfig['node_pool_list']);
  state.value.loading = false;
}

async function initImportConfig() {
  state.value.loading = true;
  state.value.errors = [];
  normanCluster.value = await store.dispatch('rancher/create', { type: NORMAN.CLUSTER }, { root: true });

  const principalId = store.getters['auth/principalId'];

  if (principalId.includes('local://')) {
    normanCluster.value.annotations = { ...normanCluster.value.annotations, [CREATOR_PRINCIPAL_ID]: principalId };
  }

  if (!normanCluster?.value?.ackConfig) {
    normanCluster.value['ackConfig'] = { ...CONFIG_ENV.DEFAULTIMPORTACKCONFIG };
  }
  if (normanCluster?.value?.ackConfig['node_pool_list'] && normanCluster?.value?.ackConfig['node_pool_list'].length > 0) {
    nodePools.value = cloneDeep(normanCluster.value.ackConfig['node_pool_list']);
  }
  ensureImportedConfig();
  ensureAgentDeploymentCustomization();
  state.value.privateRegistryEnabled = !!normanCluster.value.importedConfig?.privateRegistryURL;

  ackConfig.value = cloneDeep({ ...normanCluster.value.ackConfig });

  state.value.loading = false;
}

function formatAckConfig(normanCluster) {
  const ackConfig = normanCluster.value.ackConfig;

  if (ackConfig?.addons?.length > 0) {
    state.value.ackCNI = ackConfig.addons[0].name;
  }

  if (ackConfig.imported) {
    state.value.ackCNI = ackConfig.containerCidr ? 'flannel' : 'terway-eniip';
  }
  // The vswitchIds field in ackconfig is a legacy field for proprietary clusters.
  // In the new version, it needs to echo the v_switch_ids field from nodepool
  if (ackConfig?.node_pool_list && ackConfig?.node_pool_list[0] && ackConfig?.node_pool_list[0].v_switch_ids?.length > 0) {
    state.value.vswitchIds = ackConfig?.node_pool_list[0].v_switch_ids;
  }

  if (ackConfig['node_pool_list'] && ackConfig['node_pool_list'].length > 0) {
    ackConfig.node_pool_list = (ackConfig.node_pool_list || []).map((node) => ({ ...node }));
  }
  // 编辑时如果 zoneIds 没有返回，则它是选择 vpc 创建的 ack
  if (!ackConfig?.zoneIds?.length || ackConfig?.zoneIds?.length === 0) {
    state.value.autoCreateVpc = 'custom';
  }
  if (!ackConfig.deletionProtection) {
    ackConfig.deletionProtection = false;
  }
}

function resetConfig() {
  ackConfig.value.vpcId = '';
  state.value.vswitchIds = [];
  ackConfig.value.zoneIds = [];
  state.value.autoCreateVpc = 'auto';

  resetNodePool();
}

async function fetchALiyunResource() {
  state.value.regionAndResourceGroupLoading = true;
  state.value.errors = [];

  try {
    const resourceGroups = await fetchResources({
      resource:          'ResourceGroup',
      plural:            'ResourceGroups',
      cloudCredentialId: ackConfig.value.aliyun_credential_secret,
      store,
      pageSize:          10,
    });

    options.value.resourceGroupOptions = [
      {
        label: intl.value('ackCn.resourceGroup.all'),
        value: ''
      },
      ...filter(resourceGroups, (group) => group?.raw?.Status === 'OK').map((group) => ({
        label: group.raw.DisplayName,
        value: group.raw.Id,
      })),
    ];

    const regions = await fetchResources({
      resource:          'Region',
      plural:            'Regions',
      cloudCredentialId: ackConfig.value.aliyun_credential_secret,
      store,
    });
    const regionOptions = regions.map((region) => ({
      ...region,
      label: region.raw?.LocalName ?? region.label,
    }));

    options.value.regionOptions = regionOptions;
  } catch (err) {
    state.value.errors = [];
    state.value.errors.push(err);
  }
  state.value.regionAndResourceGroupLoading = false;
}

async function fetchImportALiyunResource() {
  state.value.importClusterRegion = true;
  state.value.errors = [];
  try {
    const regions = await fetchResources({
      resource:          'Region',
      plural:            'Regions',
      cloudCredentialId: ackConfig.value.aliyun_credential_secret,
      store,
    });
    const regionOptions = regions.map((region) => ({
      ...region,
      label: region.raw?.LocalName ?? region.label,
    }));

    options.value.regionOptions = regionOptions;
  } catch (err) {
    state.value.errors = [];
    state.value.errors.push(err);
  }
  state.value.importClusterRegion = false;
}

async function fetchZones(regionId) {
  state.value.zoneLoading = true;
  try {
    const resourceGroupId = ackConfig.value.resourceGroupId;
    const externalParams = { regionId };

    if (!!resourceGroupId && resourceGroupId !== '') {
      externalParams.resourceGroupId = resourceGroupId;
    }
    const zoneOptions = await fetchResources({
      resource:          'Zone',
      plural:            'Zones',
      cloudCredentialId: ackConfig.value.aliyun_credential_secret,
      externalParams,
      store,
    });

    options.value.zoneOptions = zoneOptions.map((zone) => {
      return {
        ...zone,
        label: zone.raw?.LocalName ?? zone.label,
        value: zone.raw?.ZoneId ?? zone.value,
      };
    });

    if (isNewOrUnprovisioned.value && !ackConfig.value.zoneIds?.length) {
      ackConfig.value.zoneIds = (options.value.zoneOptions || [])
        .slice(0, 3)
        .map((zone) => zone.value);

      updateZones(ackConfig.value.zoneIds);
    }
  } catch (err) {
    options.value.zoneOptions = [];
    state.value.errors = [];
    state.value.errors.push(err);
  }
  state.value.zoneLoading = false;
}

async function fetchVpc(regionId) {
  state.value.vpcLoading = true;
  try {
    const resourceGroupId = ackConfig.value.resourceGroupId;
    const externalParams = { regionId };

    if (!!resourceGroupId && resourceGroupId !== '') {
      externalParams.resourceGroupId = resourceGroupId;
    }
    const vpcOptions = await fetchResources({
      resource:          'Vpc',
      plural:            'Vpcs',
      cloudCredentialId: ackConfig.value.aliyun_credential_secret,
      externalParams,
      store,
    });

    options.value.vpcOptions = vpcOptions.map((vpc) => {
      let label = `${ vpc.raw.VpcName } (${ vpc.value })`;

      if (vpc.raw.IsDefault) {
        label = `${ intl.value('ackCn.vpcId.default') } (${ vpc.value })`;
      }

      return {
        ...vpc,
        label
      };
    });

    if (isNewOrUnprovisioned.value) {
      ensureServiceCidrNotOverlapVpc();
      ensureContainerCidrNotOverlapVpcOrService();
    }
  } catch (err) {
    options.value.vpcOptions = [];
    state.value.errors = [];
    state.value.errors.push(err);
  }
  state.value.vpcLoading = false;
}

async function fetchKubernetesMetadata(regionId) {
  const credentialId = ackConfig.value.aliyun_credential_secret;
  const isEdit = !isNewOrUnprovisioned.value;
  const isCreate = isNewOrUnprovisioned.value;
  const originalVersion = ackConfig.value.kubernetesVersion || state.value.historyK8sVersion || '';

  state.value.k8sVersionOptionsLoading = true;

  try {
    const supportedParams = {
      regionId,
      clusterType: 'ManagedKubernetes',
      mode:        'supported',
    };
    const supportedRes = await fetchResourcesNoPagination({
      resource:          'kubernetesMetadata',
      cloudCredentialId: credentialId,
      store,
      externalParams:    supportedParams,
    });
    const allVersions = Array.isArray(supportedRes) ? supportedRes : (supportedRes?.versions || []);
    let upgradableSet = null;

    if (isEdit && originalVersion) {
      try {
        const upgradeParams = {
          regionId,
          clusterType:           'ManagedKubernetes',
          mode:                  'supported',
          kubernetesVersion:     originalVersion,
          getUpgradableVersions: 'true',
        };
        const upgradeRes = await fetchResourcesNoPagination({
          resource:          'kubernetesMetadata',
          cloudCredentialId: credentialId,
          store,
          externalParams:    upgradeParams,
        });
        const upgradableVersions = Array.isArray(upgradeRes) ? (upgradeRes?.[0]?.upgradable_versions || []) : (upgradeRes?.upgradable_versions || []);

        upgradableSet = new Set(upgradableVersions);
      } catch (upgradeErr) {
        upgradableSet = null;
        state.value.errors = state.value.errors || [];
        state.value.errors.push(upgradeErr);
      }
    }
    const { options: versionOptions, allImages } = processK8sVersions({
      allVersions,
      isCreate,
      isEdit,
      originalVersion,
      upgradableSet,
    });

    options.value.k8sVersionOptions = versionOptions;
    options.value.k8sAllImages = allImages;
    if (isCreate && !ackConfig.value.kubernetesVersion && versionOptions.length) {
      ackConfig.value.kubernetesVersion = versionOptions[0].value;
    }
  } catch (err) {
    options.value.k8sVersionOptions = [];
    options.value.k8sAllImages = {};
    state.value.errors = [];
    state.value.errors.push(err);
  } finally {
    state.value.k8sVersionOptionsLoading = false;
  }
}

function inSupportedRange(version) {
  const coerced = semver.coerce(version);

  return !SUPPORTED_VERSION_RANGE || (coerced && semver.satisfies(coerced, SUPPORTED_VERSION_RANGE));
}

const PROXY_MODE_NFTABLES_MIN_VERSION = '1.35.0';

function supportsNftablesProxyMode(version) {
  const coerced = semver.coerce(version);

  return coerced && semver.gte(coerced, PROXY_MODE_NFTABLES_MIN_VERSION);
}

function getProxyModeOptionsForVersion(version) {
  if (supportsNftablesProxyMode(version)) {
    return CONFIG_ENV.MODES;
  }

  return CONFIG_ENV.MODES.filter((mode) => mode.value !== 'nftables');
}

function syncProxyModeForVersion(version) {
  const modeOptions = getProxyModeOptionsForVersion(version);
  const validValues = modeOptions.map((mode) => mode.value);

  if (!validValues.includes(ackConfig.value.proxyMode)) {
    ackConfig.value.proxyMode = 'iptables';
  }
}

function processK8sVersions({
  allVersions = [],
  isCreate,
  isEdit,
  originalVersion,
  upgradableSet,
}) {
  const newAllImages = {};
  const out = [];
  const shouldFilterByUpgradable = isEdit && upgradableSet instanceof Set;
  const isUpgradeFallback = isEdit && !shouldFilterByUpgradable;

  for (const v of allVersions) {
    const value = v.version || v.value;
    const creatable = !!v.creatable;
    const images = v.images || [];

    if (!value || !inSupportedRange(value)) {
      continue;
    }

    const isCurrentValue = isEdit && value === originalVersion;
    const canUpgradeTo = shouldFilterByUpgradable && upgradableSet.has(value);

    const canShowInCreate = isCreate && creatable;
    const canShowInEdit = isEdit && (
      isCurrentValue ||
      canUpgradeTo ||
      (isUpgradeFallback && creatable)
    );

    if (canShowInCreate || canShowInEdit) {
      out.push({ label: value, value });
      newAllImages[value] = images;
    }
  }

  out.sort((a, b) => semver.rcompare(semver.coerce(a.value), semver.coerce(b.value)));

  return { options: out, allImages: newAllImages };
}

function initVSwitchIds() {
  if (isAutoCreateVpc.value) {
    return;
  }

  const currentVswitchIds = Array.isArray(state.value.vswitchIds) ? state.value.vswitchIds : [];
  const optionValues = new Set(options.value.vswitchOptions.map((item) => item.value));
  const hasInvalidValue = currentVswitchIds.some((id) => !optionValues.has(id));

  if (currentVswitchIds.length > 0 && !hasInvalidValue) {
    updateVswitchIds(currentVswitchIds);

    return;
  }

  const defaultVswitch = options.value.vswitchOptions.find((item) => item.raw?.IsDefault) || options.value.vswitchOptions[0];
  const nextVswitchIds = defaultVswitch?.value ? [defaultVswitch.value] : [];

  state.value.vswitchIds = nextVswitchIds;
  updateVswitchIds(nextVswitchIds);
}

async function fetchVSwitch(vpcId, { initDefault = false } = {}) {
  state.value.vswitchLoading = true;

  try {
    const resourceGroupId = ackConfig.value.resourceGroupId;
    const regionId = ackConfig.value.regionId;
    const externalParams = {
      regionId,
      vpcId,
    };

    if (resourceGroupId) {
      externalParams.resourceGroupId = resourceGroupId;
    }

    const vswitchOptions = await fetchResources({
      resource:          'VSwitch',
      plural:            'VSwitches',
      cloudCredentialId: ackConfig.value.aliyun_credential_secret,
      externalParams,
      store,
    });

    options.value.vswitchOptions = vswitchOptions.map((vswitch) => {
      let label = `${ vswitch.raw.VSwitchName } (${ vswitch.value })`;

      if (vswitch.raw.IsDefault) {
        label = `${ intl.value('ackCn.vswitchId.default') } (${ vswitch.value })`;
      }

      return {
        ...vswitch,
        label,
      };
    });

    if (initDefault && isNewOrUnprovisioned.value) {
      initVSwitchIds();
    }
  } catch (err) {
    options.value.vswitchOptions = [];
    state.value.errors = [];

    state.value.errors.push(err);
  } finally {
    state.value.vswitchLoading = false;
  }
}

async function fetchInstanceType(regionId) {
  try {
    state.value.instanceTypeLoading = true;
    const resourceGroupId = ackConfig.value.resourceGroupId;
    const externalParams = { regionId };

    if (!!resourceGroupId && resourceGroupId !== '') {
      externalParams.resourceGroupId = resourceGroupId;
    }
    const instanceTypeOptions = await fetchResources({
      resource:          'InstanceType',
      plural:            'InstanceTypes',
      cloudCredentialId: ackConfig.value.aliyun_credential_secret,
      externalParams,
      store,
    });
    const allInstanceTypes = {};

    (instanceTypeOptions || []).forEach((it) => {
      const raw = it?.raw || {};
      const id = raw.InstanceTypeId;

      if (!id) {
        return;
      }
      allInstanceTypes[id] = {
        instanceTypeFamily: raw.InstanceTypeFamily,
        cpu:                raw.CpuCoreCount,
        memory:             raw.MemorySize,
      };
    });

    options.value.allInstanceTypeOptions = allInstanceTypes;
  } catch (err) {
    options.value.allInstanceTypeOptions = {};
    state.value.errors = [];
    state.value.errors.push(err);
  }
  state.value.instanceTypeLoading = false;
}

async function fetchKeyPairs(regionId) {
  state.value.keyPairLoading = true;
  try {
    const resourceGroupId = ackConfig.value.resourceGroupId;
    const externalParams = { regionId };

    if (!!resourceGroupId && resourceGroupId !== '') {
      externalParams.resourceGroupId = resourceGroupId;
    }
    const keyPairOptions = await fetchResources({
      resource:          'KeyPair',
      plural:            'KeyPairs',
      cloudCredentialId: ackConfig.value.aliyun_credential_secret,
      externalParams,
      store,
    });

    if (keyPairOptions?.length > 0) {
      options.value.keyPairOptions = keyPairOptions.map((keyPair) => {
        return {
          label: keyPair.raw.KeyPairName,
          value: keyPair.raw.KeyPairName
        };
      });
    } else {
      options.value.keyPairOptions = [];
    }
  } catch (err) {
    options.value.keyPairOptions = [];
    state.value.errors = [];
    state.value.errors.push(err);
  }
  state.value.keyPairLoading = false;
}

function addPool() {
  if (changedHistoryK8sVersion.value || ackConfig.value.imported) {
    return;
  }
  let nextDefaultSuffix = nodePools.value?.length + 1;

  while (nodePools.value.find((group) => group.name === `nodepool-${ nextDefaultSuffix }`)) {
    nextDefaultSuffix++;
  }

  const v = ackConfig.value?.kubernetesVersion;
  const m = String(v ?? '').match(/^(\d+)\.(\d+)\./);
  const minor = m ? Number(m[2]) : NaN;
  let runtimeVersion = RUNTIME_VERSION_LT_132;

  if (!Number.isNaN(minor) && minor <= 32) {
    runtimeVersion = RUNTIME_VERSION_LE_132;
  }
  const name = `nodepool-${ nextDefaultSuffix }`;
  const ngConfig = {
    ...CONFIG_ENV.DEFAULT_NODE_GROUP_CONFIG,
    runtime_version: runtimeVersion,
    name,
    isNew:           true,
  };

  nodePools.value.push(ngConfig);
}

function removePool(index) {
  if (changedHistoryK8sVersion.value || ackConfig.value.imported) {
    return;
  }

  const pools = nodePools.value;

  if (
    !pools?.length ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= pools.length ||
    pools.length === 1
  ) {
    return;
  }

  // 如果剩下都是新增的也不让删除原来的节点池
  const remaining = pools.filter((_, i) => i !== index);

  if (remaining?.every((pool) => pool.isNew)) {
    return;
  }

  pullAt(pools, index);
}

function poolIsValid(pool) {
  if (
    !pool.runtime_version ||
    !pool.name ||
    !pool.instance_types?.length ||
    !pool.platform ||
    !ACKValidators.nodePoolSizeValid(pool, intl)
  ) {
    return false;
  }
  const names = nodePools.value?.map((pool) => pool.name) || [];

  return uniqBy(names, (name) => name).length === names.length;
}

function resetNodePool() {
  nodePools.value = nodePools.value?.map((pool) => {
    return {
      ...pool,
      key_pair: '',
    };
  }) || [];
}

onMounted(() => {
  registerAfterHook(saveRoleBindings, 'save-role-bindings');
  if (isImport.value) {
    initImportConfig();
  } else {
    initCustomConfig();
  }
});

// method
function cancelCredential() {
  if (cruresource.value) {
    cruresource.value.emitOrRoute();
  }
}

function setClusterName(name) {
  normanCluster.value['name'] = name;
  ackConfig.value['clusterName'] = name;
}

function changeContainerdVersion(version) {
  syncProxyModeForVersion(version);

  if (props.mode !== _CREATE) {
    return;
  }

  // '1.32.7-aliyun.1' -> minor = 32
  const m = String(version).match(/^(\d+)\.(\d+)\./);
  const minor = m ? Number(m[2]) : NaN;

  if (!Number.isNaN(minor) && minor <= 32) {
    nodePools.value = nodePools.value.map((np) => ({
      ...np,
      runtime_version: RUNTIME_VERSION_LE_132,
    }));
  } else {
    nodePools.value = nodePools.value.map((np) => ({
      ...np,
      runtime_version: RUNTIME_VERSION_LT_132,
    }));
  }
}

async function updateAutoCreateVpc(value) {
  state.value.autoCreateVpc = value;
  if (value === 'auto') {
    updateZones(ackConfig.value.zoneIds);
  } else {
    await initVpcFromOptions();
  }
}

async function initVpcFromOptions() {
  if (isAutoCreateVpc.value) {
    return;
  }
  const vpcOptions = Array.isArray(options.value.vpcOptions) ? options.value.vpcOptions : [];

  if (vpcOptions.length === 0) {
    ackConfig.value.vpcId = '';
    options.value.vswitchOptions = [];
    state.value.vswitchIds = [];
    state.value.zones = new Set();

    return;
  }
  const currentVpcId = ackConfig.value.vpcId;
  const exists = vpcOptions.some((item) => item.value === currentVpcId);

  if (currentVpcId && exists) {
    await handleVpcChange(currentVpcId, { force: true });

    return;
  }
  const defaultVpc = vpcOptions.find((item) => item.raw?.IsDefault) || vpcOptions[0];

  await handleVpcChange(defaultVpc.value, { force: true });
}

function updateZones(value = []) {
  if (!isAutoCreateVpc.value) {
    return;
  }

  state.value.zones = new Set(value);
}

function updateVswitchIds(value) {
  if (isAutoCreateVpc.value) {
    return;
  }
  const zones = [];

  if (value && value.length > 0) {
    value.forEach((vswitchId) => {
      const vswitch = find(options.value.vswitchOptions, (o) => {
        return o.value === vswitchId;
      });

      if (vswitch && vswitch.raw && vswitch.raw.ZoneId) {
        zones.push(vswitch.raw.ZoneId);
      }
    });
  }
  state.value.zones = new Set(zones);
}

function getVpcCidr(vpcId) {
  if (!vpcId) {
    return '';
  }

  const vpc = find(options.value.vpcOptions || [], (o) => o.value === vpcId);

  return vpc?.raw?.CidrBlock || '';
}

function pickFirstNonOverlapping(candidates = [], checks = []) {
  for (const c of candidates) {
    if (!c || !isValidCIDR(c)) {
      continue;
    }

    const ok = checks.every((x) => !x || !doCidrOverlap(c, x));

    if (ok) {
      return c;
    }
  }

  return '';
}

function getAllVpcCidrs() {
  return (options.value.vpcOptions || [])
    .map((o) => o?.raw?.CidrBlock)
    .filter(Boolean);
}

function pickBestNonOverlapping(candidates = [], { preferAllVpc = true, vpcCidr = '', extraBlocks = [] } = {}) {
  const allVpcCidrs = getAllVpcCidrs();

  const primaryBlocks = [
    ...(preferAllVpc ? allVpcCidrs : (vpcCidr ? [vpcCidr] : [])),
    ...(extraBlocks || []),
  ].filter(Boolean);

  let next = pickFirstNonOverlapping(candidates, primaryBlocks);

  if (next) {
    return next;
  }

  if (preferAllVpc) {
    const fallbackBlocks = [
      ...(vpcCidr ? [vpcCidr] : []),
      ...(extraBlocks || []),
    ].filter(Boolean);

    next = pickFirstNonOverlapping(candidates, fallbackBlocks);
    if (next) {
      return next;
    }
  }

  return '';
}

function ensureServiceCidrNotOverlapVpc() {
  const vpcCidr = getVpcCidr(ackConfig.value.vpcId);
  const overlapAll = getAllVpcCidrs();

  if (!overlapAll) {
    return;
  }

  const cur = ackConfig.value.containerCidr;

  if (!cur || !isValidCIDR(cur)) {
    const next = pickBestNonOverlapping(SERVICE_CIDR_CANDIDATES, {
      preferAllVpc: true,
      vpcCidr,
      extraBlocks:  [],
    });

    if (next) {
      ackConfig.value.serviceCidr = next;
    }
  }
}

function ensureContainerCidrNotOverlapVpcOrService() {
  if (!state.value.isFlannel) {
    return;
  }

  const vpcCidr = getVpcCidr(ackConfig.value.vpcId);
  const serviceCidr = ackConfig.value.serviceCidr;
  const cur = ackConfig.value.containerCidr;

  if (!cur || !isValidCIDR(cur)) {
    const next = pickBestNonOverlapping(CONTAINER_CIDR_CANDIDATES, {
      preferAllVpc: true,
      vpcCidr,
      extraBlocks:  [serviceCidr],
    });

    ackConfig.value.containerCidr = next || '';
  }
}

async function fetchRegionResources(regionId) {
  await Promise.all([
    fetchZones(regionId),
    fetchKubernetesMetadata(regionId),
    fetchVpc(regionId),
    fetchInstanceType(regionId),
    fetchKeyPairs(regionId),
  ]);
}

async function handleRegionChange(value) {
  if (ackConfig.value.regionId === value) {
    return;
  }

  ackConfig.value.regionId = value;
  state.value.errors = [];

  const credential = ackConfig.value.aliyun_credential_secret;

  if (!credential || isImport.value) {
    return;
  }

  if (isNewOrUnprovisioned.value) {
    resetConfig();
  }

  try {
    await fetchRegionResources(value);
  } catch (err) {
    if (state.value.errors.length === 0) {
      state.value.errors.push(err);
    }
  }
}

async function handleResourceGroupChange(value) {
  if (ackConfig.value.resourceGroupId === value) {
    return;
  }

  ackConfig.value.resourceGroupId = value;
  state.value.errors = [];

  const credential = ackConfig.value.aliyun_credential_secret;
  const regionId = ackConfig.value.regionId;

  if (!credential || isImport.value || !regionId) {
    return;
  }

  if (isNewOrUnprovisioned.value) {
    resetConfig();
  }

  try {
    await fetchRegionResources(regionId);
  } catch (err) {
    if (state.value.errors.length === 0) {
      state.value.errors.push(err);
    }
  }
}

function handleAckCNIChange(newAckCNI) {
  const oldAckCNI = state.value.ackCNI;

  state.value.ackCNI = newAckCNI;
  state.value.isFlannel = newAckCNI === 'flannel';

  if (oldAckCNI === newAckCNI) {
    return;
  }

  if (state.value.isFlannel) {
    ensureContainerCidrNotOverlapVpcOrService();
  }

  state.value.vswitchIds = [];

  if (newAckCNI) {
    ackConfig.value.addons = [{ name: newAckCNI, config: '' }];
  }
}

async function handleVpcChange(vpcId, { force = false } = {}) {
  // 防止 initVpcFromOptions vpcoptions 第一个值就是默认值事需要强制更新
  if (!force && ackConfig.value.vpcId === vpcId) {
    return;
  }
  ackConfig.value.vpcId = vpcId;
  state.value.errors = [];
  if (!isNewOrUnprovisioned.value) {
    return;
  }
  state.value.zones = new Set();
  ensureServiceCidrNotOverlapVpc();
  ensureContainerCidrNotOverlapVpcOrService();
  if (!vpcId || isAutoCreateVpc.value) {
    options.value.vswitchOptions = [];

    return;
  }
  await fetchVSwitch(vpcId, { initDefault: true });
}

const isImport = ref(route.query.mode === _IMPORT);
const hasCredential = computed(() => {
  return !!ackConfig.value?.aliyun_credential_secret;
});

const CREATE = computed(() => {
  return _CREATE;
});

const VIEW = computed(() => {
  return _VIEW;
});

const isAutoCreateVpc = computed(() => {
  return state.value.autoCreateVpc === 'auto';
});

const isNewOrUnprovisioned = computed(() => {
  return props.mode === _CREATE || !normanCluster.value?.ackStatus?.upstreamSpec;
});

const kubernetesSupport = computed(() => {
  const version = ackConfig.value.kubernetesVersion;

  return {
    rancherEnabled: inSupportedRange(version),
    aliyunEnabled:  inSupportedRange(version),
  };
});

const proxyModeOptions = computed(() => {
  return getProxyModeOptionsForVersion(ackConfig.value.kubernetesVersion);
});

const isNftablesProxyMode = computed(() => ackConfig.value.proxyMode === 'nftables');

const allImagesForVersion = computed(() => {
  const imagesForVersion = options.value.k8sAllImages?.[ackConfig.value?.kubernetesVersion] || [];
  const result = {};

  imagesForVersion.forEach((image) => {
    result[image.image_type] = {
      imageType: image.image_type,
      imageId:   image.image_id,
      label:     image.image_name,
    };
  });

  return result;
});

const ruleSets = computed(() => {
  if (!hasCredential.value) {
    return {};
  }
  const isImportMode = isImport.value || ackConfig.value.imported;
  const commonRules = {
    name: [
      ACKValidators.nameRequired(normanCluster, intl),
    ],
    regionId: [
      ACKValidators.regionIdRequired(ackConfig, intl),
    ],
  };
  const nonImportRules = !isImportMode ? {
    vpcId: !isAutoCreateVpc.value ? [
      ACKValidators.vpcIdRequired(ackConfig, intl),
    ] : [],
    vswitchIds: !isAutoCreateVpc.value ? [
      ACKValidators.vswitchIdsRequired(state, intl),
    ] : [],
    serviceCidr: [
      ACKValidators.serviceCidrRequired(ackConfig, intl),
      ACKValidators.validateServiceCidr(ackConfig, intl),
    ],
    containerCidr: [
      ACKValidators.podCidrRequired(ackConfig, intl, state),
      ACKValidators.validatePodCidr(ackConfig, intl, state),
    ],
    nodePoolName: [
      ACKValidators.nodePoolNameRequired(nodePools, intl),
      ACKValidators.nodePoolNamesUnique(nodePools, intl),
    ],
    runtimeVersion: [
      ACKValidators.runtimeVersionRequired(nodePools, intl),
    ],
    instanceTypes: [
      ACKValidators.instanceTypesRequired(nodePools, intl),
    ],
    instancesNum: [
      ACKValidators.instancesNumRequired(nodePools, intl),
    ],
    minInstances: [
      ACKValidators.minInstancesRequired(nodePools, intl),
    ],
    maxInstances: [
      ACKValidators.maxInstancesRequired(nodePools, intl),
    ],
    systemDiskCategory: [
      ACKValidators.systemDiskCategoryRequired(nodePools, intl),
    ],
    diskSize: [
      ACKValidators.diskSizeRequired(nodePools, intl),
    ],
    dataDiskSize: [
      ACKValidators.dataDiskSizeRequired(nodePools, intl),
    ],
    platform: [
      ACKValidators.platformRequired(nodePools, intl),
    ],
  } : {};
  const importRules = isImportMode ? {
    clusterId: [
      ACKValidators.clusterIdRequired(ackConfig, intl),
    ],
  } : {};

  return {
    ...commonRules,
    ...nonImportRules,
    ...importRules,
  };
});

const fvFormIsValid = computed(() => {
  const rules = ruleSets.value || {};
  let isValid = true;

  for (const key in rules) {
    const validators = rules[key] || [];

    if (!validators.length) {
      continue;
    }
    for (const validate of validators) {
      const result = validate();

      if (result) {
        isValid = false;
        break;
      }
    }
    if (!isValid) {
      break;
    }
  }

  return isValid;
});

const validationMessages = computed(() => {
  const rules = ruleSets.value || {};
  const messages = Object.keys(rules).map((key) => {
    const validators = rules[key] || [];

    return validators.map((validate) => {
      const result = validate();

      return typeof result === 'string' ? result.trim() : result;
    });
  });

  return uniq(compact(flatten(messages)));
});

const changedHistoryK8sVersion = computed(() => {
  if (!isNewOrUnprovisioned.value) {
    return state.value.historyK8sVersion && state.value.historyK8sVersion !== ackConfig.value.kubernetesVersion;
  }

  return false;
});

// watch
watch(() => ackConfig.value.aliyun_credential_secret, async(credential) => {
  state.value.errors = [];

  if (!credential) {
    return;
  }

  try {
    const tasks = [];

    if (isImport.value) {
      tasks.push(fetchImportALiyunResource());
    } else {
      tasks.push(fetchALiyunResource());

      if (ackConfig.value.regionId) {
        tasks.push(
          fetchZones(ackConfig.value.regionId),
          fetchKubernetesMetadata(ackConfig.value.regionId),
          fetchVpc(ackConfig.value.regionId),
          fetchInstanceType(ackConfig.value.regionId),
          fetchKeyPairs(ackConfig.value.regionId),
        );
      }
    }

    await Promise.all(tasks);
  } catch (err) {
    if (state.value.errors.length === 0) {
      state.value.errors.push(err);
    }
  }
}, { immediate: true });

watch(() => state.value.vswitchIds, async(vswitchIds) => {
  if (!state.value.isFlannel) {
    ackConfig.value.podVswitchIds = vswitchIds;
  }
});

watch(
  () => state.value.ackCNI,
  (newAckCNI) => {
    state.value.isFlannel = newAckCNI === 'flannel';
  },
  { immediate: true }
);

watch(() => normanCluster.value.name, (name) => {
  if (isNewOrUnprovisioned.value) {
    if (ackConfig.value.imported) {
      ackConfig.value.cluster_name = name;
    } else {
      ackConfig.value.displayName = name;
      ackConfig.value.name = name;
    }
  }
});

</script>

<template>
  <Loading v-if="state.loading" />
  <CruResource
    v-else
    ref="cruresource"
    :resource="value"
    :mode="mode"
    :can-yaml="false"
    :done-route="doneRoute"
    :validation-passed="fvFormIsValid"
    @error="e=>errors=e"
    @finish="save"
  >
    <SelectCredential
      v-model:value="ackConfig.aliyun_credential_secret"
      data-testid="cruaks-select-credential"
      :mode="mode === VIEW ? VIEW : CREATE"
      provider="aliyun"
      :default-on-cancel="true"
      :showing-form="hasCredential"
      class="mt-20"
      :cancel="cancelCredential"
    />
    <div
      v-if="hasCredential"
      class="mt-10"
      data-testid="cruaks-form"
    >
      <div
        v-if="isImport"
      >
        <ImportAck
          v-model:name="normanCluster.name"
          v-model:description="normanCluster.description"
          v-model:clusterId="ackConfig.cluster_id"
          v-model:regionId="ackConfig.regionId"
          :regionOptions="options.regionOptions"
          :ackConfig="ackConfig"
          :rules="{
            name: ruleSets.name,
            regionId: ruleSets.regionId,
            clusterId: ruleSets.clusterId,
          }"
          @errors="e =>state.errors=e"
        />
        <Banner
          v-for="(err, i) in state.errors"
          :key="i"
          color="error"
          :label="stringify(err)"
        />
      </div>
      <div
        v-else
      >
        <Banner
          v-for="(err, i) in state.errors"
          :key="i"
          color="error"
          :label="stringify(err)"
        />
        <div class="row mb-10">
          <div class="col span-6">
            <LabeledInput
              :value="normanCluster.name"
              :mode="mode"
              label-key="generic.name"
              required
              :rules="ruleSets.name"
              @update:value="setClusterName"
            />
          </div>
          <div class="col span-6">
            <LabeledInput
              v-model:value="normanCluster.description"
              :mode="mode"
              label-key="nameNsDescription.description.label"
              :placeholder="intl('nameNsDescription.description.placeholder')"
            />
          </div>
        </div>
        <div
          class="m-0 mb-10 card-container"
        >
          <div>
            <H3 class="title">
              {{ intl('ackCn.clusterBasicInfo.title') }}
            </h3>
          </div>
          <div class="row mb-10">
            <div
              class="col span-4"
            >
              <LabeledSelect
                :value="ackConfig.resourceGroupId"
                data-testid="cruack-resourceGroup"
                :mode="mode"
                :options="options.resourceGroupOptions"
                option-label="label"
                option-key="value"
                :loading="state.regionAndResourceGroupLoading"
                label-key="ackCn.resourceGroup.label"
                :disabled="!isNewOrUnprovisioned"
                @update:value="handleResourceGroupChange"
              />
            </div>
            <div
              class="col span-4"
            >
              <LabeledSelect
                :value="ackConfig.regionId"
                data-testid="cruack-resourceGroup"
                required
                :mode="mode"
                :options="options.regionOptions"
                option-label="label"
                option-key="value"
                :loading="state.regionAndResourceGroupLoading"
                label-key="ackCn.region.label"
                :disabled="!isNewOrUnprovisioned"
                :rules="ruleSets.regionId"
                @update:value="handleRegionChange"
              />
            </div>
            <div
              class="col span-4"
            >
              <LabeledInputSelect
                v-model:value="ackConfig.kubernetesVersion"
                :mode="mode"
                :options="options.k8sVersionOptions"
                label-key="ackCn.version.label"
                :loading="state.k8sVersionOptionsLoading"
                :disabled="ackConfig.imported"
                @update:value="changeContainerdVersion($event)"
              />
            </div>
          </div>
          <ClusterPlanSelector
            v-if="!ackConfig.imported"
            v-model="ackConfig.clusterSpec"
            :disabled="!isNewOrUnprovisioned"
            :options="CONFIG_ENV.ACK_CLUSTER_SPEC_OPTIONS"
            :intl="intl"
          />
        </div>
        <div
          v-if="!kubernetesSupport.rancherEnabled || !kubernetesSupport.aliyunEnabled || changedHistoryK8sVersion"
        >
          <Banner
            v-if="!kubernetesSupport.rancherEnabled && !ackConfig.imported && !state.k8sVersionOptionsLoading"
            color="warning"
            label-key="ackCn.version.warningRacher"
          />
          <Banner
            v-if="!kubernetesSupport.aliyunEnabled && !ackConfig.imported && !state.k8sVersionOptionsLoading"
            color="warning"
            :label="intl('ackCn.version.warningAliyun', { version: ackConfig.kubernetesVersion })"
          />
          <Banner
            v-if="changedHistoryK8sVersion && !ackConfig.imported"
            color="warning"
            :label="intl('ackCn.changedHistoryK8sVerison')"
          />
        </div>
        <div
          v-if="!ackConfig.imported"
          class="m-0 mb-10 card-container"
        >
          <div>
            <H3 class="title">
              {{ intl('ackCn.cni.title') }}
            </H3>
          </div>
          <div class="row">
            <div
              class="col span-6"
            >
              <LabeledSelect
                :value="state.ackCNI"
                data-testid="cruack-ackcni"
                :mode="mode"
                :options="CONFIG_ENV.ACK_CNI_OPTIONS"
                option-label="label"
                option-key="value"
                label-key="ackCn.cni.label"
                :disabled="!isNewOrUnprovisioned"
                @update:value="handleAckCNIChange"
              />
            </div>
            <div
              class="col span-6 desc-info"
            >
              <Icon class="icon-info" />
              <div>
                <span
                  v-if="!state.isFlannel"
                  class="type-description"
                >
                  {{ intl('ackCn.cni.description.terway') }}
                </span>
                <span
                  v-else
                  class="type-description"
                >
                  {{ intl('ackCn.cni.description.flannel') }}
                </span>
              </div>
            </div>
          </div>
          <div class="row mt-10">
            <div
              class="col span-6"
            >
              <LabeledSelect
                v-model:value="ackConfig.proxyMode"
                data-testid="cruack-proxy-mode"
                :mode="mode"
                :options="proxyModeOptions"
                option-label="label"
                option-key="value"
                label-key="ackCn.proxyMode.label"
                :disabled="!isNewOrUnprovisioned"
              />
              <div
                v-if="isNftablesProxyMode"
                class="proxy-mode-hint"
              >
                <Banner
                  color="warning"
                  label-key="ackCn.proxyMode.nftablesKernelWarning"
                />
              </div>
            </div>
            <div
              class="col span-6"
            >
              <LabeledSelect
                v-model:value="ackConfig.nodeCidrMask"
                data-testid="cruack-node-cidr-mask"
                :mode="mode"
                :options="CONFIG_ENV.NODECIDRMASKS"
                option-label="label"
                option-key="value"
                label-key="ackCn.nodeCidrMask.label"
                :disabled="!isNewOrUnprovisioned"
              />
            </div>
          </div>
          <div class="row mt-10">
            <div class="col span-6">
              <div
                class="cluster-cidr-field"
                :class="{ 'cluster-cidr-field--loading': state.vpcLoading }"
              >
                <LabeledInput
                  v-model:value="ackConfig.serviceCidr"
                  :mode="mode"
                  tooltipKey="ackCn.serviceCidr.placeholder"
                  label-key="ackCn.serviceCidr.label"
                  :disabled="!isNewOrUnprovisioned"
                  required
                  :rules="ruleSets.serviceCidr"
                />
                <div
                  v-if="state.vpcLoading"
                  class="cluster-cidr-field__overlay"
                >
                  <i class="icon icon-spinner icon-spin icon-lg" />
                </div>
              </div>
            </div>
            <div class="col span-6">
              <div
                v-if="state.isFlannel"
                class="cluster-cidr-field"
                :class="{ 'cluster-cidr-field--loading': state.vpcLoading }"
              >
                <LabeledInput
                  v-model:value="ackConfig.containerCidr"
                  :mode="mode"
                  tooltipKey="ackCn.containerCidr.placeholder"
                  label-key="ackCn.containerCidr.label"
                  :disabled="!isNewOrUnprovisioned"
                  required
                  :rules="ruleSets.containerCidr"
                />
                <div
                  v-if="state.vpcLoading"
                  class="cluster-cidr-field__overlay"
                >
                  <i class="icon icon-spinner icon-spin icon-lg" />
                </div>
              </div>
            </div>
          </div>
          <div class="row mt-10">
            <div class="col span-12">
              <Checkbox
                v-model:value="ackConfig.endpointPublicAccess"
                :mode="mode"
                :disabled="!isNewOrUnprovisioned"
                label-key="ackCn.endpointPublicAccess.label"
                required
              />
            </div>
          </div>
          <div class="pd-10">
            <div class="mt-10">
              <h3 class="title">
                {{ intl('ackCn.cni.privateNetwork') }}
              </h3>
              <p class="type-description">
                {{ intl('ackCn.cni.autoCreateVpc.label') }}
              </p>
            </div>
            <div class="row mt-10">
              <div
                v-if="isNewOrUnprovisioned"
                class="col span-2"
              >
                <RadioGroup
                  v-model:value="state.autoCreateVpc"
                  name="autoCreateVpc"
                  :mode="mode"
                  :disabled="!isNewOrUnprovisioned"
                  :labels="[intl('ackCn.cni.autoCreateVpc.autoCreateVpcTip'), intl('ackCn.cni.autoCreateVpc.useAlreadyCreatedVpcTip')]"
                  :options="['auto','custom']"
                  @update:value="updateAutoCreateVpc"
                />
              </div>
              <div class="col span-10">
                <div class="row">
                  <div
                    v-if="isAutoCreateVpc"
                    class="col span-8"
                  >
                    <LabeledMultiSelect
                      v-model:value="ackConfig.zoneIds"
                      :mode="mode"
                      :options="options.zoneOptions"
                      :disabled="!isNewOrUnprovisioned"
                      label-key="ackCn.zone.label"
                      :loading="state.zoneLoading"
                      @update:value="updateZones"
                    />
                  </div>
                </div>
                <div :class="{'row': true, 'mt-10': !isNewOrUnprovisioned && isAutoCreateVpc}">
                  <div
                    v-if="!isAutoCreateVpc || !isNewOrUnprovisioned"
                    class="col span-12"
                  >
                    <div class="row">
                      <div
                        class="col span-8"
                      >
                        <LabeledSelect
                          :value="ackConfig.vpcId"
                          required
                          data-testid="cruack-vpc"
                          :mode="mode"
                          :options="options.vpcOptions"
                          option-label="label"
                          option-key="value"
                          label-key="ackCn.vpcId.label"
                          :loading="state.vpcLoading"
                          :disabled="!isNewOrUnprovisioned"
                          :rules="ruleSets.vpcId"
                          :placeholder="intl('ackCn.vpcId.prompt')"
                          @update:value="handleVpcChange"
                        />
                      </div>
                    </div>
                    <div class="row mt-10">
                      <div class="col span-8">
                        <LabeledMultiSelect
                          v-model:value="state.vswitchIds"
                          required
                          :mode="mode"
                          :options="options.vswitchOptions"
                          :disabled="!isNewOrUnprovisioned"
                          :rules="ruleSets.vswitchIds"
                          label-key="ackCn.vswitchId.label"
                          :loading="state.vswitchLoading"
                          @update:value="updateVswitchIds"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="row mt-10">
              <div class="col span-6">
                <Checkbox
                  v-model:value="ackConfig.snatEntry"
                  :mode="mode"
                  label-key="ackCn.snatEntry.label"
                  :disabled="!isNewOrUnprovisioned"
                  required
                />
              </div>
            </div>
          </div>
        </div>
        <div class="m-0 mb-10 card-container">
          <div>
            <h3 class="title">
              {{ intl('ackCn.deletionProtection.label') }}
            </h3>
          </div>
          <p class="type-description">
            {{ intl('ackCn.deletionProtection.help') }}
          </p>
          <div class="mt-10">
            <RadioGroup
              v-model:value="ackConfig.deletionProtection"
              name="deletionProtection"
              :options="[true, false]"
              :disabled="ackConfig.imported"
              :labels="options.deletionProtectionOptions"
              :mode="mode"
            />
          </div>
        </div>
        <Tabbed
          ref="pools"
          :side-tabs="true"
          :show-tabs-add-remove="mode !== 'view'"
          class="mb-20"
          @addTab="addPool()"
          @removeTab="removePool($event)"
        >
          <Tab
            v-for="(pool, i) in nodePools"
            :key="i"
            :weight="-i"
            :name="`${pool.name} ${i}`"
            :label="pool.name"
            :error="!poolIsValid(pool)"
          >
            <NodePool
              v-model:name="pool.name"
              v-model:runtimeVersion="pool.runtime_version"
              v-model:instanceTypes="pool.instance_types"
              v-model:instancesNum="pool.instances_num"
              v-model:systemDiskCategory="pool.system_disk_category"
              v-model:systemDiskSize="pool.system_disk_size"
              v-model:autoScalingEnabled="pool.auto_scaling_enabled"
              v-model:minInstances="pool.min_instances"
              v-model:maxInstances="pool.max_instances"
              v-model:dataDisks="pool.data_disk"
              v-model:platform="pool.platform"
              v-model:keyPair="pool.key_pair"
              :isNew="pool.isNew"
              :isNewOrUnprovisioned="isNewOrUnprovisioned"
              :ackConfig="ackConfig"
              :disabled="(!isNewOrUnprovisioned && !pool.isNew) || changedHistoryK8sVersion"
              :disabledInstancesNum="changedHistoryK8sVersion"
              :allInstanceTypeOptions="options.allInstanceTypeOptions"
              :keyPairOptions="options.keyPairOptions"
              :allImagesForVersion="allImagesForVersion"
              :instanceTypeLoading="state.instanceTypeLoading"
              :keyPairLoading="state.keyPairLoading"
              :zones="state.zones"
              :rules="{
                name: ruleSets.nodePoolName,
                runtimeVersion: ruleSets.runtimeVersion,
                instanceTypes: ruleSets.instanceTypes,
                instancesNum: ruleSets.instancesNum,
                count: ruleSets.instancesNum,
                minInstances: ruleSets.minInstances,
                maxInstances: ruleSets.maxInstances,
                systemDiskCategory: ruleSets.systemDiskCategory,
                diskSize: ruleSets.diskSize,
                dataDiskSize: ruleSets.dataDiskSize,
                platform: ruleSets.platform,
              }"
              :mode="mode"
              @errors="e=>state.errors=e"
            />
          </Tab>
        </Tabbed>
        <FloatingHelpPanel
          :title="intl('ackCn.fields.help')"
          :items="validationMessages"
          :close-label="intl('generic.close')"
        />
      </div>
      <div>
        <Accordion
          class="mb-20"
          title-key="cluster.agentConfig.tabs.cluster"
        >
          <AgentConfiguration
            v-model:value="normanCluster.clusterAgentDeploymentCustomization"
            :mode="mode"
            type="cluster"
          />
        </Accordion>
        <Accordion
          class="mb-20"
          title-key="cluster.agentConfig.tabs.fleet"
        >
          <AgentConfiguration
            v-model:value="normanCluster.fleetAgentDeploymentCustomization"
            :mode="mode"
            type="fleet"
          />
        </Accordion>
        <Accordion
          class="mb-20"
          title-key="members.memberRoles"
        >
          <Banner
            v-if="isEditMode"
            color="info"
          >
            {{ intl('cluster.memberRoles.removeMessage') }}
          </Banner>
          <ClusterMembershipEditor
            v-if="canManageMembers"
            :mode="mode"
            :parent-id="normanCluster.id ? normanCluster.id : undefined"
            @membership-update="onMembershipUpdate"
          />
        </Accordion>
        <Accordion
          class="mb-20"
          :title="intl('generic.labelsAndAnnotations')"
        >
          <Labels
            v-model:value="normanCluster"
            :mode="mode"
          />
        </Accordion>
        <Accordion
          class="mb-20 accordion"
          title-key="imported.accordions.registries"
          data-testid="registries-accordion"
          :open-initially="false"
        >
          <PrivateRegistry
            v-if="normanCluster.importedConfig"
            v-model:value="normanCluster.importedConfig.privateRegistryURL"
            v-model:pull-secret="pullSecrets"
            v-model:enabled="state.privateRegistryEnabled"
            :context="PRIVATE_REGISTRY_CONTEXT.IMPORTING"
            :mode="mode"
            :register-before-hook="registerBeforeHook"
            checkbox-test-id="private-registry-enable-checkbox"
            input-test-id="private-registry-url"
          />
        </Accordion>
      </div>
    </div>
    <template
      v-if="!hasCredential"
      #form-footer
    >
      <div><!-- Hide the outer footer --></div>
    </template>
  </CruResource>
</template>

<style lang='scss' scoped>
 .card-container {
    &.highlight-border {
      border-left: 5px solid var(--primary);
    }
    border-radius: var(--border-radius);
    flex-basis: 40%;
    margin: 10px;
    min-height: 100px;
    padding: 10px;
    box-shadow: 0 0 20px var(--shadow);
 }
 .type-description {
  color: var(--input-label);
 }
 .proxy-mode-hint {
  margin-top: 10px;
 }
 .title {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 10px;
  }
  .desc-info {
    DIV {
      padding: 5px 0px;
      max-height: 61px;
      overflow: auto
    }
    Icon{
      color: var(--on-tertiary, var(--link));
      margin: 0px 10px;
    }
    justify-content: center;
    align-items: center;
    display: flex;
    background: linear-gradient(51deg, rgb(111 210 74 / 0.12), rgba(34, 239, 171, 0));
    border-radius: var(--border-radius);
  }
  .cluster-cidr-field {
  position: relative;
  }
  .cluster-cidr-field__overlay {
    position: absolute;
    inset: 8px 0 0 0;
    z-index: 3;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 60px;
    border-radius: var(--border-radius);
    background: rgba(255, 255, 255, 0.55);
    cursor: wait;
  }
  .cluster-cidr-field--loading {
    pointer-events: auto;
  }
  .cluster-cidr-field__icon {
    color: var(--error);
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
  }
</style>
