<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';
import { NORMAN } from '@shell/config/types';
import CruResource from '@shell/components/CruResource.vue';
import Checkbox from '@components/Form/Checkbox/Checkbox.vue';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import Banner from '@components/Banner/Banner.vue';
import TKEValidators from '../util/validators';
import { stringify } from '@shell/utils/error';
import GroupPanel from '@shell/components/GroupPanel';
import SelectCredential from '@shell/edit/provisioning.cattle.io.cluster/SelectCredential.vue';
import { useCreateEditView } from '../composables/useCreateEditView.js';
import { CREATOR_PRINCIPAL_ID } from '@shell/config/labels-annotations';
import { _CREATE, _IMPORT, _VIEW } from '@shell/config/query-params';
import { RadioGroup } from '@components/Form/Radio';
import Tab from '@shell/components/Tabbed/Tab.vue';
import Accordion from '@components/Accordion/Accordion.vue';
import Tabbed from '@shell/components/Tabbed/index.vue';
import { queryFromTencent } from '../util/request';
import Labels from '@shell/components/form/Labels.vue';
import { isBase64 } from '@shell/utils/string';
import { base64Decode } from '@shell/utils/crypto';
import TkeCsiCardSelect from './TkeCsiCardSelect';
import TkeNodePoolTypeForm from './TkeNodePoolTypeForm';
import TkeNetworkConfigForm from './TkeNetworkConfigForm';
import FloatingHelpPanel from './FloatingHelpPanel.vue';
import ImportTke from './ImportTke';
import MasterNode from './MasterNode';
import {
  find, pullAt, uniq, compact, flatten, cloneDeep
} from 'lodash';
import CONFIG_ENV from '../util/config';
import { DoCidrOverlap } from '../util/util';

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
const store = useStore();
const intl = computed(() => store.getters['i18n/t']);
const tkeConfig = ref({});
const normanCluster = ref({});
const cruresource = ref(null);
const nodePools = ref([]);
const recordNodePools = ref([]);
const route = useRoute();
const isImport = route?.query?.mode === _IMPORT;
const options = ref({
  regionOptions:        [],
  clusterLevelOptions:  [],
  versionOptions:       [],
  zoneOptions:          [],
  vpcOptions:           [],
  keyPairOptions:       [],
  securityGroupOptions: [],
  clusterOptions:       [],
  DiskConfigQuota:      [],
  csiOptions:           [
    {
      label: 'CBS',
      value: 'CBS',
    },
    {
      label: 'COS',
      value: 'COS',
    },
    {
      label: 'CFSTurbo',
      value: 'CFSTurbo',
    },
    {
      label: 'CFS',
      value: 'CFS',
    },
  ],
  deletionProtectionOptions: [
    intl.value('generic.enabled'),
    intl.value('generic.disabled'),
  ],
  ipvsOptions: [
    intl.value('generic.enabled'),
    intl.value('generic.disabled'),
  ],
  clusterEndpointOptions: [
    intl.value('tkeCn.proxy.outer'),
    intl.value('tkeCn.proxy.inner'),
  ],
  networkTypeOptions: [
    {
      label: intl.value('tkeCn.networkType.globalRouter'),
      value: 'GR',
    },
    {
      label: intl.value('tkeCn.networkType.vpcCni'),
      value: 'VPC-CNI',
    },
  ],
});
const state = ref({
  loading:                      false,
  regionLoading:                false,
  clusterLevelAttributeLoading: false,
  instanceTypeLoading:          false,
  clusterVersionLoading:        false,
  zoneIdLoading:                false,
  vpcIdLoading:                 false,
  subnetLoading:                false,
  securityGroupLoading:         false,
  showPrivateRegistryInput:     false,
  clusterCidrValidating:        false,
  clusterCidrConflictError:     '',
  serviceCidrValidating:        false,
  serviceCidrConflictError:     '',
  userData:                     '',
  instanceTypeSet:              {},
  allSubnets:                   [],
  errors:                       [],
  upgradeTip:                   '',
  csi:                          ['CBS'],
});
const emit = defineEmits(['done']);
const isManagedCluster = computed(() => {
  return tkeConfig.value.clusterType === 'MANAGED_CLUSTER';
});
// input
const ruleSets = computed(() => {
  const importCluster = isImport || tkeConfig.value.imported;
  const name = normanCluster.value.name;
  const region = tkeConfig.value.region;
  const container = tkeConfig.value.container;
  const clusterType = tkeConfig.value.clusterType;
  const clusterLevel = tkeConfig.value.clusterLevel;
  const clusterVersion = tkeConfig.value.clusterVersion;
  const clusterID = tkeConfig.value.clusterId;
  const zoneId = tkeConfig.value.zoneId;
  const vpcId = tkeConfig.value.vpcId;
  const subnetId = tkeConfig.value.subnetId;
  const osName = tkeConfig.value.osName;
  const clusterCidr = tkeConfig.value.clusterCidr;
  const securityGroup = tkeConfig.value.securityGroup;
  const instanceType = tkeConfig.value.instanceType;
  const networkType = tkeConfig.value.networkType || 'GR';
  const serviceCidr = tkeConfig.value.serviceCidr;
  const clusterEndpoint = tkeConfig.value.clusterEndpoint;
  const eniSubnetIds = tkeConfig.value.eniSubnetIds || [];
  const copyNodePools = nodePools.value.map((pool) => {
    return {
      nodePoolName:    pool.nodePoolName,
      instanceType:    pool.instanceType,
      osName:          pool.osName,
      systemDiskType:  pool.systemDiskType,
      subnetId:        pool.subnetId,
      keyPair:         pool.keyPair,
      securityGroup:   pool.securityGroup,
      nodePoolType:    pool.nodePoolType,
      virtualNodePool: pool.virtualNodePool,
    };
  });

  return {
    name: [
      TKEValidators.nameRequired({ name }, intl),
    ],
    region: [
      TKEValidators.regionIdRequired({ region }, intl),
    ],
    container: !importCluster ? [
      TKEValidators.containerRequired({ container }, intl),
    ] : [],
    clusterType: !importCluster ? [
      TKEValidators.clusterTypeRequired({ clusterType }, intl),
    ] : [],
    clusterLevel: !importCluster && isManagedCluster.value ? [
      TKEValidators.clusterLevelRequired({ clusterLevel }, intl),
    ] : [],
    clusterVersion: !importCluster ? [
      TKEValidators.clusterVersionRequired({ clusterVersion }, intl),
    ] : [],
    zoneId: !importCluster && !isManagedCluster.value && !clusterEndpoint ? [
      TKEValidators.zoneIdRequired({ zoneId }, intl),
    ] : [],
    vpc: !importCluster ? [
      TKEValidators.vpcIdRequired({ vpcId }, intl),
    ] : [],
    subnet: !importCluster && !clusterEndpoint ? [
      TKEValidators.subnetIdRequired({ subnetId }, intl),
    ] : [],
    clusterCidr: !importCluster && networkType === 'GR' ? [
      TKEValidators.clusterCidrRequired({ clusterCidr }, intl),
      TKEValidators.clusterCidrValidate({ clusterCidr }, intl),
    ] : [],
    securityGroup: !importCluster && clusterEndpoint ? [
      TKEValidators.securityGroupRequired({ securityGroup }, intl),
    ] : [],
    serviceCidr: !importCluster && networkType === 'VPC-CNI' ? [
      TKEValidators.serviceCidrRequired({ serviceCidr }, intl),
      TKEValidators.serviceCidrValidate({ serviceCidr }, intl),
    ] : [],
    eniSubnetIds: !importCluster && networkType === 'VPC-CNI' ? [
      TKEValidators.eniSubnetIdsRequired({ eniSubnetIds }, intl),
    ] : [],
    nodePoolName: !importCluster ? [
      TKEValidators.nodePoolNameRequired(copyNodePools, intl),
      TKEValidators.nodePoolNamesUnique(copyNodePools, intl),
    ] : [],
    instanceType: !importCluster ? [
      TKEValidators.instanceTypeRequired(copyNodePools, intl),
    ] : [],
    nodePoolOsNameRequired: !importCluster ? [
      TKEValidators.nodePoolOsNameRequired(copyNodePools, intl),
    ] : [],
    systemDiskTypeRequired: !importCluster ? [
      TKEValidators.systemDiskTypeRequired(copyNodePools, intl),
    ] : [],
    nodePoolSubnetIdRequired: !importCluster ? [
      TKEValidators.nodePoolSubnetIdRequired(copyNodePools, intl),
    ] : [],
    nodePoolSecurityGroupRequired: !importCluster ? [
      TKEValidators.nodePoolSecurityGroupRequired(copyNodePools, intl),
    ] : [],
    virtualNodePoolRequired: !importCluster ? [
      TKEValidators.virtualNodePoolRequired(copyNodePools, intl),
    ] : [],
    masterInstanceType: !importCluster && !isManagedCluster.value ? [
      TKEValidators.masterInstanceTypeRequired({ instanceType }, intl),
    ] : [],
    masterOsNameRequired: !importCluster && !isManagedCluster.value ? [
      TKEValidators.osNameRequired({ osName }, intl),
    ] : [],
    clusterID: importCluster ? [
      TKEValidators.clusterIDRequired({ clusterID }, intl),
    ] : [],
  };
});
// save
const fvFormIsValid = computed(() => {
  const rules = ruleSets.value;
  let isValid = true;

  for (const key in rules) {
    const validators = rules[key];

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
  if ((tkeConfig.value.networkType || 'GR') === 'GR' && state.value.clusterCidrConflictError) {
    isValid = false;
  }
  if ((tkeConfig.value.networkType || 'GR') === 'VPC-CNI' && state.value.serviceCidrConflictError) {
    isValid = false;
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

  if ((tkeConfig.value.networkType || 'GR') === 'GR' && state.value.clusterCidrConflictError) {
    messages.push([state.value.clusterCidrConflictError.trim()]);
  }
  if ((tkeConfig.value.networkType || 'GR') === 'VPC-CNI' && state.value.serviceCidrConflictError) {
    messages.push([state.value.serviceCidrConflictError.trim()]);
  }

  return uniq(compact(flatten(messages)));
});
const kubernetesSupport = computed(() => {
  const version = tkeConfig.value.clusterVersion;

  if (options.value.versionOptions.length === 0 || !version) {
    return { rancherDisabled: false };
  }
  const matched = find(options.value.versionOptions, { value: version }) || {};

  return { rancherDisabled: !matched.rancherEnabled };
});
const subnetOptions = computed(() => {
  if (!state.value.allSubnets) {
    return [];
  }
  const zoneId = tkeConfig.value.zoneId;
  const vpcId = tkeConfig.value.vpcId;
  const subnetsOptions = state.value.allSubnets?.filter((subnet) => {
    if (zoneId) {
      return subnet.vpcId === vpcId && subnet.zone === zoneId;
    }

    return subnet.vpcId === vpcId;
  });

  return subnetsOptions || [];
});
const subnetOptionsForNodePool = computed(() => {
  if (!state.value.allSubnets) {
    return [];
  }
  const vpcId = tkeConfig.value.vpcId;
  const subnetsOptions = state.value.allSubnets?.filter((subnet) => {
    return subnet.vpcId === vpcId;
  });

  return subnetsOptions || [];
});
const imageOptions = computed(() => {
  const out = [];

  CONFIG_ENV.OS_IMAGE.forEach((image) => {
    out.push({
      label: image.Alias,
      value: image.OsName,
    });
  });

  return out.sort((a, b) => a.label > b.label ? -1 : 1);
});
const instanceTypeOptions = computed(() => {
  const allInstances = state.value.instanceTypeSet || {};

  if (!allInstances) {
    return {};
  }

  return allInstances;
});
const clusterActive = computed(() => {
  if (!isNewOrUnprovisioned.value) {
    return normanCluster.value.state === 'active';
  }

  return true;
});
const CREATE = computed(() => {
  return _CREATE;
});
const VIEW = computed(() => {
  return _VIEW;
});
const {
  save,
  doneRoute,
} = useCreateEditView(props, {
  emit, normanCluster, tkeConfig, nodePools, state
});
const hasCredential = computed(() => {
  return !!tkeConfig.value?.tkeCredentialSecret;
});
const isNewOrUnprovisioned = computed(() => {
  return props.mode === _CREATE || !normanCluster.value?.tkeStatus?.upstreamSpec;
});

function cancelCredential() {
  if (cruresource.value) {
    cruresource.value.emitOrRoute();
  }
}

function setClusterName(name) {
  normanCluster.value['name'] = name;
}

function handleCsiChange(value) {
  const selectedValues = Array.isArray(value) ? [...value] : (value ? [value] : []);

  if (!selectedValues.includes('CBS')) {
    selectedValues.unshift('CBS');
  }

  const components = selectedValues
    .map((key) => {
      const addon = CONFIG_ENV.CSI_ADDON_MAP[key];

      if (!addon) {
        return null;
      }

      return {
        addonName:  addon.addonName,
        addonParam: {
          kind: 'App',
          spec: {
            chart: {
              chartName:    addon.chartName,
              chartVersion: addon.chartVersion,
            },
            values: {
              values:        [],
              rawValues:     'e30=',
              rawValuesType: 'json',
            },
          },
        },
      };
    })
    .filter(Boolean);

  tkeConfig.value.component = JSON.stringify(components);
}

function resetConfig() {
  if (!isNewOrUnprovisioned.value) {
    return;
  }
  tkeConfig.value.subnetId = '';
  tkeConfig.value.securityGroup = '';
  tkeConfig.value.vpcId = '';
  tkeConfig.value.zoneId = '';
  nodePools.value = nodePools.value.map((pool) => {
    const virtualNodes = (pool.virtualNodePool?.virtualNodes || []).map((node) => {
      return {
        ...node,
        subnetId: '',
      };
    });

    return {
      ...pool,
      subnetId:        [],
      securityGroup:   '',
      keyPair:         '',
      instanceType:    '',
      osName:          '',
      virtualNodePool: {
        ...pool.virtualNodePool,
        virtualNodes,
        securityGroupIds: [],
      },
    };
  });
}

async function initImportConfig() {
  state.value.loading = true;
  state.value.errors = [];
  normanCluster.value = await store.dispatch('rancher/create', { type: NORMAN.CLUSTER }, { root: true });

  const principalId = store.getters['auth/principalId'];

  if (principalId.includes('local://')) {
    normanCluster.value.annotations = { ...normanCluster.value.annotations, [CREATOR_PRINCIPAL_ID]: principalId };
  }

  if (!normanCluster?.value?.tkeConfig) {
    tkeConfig.value = {
      imported:            true,
      name:                '',
      tkeCredentialSecret: '',
      clusterId:           '',
      clusterEndpoint:     true,
      region:              '',
    };
    if (!normanCluster.value?.importedConfig?.privateRegistryURL) {
      normanCluster.value.importedConfig = { privateRegistryURL: null };
    }
  } else {
    fixConfig(normanCluster.value.tkeConfig);
    if (normanCluster.value?.importedConfig?.privateRegistryURL) {
      state.value.showPrivateRegistryInput = true;
    }
  }

  state.value.loading = false;
}

async function initCustomConfig() {
  state.value.loading = true;
  state.value.errors = [];
  if (props.value.id) {
    const liveNormanCluster = await props.value.findNormanCluster();

    normanCluster.value = await store.dispatch(`rancher/clone`, { resource: liveNormanCluster });
    if (normanCluster.value.tkeConfig) {
      fixConfig(normanCluster.value.tkeConfig);
    }
    if (!normanCluster.value?.importedConfig?.privateRegistryURL) {
      normanCluster.value.importedConfig = { privateRegistryURL: null };
    }
    if (normanCluster.value?.importedConfig?.privateRegistryURL) {
      state.value.showPrivateRegistryInput = true;
    }
  } else {
    normanCluster.value = await store.dispatch('rancher/create', { type: NORMAN.CLUSTER }, { root: true });
    if (!normanCluster.value?.importedConfig?.privateRegistryURL) {
      normanCluster.value.importedConfig = { privateRegistryURL: null };
    }
    const principalId = store.getters['auth/principalId'];

    if (principalId.includes('local://')) {
      normanCluster.value.annotations = { ...normanCluster.value.annotations, [CREATOR_PRINCIPAL_ID]: principalId };
    }

    nodePools.value = [{ ...CONFIG_ENV.DEFAULT_NODE_GROUP_CONFIG }];
    tkeConfig.value = { ...CONFIG_ENV.DEFAULTTKECONFIG };
  }
  state.value.loading = false;
}

function fixConfig(config) {
  const nodePool = [];
  const {
    clusterEndpoint = {},
    clusterBasicSettings = {},
    clusterCIDRSettings = {},
    nodePoolList = [],
    runInstancesForNode = {},
    clusterAdvancedSettings = {},
    extensionAddon = [],
    virtualNodePoolList = [],
  } = config;

  if (virtualNodePoolList?.length > 0) {
    virtualNodePoolList.forEach((item) => {
      const obj = {
        virtualNodePool: { ...item },
        nodePoolId:      item.nodePoolId,
        nodePoolName:    item.name,
        nodePoolType:    'super',
        isNew:           false,
      };

      nodePool.push(obj);
    });
  }

  if (nodePoolList?.length > 0) {
    nodePoolList.forEach((item) => {
      const { autoScalingGroupPara, launchConfigurePara } = item;
      let userScript = item.userScript;

      if (isBase64(item.userScript)) {
        userScript = base64Decode(item.userScript);
      }
      const obj = {
        ...item,
        nodePoolType:       'native',
        clusterId:          item.clusterId,
        nodePoolId:         item.nodePoolId,
        nodePoolName:       item.name,
        osName:             item.nodePoolOs,
        deletionProtection: item.deletionProtection,
        userScript,
        instanceNum:        autoScalingGroupPara.desiredCapacity,
        subnetId:           autoScalingGroupPara.subnetIds,
        instanceType:       launchConfigurePara.instanceType,
        systemDiskSize:     launchConfigurePara.systemDisk.diskSize,
        systemDiskType:     launchConfigurePara.systemDisk.diskType,
        dataDisks:          launchConfigurePara.dataDisks?.map((disk) => ({
          size: disk.diskSize,
          type: disk.diskType,
        })),
        bandwidthType:    launchConfigurePara.internetChargeType,
        bandwidth:        launchConfigurePara.internetMaxBandwidthOut,
        publicIpAssigned: launchConfigurePara.publicIpAssigned !== false && launchConfigurePara.publicIpAssigned !== 'false',
        keyPair:          launchConfigurePara.keyIds?.[0] || '',
        securityGroup:    launchConfigurePara.securityGroupIds?.[0] || '',
        isNew:            false,
      };

      nodePool.push(obj);
    });
  }
  let extensiveParameters = {};

  try {
    extensiveParameters = clusterEndpoint.extensiveParameters ? JSON.parse(clusterEndpoint.extensiveParameters) : {};
  } catch (e) {
    extensiveParameters = {};
  }

  const internetAccessible = extensiveParameters.InternetAccessible || {};
  const out = {
    clusterEndpoint:         clusterEndpoint.enable === undefined ? true : !!clusterEndpoint.enable,
    imported:                config.imported,
    region:                  config.region,
    clusterId:               config.clusterId,
    subnetId:                clusterEndpoint.subnetId,
    domain:                  clusterEndpoint.domain,
    internetMaxBandwidthOut: internetAccessible.InternetMaxBandwidthOut,
    tkeCredentialSecret:     config.tkeCredentialSecret,
    securityGroup:           clusterEndpoint.securityGroup,
    osName:                  clusterBasicSettings.clusterOs,
    clusterType:             clusterBasicSettings.clusterType,
    name:                    clusterBasicSettings.clusterName,
    description:             clusterBasicSettings.clusterDescription,
    clusterVersion:          clusterBasicSettings.clusterVersion,
    vpcId:                   clusterBasicSettings.vpcId,
    clusterLevel:            clusterBasicSettings.clusterLevel,
    clusterCidr:             clusterCIDRSettings.clusterCIDR,
    serviceCidr:             clusterCIDRSettings.serviceCIDR || '',
    eniSubnetIds:            clusterCIDRSettings.eniSubnetIds || [],
    maxNodePodNum:           clusterCIDRSettings.maxNodePodNum,
    maxClusterServiceNum:    clusterCIDRSettings.maxClusterServiceNum,
    networkType:             clusterAdvancedSettings.networkType || 'GR',
    ecsCount:                runInstancesForNode.instanceCount,
    instanceType:            runInstancesForNode.instanceType,
    bandwidthType:           runInstancesForNode.internetChargeType,
    bandwidth:               runInstancesForNode.internetMaxBandwidthOut,
    keyPair:                 (runInstancesForNode.keyIds || [])[0],
    zoneId:                  runInstancesForNode.zone,
    systemDiskType:          runInstancesForNode.systemDisk?.diskType,
    systemDiskSize:          runInstancesForNode.systemDisk?.diskSize,
    dataDiskType:            runInstancesForNode.dataDisk?.diskType,
    dataDiskSize:            runInstancesForNode.dataDisk?.diskSize,
    container:               clusterAdvancedSettings.containerRuntime,
    ipvs:                    clusterAdvancedSettings.ipvs,
    deletionProtection:      clusterAdvancedSettings.deletionProtection,
    component:               JSON.stringify(extensionAddon)
  };

  // init csi addon
  if (extensionAddon?.length > 0 && !isNewOrUnprovisioned.value) {
    state.value.csi = extensionAddon?.map((item) => item.addonName);
  }
  nodePools.value = nodePool;
  recordNodePools.value = cloneDeep(nodePool);
  tkeConfig.value = out;
}

onMounted(async() => {
  if (isImport) {
    await initImportConfig();
  } else {
    await initCustomConfig();
  }
  registerWatch();
});

function registerWatch() {
  // watch
  // Because SelectCredential inside the component will trigger a change by default, this watch gets triggered when the component loads.
  watch(() => tkeConfig.value.tkeCredentialSecret, async(credential) => {
    state.value.errors = [];
    if (!credential) {
      return;
    }
    const promises = [];

    promises.push(fetchRegion(credential));
    if (!isImport) {
      promises.push(
        fetchClusterLevelAttribute(credential),
        fetchClusterVersion(credential),
        fetchZone(credential),
        fetchVpc(credential),
        fetchSubnets(credential),
        fetchSecurityGroup(credential),
        fetchInstanceTypes(credential),
        fetchKeyPair(credential),
      );
    }
    try {
      await Promise.all(promises);
    } catch (err) {
      if (state.value.errors.length === 0) {
        state.value.errors.push(err);
      }
    }
  }, { immediate: true });

  watch(
    () => [tkeConfig.value.subnetId, state.value.allSubnets],
    ([subnetId, subnets]) => {
      if (!subnetId || !subnets?.length) {
        return;
      }

      const matchedSubnet = find(subnets, { SubnetId: subnetId });

      // 因为编辑的时候后端不会返回 zone 但是创建的时候需要 zone 去获得对应的参数
      // 并且 zoneId 必须是当前 subnet 的 zoneId（无论是编辑还是创建）
      if (matchedSubnet?.Zone && tkeConfig.value.zoneId !== matchedSubnet.Zone) {
        tkeConfig.value.zoneId = matchedSubnet.Zone;
      }
    },
    { immediate: true }
  );

  watch(
    [subnetOptions, () => tkeConfig.value.zoneId],
    ([options, zoneId]) => {
      if (!zoneId || !Array.isArray(options) || options.length === 0 || !isNewOrUnprovisioned.value) {
        return;
      }

      const currentSubnetId = tkeConfig.value.subnetId || '';

      if (!currentSubnetId) {
        tkeConfig.value.subnetId = options[0].value || '';
      }
    },
    {
      immediate: true,
      deep:      true
    }
  );

  let clusterCidrValidateTimer = null;
  let serviceCidrValidateTimer = null;

  watch(
    [
      () => tkeConfig.value.clusterCidr,
      () => tkeConfig.value.serviceCidr,
      () => tkeConfig.value.region,
      () => tkeConfig.value.vpcId,
      () => tkeConfig.value.networkType
    ],
    () => {
      if (isImport && !isNewOrUnprovisioned.value) {
        return;
      }

      const credential = tkeConfig.value.tkeCredentialSecret;

      if (!credential) {
        return;
      }

      const networkType = tkeConfig.value.networkType || 'GR';

      clearTimeout(clusterCidrValidateTimer);
      clearTimeout(serviceCidrValidateTimer);

      if (networkType === 'GR') {
        state.value.serviceCidrConflictError = '';
        state.value.serviceCidrValidating = false;
        state.value.clusterCidrConflictError = '';

        clusterCidrValidateTimer = setTimeout(() => {
          validateClusterCidrConflict(credential);
        }, 400);

        return;
      }

      if (networkType === 'VPC-CNI') {
        state.value.clusterCidrConflictError = '';
        state.value.clusterCidrValidating = false;
        state.value.serviceCidrConflictError = '';

        serviceCidrValidateTimer = setTimeout(() => {
          validateServiceCidrConflict(credential);
        }, 400);
      }
    }
  );
}

async function fetchRegion(cloudCredentialId) {
  state.value.regionLoading = true;
  try {
    const res = await queryFromTencent({
      resource:       'regions',
      cloudCredentialId,
      store,
      externalParams: {},
    });

    const regionOptions = res?.Response?.RegionInstanceSet?.map((region) => {
      return {
        label: intl.value(`tkeCn.regions.${ region.RegionName }`),
        value: region.RegionName
      };
    });

    options.value.regionOptions = regionOptions || [];
  } catch (err) {
    options.value.regionOptions = [];
    state.value.errors = [];
    state.value.errors.push(err);
  }
  state.value.regionLoading = false;
}

async function fetchClusterLevelAttribute(cloudCredentialId) {
  state.value.clusterLevelAttributeLoading = true;
  try {
    const res = await queryFromTencent({
      resource:       'clusterLevelAttribute',
      cloudCredentialId,
      store,
      externalParams: { regionId: tkeConfig.value.region },
    });
    const clusterLevelOptions = res?.Response?.Items?.map((item) => {
      const help = {
        level:     item.Alias,
        node:      item.NodeCount,
        pod:       item.PodCount,
        configMap: item.ConfigMapCount,
        crd:       item.CRDCount,
      };

      return {
        label: intl.value('tkeCn.clusterLevel.help', help),
        value: item.Alias,
      };
    });

    options.value.clusterLevelOptions = clusterLevelOptions || [];
  } catch (err) {
    options.value.clusterLevelOptions = [];
    state.value.errors = [];
    state.value.errors.push(err);
  }
  state.value.clusterLevelAttributeLoading = false;
}

async function validateClusterCidrConflict(cloudCredentialId) {
  const cidr = tkeConfig.value.clusterCidr;
  const regionId = tkeConfig.value.region;
  const vpcId = tkeConfig.value.vpcId;
  const cidrIPV4RegExp = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/\d{1,2}$/;

  state.value.clusterCidrConflictError = '';
  if (!cidr || !regionId || !vpcId || !cidrIPV4RegExp.test(cidr)) {
    return;
  }
  state.value.clusterCidrValidating = true;
  try {
    const res = await queryFromTencent({
      resource:       'checkClusterCIDR',
      cloudCredentialId,
      store,
      externalParams: {
        regionId,
        vpcId,
        clusterCIDR: cidr,
      },
    });
    const isConflict = res?.IsConflict === true;

    state.value.clusterCidrConflictError = isConflict ? `${ intl.value('tkeCn.clusterCidr.label') }: ${ res?.ConflictMsg }` || intl.value('tkeCn.clusterCidr.conflictError') : '';
  } catch (err) {
    state.value.clusterCidrConflictError = err.error ? `${ intl.value('tkeCn.clusterCidr.label') }: ${ err.error }` : intl.value('tkeCn.clusterCidr.formatError');
  }
  state.value.clusterCidrValidating = false;
}

async function validateServiceCidrConflict(cloudCredentialId) {
  const cidr = tkeConfig.value.serviceCidr;
  const regionId = tkeConfig.value.region;
  const vpcId = tkeConfig.value.vpcId;
  const cidrIPV4RegExp = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/\d{1,2}$/;

  state.value.serviceCidrConflictError = '';

  if (!cidr || !regionId || !vpcId || !cidrIPV4RegExp.test(cidr)) {
    return;
  }

  state.value.serviceCidrValidating = true;

  try {
    const res = await queryFromTencent({
      resource:       'checkClusterCIDR',
      cloudCredentialId,
      store,
      externalParams: {
        regionId,
        vpcId,
        clusterCIDR: cidr,
      },
    });
    const isConflict = res?.IsConflict === true;

    state.value.serviceCidrConflictError = isConflict ? `${ intl.value('tkeCn.serviceCidr.label') }: ${ res?.ConflictMsg }` || intl.value('tkeCn.serviceCidr.conflictError') : '';
  } catch (err) {
    state.value.serviceCidrConflictError = err.error ? `${ intl.value('tkeCn.serviceCidr.label') }: ${ err.error }` : intl.value('tkeCn.serviceCidr.formatError');
  }

  state.value.serviceCidrValidating = false;
}

function updatePrivateRegistryInput(val) {
  state.value.showPrivateRegistryInput = val;

  if (!normanCluster.value.importedConfig) {
    normanCluster.value.importedConfig = {};
  }

  if (!val) {
    normanCluster.value.importedConfig.privateRegistryURL = null;
  }
}

function parseSemver(v = '') {
  const m = String(v).match(/(\d+)\.(\d+)\.(\d+)/);

  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function cmpSemver(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);

  if (!pa || !pb) {
    return 0;
  }

  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) {
      return pa[i] > pb[i] ? 1 : -1;
    }
  }

  return 0;
}

async function handleRegionChange(value) {
  if (tkeConfig.value.region === value) {
    return;
  }
  tkeConfig.value.region = value;
  state.value.errors = [];
  const credential = tkeConfig.value.tkeCredentialSecret;

  if (!credential) {
    return;
  }
  if (isImport) {
    return;
  }
  resetConfig();
  try {
    await Promise.all([
      fetchClusterLevelAttribute(credential),
      fetchClusterVersion(credential),
      fetchZone(credential),
      fetchVpc(credential),
      fetchSubnets(credential),
      fetchSecurityGroup(credential),
      fetchInstanceTypes(credential),
      fetchKeyPair(credential),
    ]);
  } catch (err) {
    if (state.value.errors.length === 0) {
      state.value.errors.push(err);
    }
  }
}

async function fetchClusterVersion(cloudCredentialId) {
  state.value.clusterVersionLoading = true;
  try {
    const res = await queryFromTencent({
      resource:       'versions',
      cloudCredentialId,
      store,
      externalParams: { regionId: tkeConfig.value.region },
    });
    const versionRange = ['1.34', '1.35', '1.36'];
    const versions = res?.Response?.VersionInstanceSet?.map((item) => {
      const enabled = versionRange.find((v) => {
        return item.Version.startsWith(`${ v }`);
      });

      return {
        label:          item.Version,
        value:          item.Version,
        rancherEnabled: !!enabled
      };
    });

    if (isNewOrUnprovisioned.value) {
      if (!tkeConfig.value.clusterVersion) {
        const version = [...versions].reverse().find((item) => item.rancherEnabled);

        if (version) {
          tkeConfig.value.clusterVersion = version.value;
        }
      }

      options.value.versionOptions = versions;
      state.value.upgradeTip = '';
      state.value.clusterVersionLoading = false;

      return;
    }

    const cur = tkeConfig.value.clusterVersion;
    const filtered = cur ? versions.filter((v) => cmpSemver(v.value, cur) >= 0) : versions;

    options.value.versionOptions = filtered;
    const hasUpgrade = cur ? filtered.some((v) => cmpSemver(v.value, cur) > 0) : false;

    state.value.upgradeTip = hasUpgrade ? intl.value('tkeCn.clusterVersion.upgradeTip', { current: cur }) : intl.value('tkeCn.clusterVersion.latestTip', { current: cur });
  } catch (err) {
    state.value.errors = [];
    options.value.versionOptions = [];
    state.value.errors.push(err);
  }
  state.value.clusterVersionLoading = false;
}

async function fetchZone(cloudCredentialId) {
  state.value.zoneIdLoading = true;
  try {
    const res = await queryFromTencent({
      resource:       'zones',
      cloudCredentialId,
      store,
      externalParams: { regionId: tkeConfig.value.region },
    });

    const zoneOptions = res?.Response.ZoneSet.map((zone) => {
      return {
        label: zone.ZoneName,
        value: zone.Zone,
      };
    });

    options.value.zoneOptions = zoneOptions || [];
    if (isNewOrUnprovisioned.value && options.value.zoneOptions.length > 0 && !tkeConfig.value.zoneId) {
      tkeConfig.value.zoneId = options.value.zoneOptions[0].value;
    }
  } catch (err) {
    state.value.errors = [];
    options.value.zoneOptions = [];
    state.value.errors.push(err);
  }
  state.value.zoneIdLoading = false;
}

async function fetchVpc(cloudCredentialId) {
  state.value.vpcIdLoading = true;
  try {
    const res = await queryFromTencent({
      resource:       'vpcs',
      cloudCredentialId,
      store,
      externalParams: { regionId: tkeConfig.value.region },
    });
    const vpcOptions = res?.Response?.VpcSet?.map((vpc) => {
      return {
        label: vpc.VpcName,
        value: vpc.VpcId,
        raw:   vpc,
      };
    });

    options.value.vpcOptions = vpcOptions || [];
    if (isNewOrUnprovisioned.value && options.value.vpcOptions.length > 0 && !tkeConfig.value.vpcId) {
      tkeConfig.value.vpcId = options.value.vpcOptions[0].value;
      handleNetworkTypeChange(tkeConfig.value.networkType);
    }
  } catch (err) {
    state.value.errors = [];
    options.value.vpcOptions = [];
    state.value.errors.push(err);
  }
  state.value.vpcIdLoading = false;
}

async function fetchSubnets(cloudCredentialId) {
  state.value.subnetLoading = true;
  try {
    const res = await queryFromTencent({
      resource:       'subnets',
      cloudCredentialId,
      store,
      externalParams: { regionId: tkeConfig.value.region },
    });
    const allSubnets = res?.Response?.SubnetSet?.map((subnet) => {
      return {
        ...subnet,
        label: subnet.SubnetName,
        value: subnet.SubnetId,
        vpcId: subnet.VpcId,
        zone:  subnet.Zone
      };
    });

    state.value.allSubnets = allSubnets || [];
  } catch (err) {
    state.value.errors = [];
    state.value.allSubnets = [];
    state.value.errors.push(err);
  }
  state.value.subnetLoading = false;
}

async function fetchSecurityGroup(cloudCredentialId) {
  state.value.securityGroupLoading = true;
  try {
    const res = await queryFromTencent({
      resource:       'securityGroups',
      cloudCredentialId,
      store,
      externalParams: { regionId: tkeConfig.value.region },
    });
    const securityGroupOptions = res?.Response?.SecurityGroupSet?.map((securityGroup) => {
      return {
        label: securityGroup.SecurityGroupName,
        value: securityGroup.SecurityGroupId,
      };
    });

    options.value.securityGroupOptions = securityGroupOptions || [];
    if (isNewOrUnprovisioned.value && options.value.securityGroupOptions.length > 0 && !tkeConfig.value.securityGroup) {
      tkeConfig.value.securityGroup = options.value.securityGroupOptions[0].value;
    }
  } catch (err) {
    state.value.errors = [];
    options.value.securityGroupOptions = [];
    state.value.errors.push(err);
  }
  state.value.securityGroupLoading = false;
}

async function fetchInstanceTypes(cloudCredentialId) {
  state.value.instanceTypeLoading = true;
  try {
    const res = await queryFromTencent({
      resource:       'zoneInstanceConfigInfos',
      cloudCredentialId,
      store,
      externalParams: { regionId: tkeConfig.value.region },
    });
    const allInstances = res?.Response?.InstanceTypeQuotaSet;
    const out = {};

    allInstances.forEach((instance) => {
      if (instance.Status !== 'SELL' || instance.InstanceChargeType !== 'POSTPAID_BY_HOUR') {
        return;
      }

      const item = {
        value: instance.InstanceType,
        label: `${ instance.TypeName } (CPU ${ instance.Cpu } Memory ${ instance.Memory } GiB)`,
        group: instance.InstanceFamily,
        zone:  instance.Zone,
        raw:   instance,
      };

      if (!out[instance.Zone]) {
        out[instance.Zone] = [item];
      } else {
        out[instance.Zone].push(item);
      }
    });
    state.value.instanceTypeSet = out;
  } catch (err) {
    state.value.errors = [];
    options.value.instanceTypeSet = {};
    state.value.errors.push(err);
  }
  state.value.instanceTypeLoading = false;
}

async function fetchKeyPair(cloudCredentialId) {
  state.value.keyPairLoading = true;
  try {
    const res = await queryFromTencent({
      resource:       'keyPairs',
      cloudCredentialId,
      store,
      externalParams: { regionId: tkeConfig.value.region },
    });
    const keyPairOptions = res?.Response?.KeyPairSet?.map((keyPair) => {
      return {
        label: keyPair.KeyName,
        value: keyPair.KeyId,
      };
    });

    options.value.keyPairOptions = keyPairOptions || [];
  } catch (err) {
    state.value.errors = [];
    options.value.keyPairOptions = [];
    state.value.errors.push(err);
  }
  state.value.keyPairLoading = false;
}

function addPool() {
  if (tkeConfig.value.imported) {
    return;
  }
  let nextDefaultSuffix = nodePools.value?.length + 1;

  while (nodePools.value.find((group) => group.nodePoolName === `nodepool-${ nextDefaultSuffix }`)) {
    nextDefaultSuffix++;
  }

  const name = `nodepool-${ nextDefaultSuffix }`;
  const ngConfig = {
    ...CONFIG_ENV.DEFAULT_NODE_GROUP_CONFIG,
    nodePoolName: name,
    isNew:        true,
  };

  nodePools.value.push(ngConfig);
}

function removePool(index) {
  if (tkeConfig.value.imported) {
    return;
  }
  if (!nodePools.value ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= nodePools.value.length ||
    nodePools.value.length === 1
  ) {
    return;
  }
  const pool = nodePools.value[index];
  const recordedPools = Array.isArray(recordNodePools.value) ? recordNodePools.value : [];
  const recordedPool = recordedPools.find((item) => item?.nodePoolId === pool?.nodePoolId);

  if (
    recordedPool &&
    !pool?.isNew &&
    (
      recordedPool?.deletionProtection === true ||
      recordedPool?.virtualNodePool?.deletionProtection === true
    )
  ) {
    store.dispatch(
      'growl/warning',
      {
        title:   intl.value('tkeCn.deletionProtection.title'),
        message: intl.value('tkeCn.deletionProtection.tooltip', { name: pool.nodePoolName }),
      },
      { root: true }
    );

    return;
  }

  pullAt(nodePools.value, index);
}

function poolIsValid(pool) {
  const hasValues = (arr) => Array.isArray(arr) && arr.length > 0;

  const hasUniqueNames = () => {
    const names = (nodePools.value || []).map((item) => item.nodePoolName).filter(Boolean);

    return new Set(names).size === names.length;
  };

  const isSuperPoolValid = () => {
    return !!pool.nodePoolName &&
      hasValues(pool?.virtualNodePool?.securityGroupIds) &&
      hasValues(pool?.virtualNodePool?.virtualNodes);
  };

  const isNativePoolValid = () => {
    return !!pool.nodePoolName &&
      !!pool.instanceType &&
      !!pool.osName &&
      !!pool.systemDiskType &&
      !!pool.subnetId?.length &&
      !!pool.securityGroup &&
      !isNaN(pool.instanceNum) &&
      pool.instanceNum >= 0;
  };

  const valid = pool.nodePoolType === 'super' ? isSuperPoolValid() : isNativePoolValid();

  return valid && hasUniqueNames();
}

function getVpcUsedCidrs(vpcId) {
  const currentVpc = (options.value.vpcOptions || []).find((item) => item.value === vpcId)?.raw;

  if (!currentVpc) {
    return [];
  }

  return [
    currentVpc.CidrBlock,
    ...((currentVpc.AssistantCidrSet || []).map((item) => item?.CidrBlock).filter(Boolean))
  ].filter(Boolean);
}

function getAvailableClusterCidr(vpcId) {
  const usedCidrs = getVpcUsedCidrs(vpcId);

  return CONFIG_ENV.CLUSTER_CIDR_CANDIDATES.find((candidate) => {
    return !usedCidrs.some((usedCidr) => DoCidrOverlap(candidate, usedCidr));
  }) || '';
}

function getAvailableServiceCidr(vpcId) {
  const usedCidrs = getVpcUsedCidrs(vpcId);

  return CONFIG_ENV.SERVICE_CIDR_CANDIDATES.find((candidate) => {
    return !usedCidrs.some((usedCidr) => DoCidrOverlap(candidate, usedCidr));
  }) || '10.96.0.0/24';
}

// 以下几个 change 事件只有用户手动触发时才会变更
function handleVpcChanged() {
  if (!isNewOrUnprovisioned.value) {
    return;
  }
  // 这里只需要把 subnetId 变为空的原因是
  // 当 vpcid change 发生时对应的 supnetoptions 也会 change
  // subnetId 为空时 subnetoptions 的 watch 会根据当前的 zoneID 来初始化 subnetId
  tkeConfig.value.subnetId = '';
  nodePools.value = nodePools.value.map((pool) => {
    const virtualNodes = (pool.virtualNodePool?.virtualNodes || []).map((node) => {
      return {
        ...node,
        subnetId: '',
      };
    });

    return {
      ...pool,
      subnetId:        '',
      virtualNodePool: {
        ...pool.virtualNodePool,
        virtualNodes,
      },
    };
  });
}

function handleNetworkTypeChange(value) {
  if (!isNewOrUnprovisioned.value) {
    return;
  }
  if ((value || 'GR') === 'GR' && !tkeConfig.value.clusterCidr) {
    tkeConfig.value.clusterCidr = getAvailableClusterCidr(tkeConfig.value.vpcId);
  } else if (!tkeConfig.value.serviceCidr) {
    tkeConfig.value.serviceCidr = getAvailableServiceCidr(tkeConfig.value.vpcId);
  }
}

function handleZoneChange() {
  if (!isNewOrUnprovisioned.value) {
    return;
  }
  const options = Array.isArray(subnetOptions.value) ? subnetOptions.value : [];

  tkeConfig.value.subnetId = options[0]?.value || '';
}
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
      v-model:value="tkeConfig.tkeCredentialSecret"
      :mode="mode === VIEW ? VIEW : CREATE"
      data-testid="crutke-select-credential"
      provider="tke"
      :default-on-cancel="true"
      :showing-form="hasCredential"
      class="mt-20"
      :cancel="cancelCredential"
    />
    <div
      v-if="hasCredential"
      class="mt-10"
      data-testid="crutke-form"
    >
      <div
        v-if="isImport"
      >
        <div>
          <ImportTke
            v-model:name="normanCluster.name"
            v-model:description="normanCluster.description"
            v-model:regionId="tkeConfig.region"
            v-model:clusterID="tkeConfig.clusterId"
            v-model:clusterEndpoint="tkeConfig.clusterEndpoint"
            :mode="mode"
            :cloudCredentialId="tkeConfig.tkeCredentialSecret"
            :regionOptions="options.regionOptions"
            :clusterEndpointOptions="options.clusterEndpointOptions"
            :disabled="!isNewOrUnprovisioned"
            :rules="{
              name: ruleSets.name,
              clusterID: ruleSets.clusterID,
            }"
            @errors="e =>state.errors=e"
          />
        </div>
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
          v-if="!clusterActive"
          color="warning"
          :label="t('tkeCn.updateWarn')"
        />
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
        <div class="cluster-basic-card">
          <div class="cluster-basic-card__header">
            <h3 class="cluster-basic-card__title">
              {{ intl('tkeCn.basicConfig.title') }}
            </h3>
            <div class="cluster-basic-card__desc">
              {{ intl('tkeCn.basicConfig.description') }}
            </div>
          </div>
          <div class="row mt-10">
            <div class="col span-6">
              <LabeledInput
                v-model:value="tkeConfig.name"
                :mode="mode"
                :disabled="tkeConfig.imported"
                label-key="tkeCn.tkeCluster.name.label"
                :placeholder="intl('tkeCn.tkeCluster.name.placeholder')"
              />
            </div>
            <div class="col span-6">
              <LabeledInput
                v-model:value="tkeConfig.description"
                :mode="mode"
                :disabled="tkeConfig.imported"
                label-key="tkeCn.tkeCluster.description.label"
                :placeholder="intl('tkeCn.tkeCluster.description.placeholder')"
              />
            </div>
          </div>
          <div class="row mt-10">
            <div
              class="col span-6"
            >
              <LabeledSelect
                :value="tkeConfig.region"
                data-testid="crutke-resource-region"
                required
                :mode="mode"
                :options="options.regionOptions"
                option-label="label"
                option-key="value"
                :loading="state.regionLoading"
                label-key="tkeCn.region.label"
                :disabled="!isNewOrUnprovisioned || tkeConfig.imported"
                :rules="ruleSets.region"
                @update:value="handleRegionChange"
              />
            </div>
            <div
              class="col span-6"
            >
              <LabeledSelect
                v-model:value="tkeConfig.clusterVersion"
                data-testid="crutke-resource-cluster-version"
                :loading="state.clusterVersionLoading"
                required
                :disabled="tkeConfig.imported"
                :mode="mode"
                :options="options.versionOptions"
                option-label="label"
                option-key="value"
                label-key="tkeCn.version.label"
                :rules="ruleSets.clusterVersion"
              />
            </div>
          </div>
          <div class="row mt-10">
            <div
              class="col span-6"
            >
              <LabeledSelect
                v-model:value="tkeConfig.clusterLevel"
                :loading="state.clusterLevelAttributeLoading"
                data-testid="crutke-resource-cluster-level"
                required
                :mode="mode"
                :options="options.clusterLevelOptions"
                option-label="label"
                option-key="value"
                label-key="tkeCn.clusterLevel.label"
                :disabled="tkeConfig.imported"
                :rules="ruleSets.clusterLevel"
              />
            </div>
          </div>
          <div class="network-option-card mt-10">
            <div class="network-option-card__title">
              {{ intl('tkeCn.deletionProtection.label') }}
            </div>
            <div class="network-option-card__desc">
              {{ intl('tkeCn.deletionProtection.help') }}
            </div>
            <div class="mt-10">
              <RadioGroup
                v-model:value="tkeConfig.deletionProtection"
                name="deletionProtection"
                :options="[true, false]"
                :disabled="tkeConfig.imported"
                :labels="options.deletionProtectionOptions"
                :mode="mode"
              />
            </div>
          </div>
        </div>
        <Banner
          v-if="!isNewOrUnprovisioned && state.upgradeTip"
          color="info"
          :label="state.upgradeTip"
        />
        <div class="row mb-10">
          <Banner
            v-if="kubernetesSupport.rancherDisabled"
            color="warning"
            label-key="tkeCn.version.warning"
          />
        </div>
        <TkeNetworkConfigForm
          v-model:value="tkeConfig"
          :mode="mode"
          :intl="intl"
          :options="options"
          :state="state"
          :rule-sets="ruleSets"
          :subnet-options="subnetOptions"
          :is-new-or-unprovisioned="isNewOrUnprovisioned"
          :cluster-cidr-conflict-error="state.clusterCidrConflictError"
          :cluster-cidr-validating="state.clusterCidrValidating"
          :service-cidr-conflict-error="state.serviceCidrConflictError"
          :service-cidr-validating="state.serviceCidrValidating"
          @vpc-change="handleVpcChanged"
          @network-type-change="handleNetworkTypeChange"
          @zone-change="handleZoneChange"
        />
        <div class="cluster-basic-card mb-10">
          <TkeCsiCardSelect
            v-model:value="state.csi"
            :mode="mode"
            :disabled="!isNewOrUnprovisioned || tkeConfig.imported"
            @update:value="handleCsiChange"
          />
        </div>
        <GroupPanel
          v-if="!tkeConfig.imported && !isManagedCluster"
          label-key="tkeCn.master.title"
          class="mt-20 mb-20"
        >
          <MasterNode
            v-model:instanceNum="tkeConfig.ecsCount"
            v-model:systemDiskType="tkeConfig.systemDiskType"
            v-model:systemDiskSize="tkeConfig.systemDiskSize"
            v-model:dataDiskType="tkeConfig.dataDiskType"
            v-model:dataDiskSize="tkeConfig.dataDiskSize"
            v-model:bandwidthType="tkeConfig.bandwidthType"
            v-model:bandwidth="tkeConfig.bandwidth"
            v-model:instanceType="tkeConfig.instanceType"
            v-model:osName="tkeConfig.osName"
            v-model:keyPair="tkeConfig.keyPair"
            class="mt-10"
            :mode="mode"
            :keyPairLoading="keyPairLoading"
            :subnetOptions="subnetOptions"
            :keyPairOptions="options.keyPairOptions"
            :imageOptions="imageOptions"
            :instanceTypeLoading="state.instanceTypeLoading"
            :bandwidthTypeOptions="CONFIG_ENV.BAND_WIDTH"
            :isNewOrUnprovisioned="isNewOrUnprovisioned"
            :rules="{
              instanceType: ruleSets.masterInstanceType,
              osName: ruleSets.masterOsNameRequired,
            }"
          />
        </GroupPanel>
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
            :name="`${pool.nodePoolName} ${i}`"
            :label="pool.nodePoolName"
            :error="!poolIsValid(pool)"
          >
            <TkeNodePoolTypeForm
              v-model:nodePoolType="pool.nodePoolType"
              v-model:name="pool.nodePoolName"
              v-model:instanceType="pool.instanceType"
              v-model:osName="pool.osName"
              v-model:instanceNum="pool.instanceNum"
              v-model:systemDiskType="pool.systemDiskType"
              v-model:systemDiskSize="pool.systemDiskSize"
              v-model:dataDisks="pool.dataDisks"
              v-model:bandwidthType="pool.bandwidthType"
              v-model:bandwidth="pool.bandwidth"
              v-model:publicIpAssigned="pool.publicIpAssigned"
              v-model:subnetId="pool.subnetId"
              v-model:keyPair="pool.keyPair"
              v-model:userScript="pool.userScript"
              v-model:securityGroup="pool.securityGroup"
              v-model:virtualNodePool="pool.virtualNodePool"
              v-model:deletionProtection="pool.deletionProtection"
              :keyPairLoading="keyPairLoading"
              :subnetOptions="subnetOptionsForNodePool"
              :zoneOptions="options.zoneOptions"
              :allSubnets="state.allSubnets"
              :securityGroupOptions="options.securityGroupOptions"
              :keyPairOptions="options.keyPairOptions"
              :instanceTypeOptions="instanceTypeOptions"
              :instanceTypeLoading="state.instanceTypeLoading"
              :bandwidthTypeOptions="CONFIG_ENV.BAND_WIDTH"
              :tkeConfig="tkeConfig"
              :mode="mode"
              :rules="{
                name: ruleSets.nodePoolName,
                instanceType: ruleSets.instanceType,
                osName: ruleSets.nodePoolOsNameRequired,
                systemDiskType: ruleSets.systemDiskTypeRequired,
                subnetId: ruleSets.nodePoolSubnetIdRequired,
                securityGroup: ruleSets.nodePoolSecurityGroupRequired,
                virtualNodePoolRequired: ruleSets.virtualNodePoolRequired,
              }"
              :isNewOrUnprovisioned="isNewOrUnprovisioned || pool.isNew"
              @errors="e=>state.errors=e"
            />
          </Tab>
        </Tabbed>
        <FloatingHelpPanel
          :title="intl('tkeCn.fields.help')"
          :items="validationMessages"
          :close-label="intl('generic.close')"
        />
      </div>
      <div>
        <Accordion
          class="mb-20"
          :title="intl('generic.labelsAndAnnotations')"
        >
          <Labels
            v-model:value="normanCluster"
            :mode="mode"
          />
        </Accordion>
      </div>
      <Accordion
        class="mb-20 accordion"
        title-key="imported.accordions.registries"
        data-testid="registries-accordion"
        :open-initially="false"
      >
        <Banner
          color="info"
          class="mt-0"
        >
          {{ intl('cluster.privateRegistry.importedDescription') }}
        </Banner>
        <Checkbox
          :value="state.showPrivateRegistryInput"
          class="mb-20"
          :mode="mode"
          :label="t('cluster.privateRegistry.label')"
          data-testid="private-registry-enable-checkbox"
          @update:value="updatePrivateRegistryInput($event)"
        />
        <LabeledInput
          v-if="state.showPrivateRegistryInput && normanCluster.importedConfig"
          v-model:value="normanCluster.importedConfig.privateRegistryURL"
          :mode="mode"
          label-key="catalog.chart.registry.custom.inputLabel"
          data-testid="private-registry-url"
          :placeholder="t('catalog.chart.registry.custom.placeholder')"
        />
      </Accordion>
    </div>
    <template
      v-if="!hasCredential"
      #form-footer
    >
      <div><!-- Hide the outer footer --></div>
    </template>
  </CruResource>
</template>
<style scoped lang="scss">
.cluster-basic-card {
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background: var(--body-bg);
  box-shadow: 0 0 16px var(--shadow);
}
.cluster-basic-card__header {
  margin-bottom: 20px;
}
.cluster-basic-card__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--body-text);
  line-height: 1.4;
}
.cluster-basic-card__desc {
  margin-top: 8px;
  max-width: 980px;
  color: var(--input-label);
  font-size: 14px;
  line-height: 1.6;
}
.cluster-level-section {
  margin-top: 20px;
}
.cluster-level-section__title {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
  font-size: 16px;
  font-weight: 700;
  color: var(--body-text);
}
.required-mark {
  color: var(--error);
}
.network-option-card {
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--body-bg);
}
.network-option-card__title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--body-text);
  line-height: 1.4;
}
.network-option-card__desc {
  margin-top: 6px;
  color: var(--input-label);
  font-size: 13px;
  line-height: 1.6;
}
.cluster-cidr-field {
  position: relative;
}
.cluster-cidr-field__status {
  position: absolute;
  top: 30px;
  right: 12px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  min-height: 20px;
}
.cluster-cidr-field__icon {
  color: var(--error);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}
.cluster-cidr-field__tooltip {
  max-width: 260px;
  padding: 8px 10px;
  border-radius: 6px;
  color: var(--error);
  font-size: 12px;
  line-height: 1.5;
}
</style>
