<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import CruResource from '@shell/components/CruResource.vue';
import { useCreateEditView } from '../composables/useCreateEditView.js';
import LabeledMultiSelect from './LabeledMultiSelect';
import CCEValidators from '../util/validators';
import { NORMAN } from '@shell/config/types';
import NodePool from './NodePool';
import { CREATOR_PRINCIPAL_ID } from '@shell/config/labels-annotations';
import Tab from '@shell/components/Tabbed/Tab.vue';
import Tabbed from '@shell/components/Tabbed/index.vue';
import { _CREATE, _IMPORT, _VIEW } from '@shell/config/query-params';
import Banner from '@components/Banner/Banner.vue';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import SelectCredential from '@shell/edit/provisioning.cattle.io.cluster/SelectCredential.vue';
import KeyValue from '@shell/components/form/KeyValue';
import UnitInput from '@shell/components/form/UnitInput';
import FileSelector from '@shell/components/form/FileSelector.vue';
import { RadioGroup } from '@components/Form/Radio';
import Checkbox from '@components/Form/Checkbox/Checkbox.vue';
import { queryHuawei } from '../util/request';
import CONFIG_ENV from '../util/config';
import { getDefaultFlavorValue } from '../util/flavors';
import { getDefaultOperatingSystemValue } from '../util/operatingSystems';
import {
  compact, find, flatten, pullAt, uniq, uniqBy, cloneDeep
} from 'lodash';
import { stringify } from '@shell/utils/error';
import { base64Decode } from '@shell/utils/crypto';
import Accordion from '@components/Accordion/Accordion.vue';
import Labels from '@shell/components/form/Labels.vue';
import ImportCce from './ImportCce';
import FloatingHelpPanel from './FloatingHelpPanel.vue';

const RANCHER_SUPPORTED_MIN_VERSION = 'v1.34';
const RANCHER_SUPPORTED_MAX_VERSION = 'v1.36';

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
const route = useRoute();
const cceConfig = ref({});
const normanCluster = ref({});
const nodePools = ref([]);
const cruresource = ref(null);
const options = ref({
  vpcOptions:                         [],
  subnetOptions:                      [],
  securityGroupOptions:               [],
  externalIPOptions:                  [],
  eniNetworkCidrMutipleSelectOptions: [],
  volumeTypeChoicesByZones:           {},
  availableZoneOptions:               [],
  sshKeyOptions:                      [],
  clusterOptions:                     [],
  kubernetesVersionOptions:           CONFIG_ENV.KUBERNETESVERSIONS,
  validityPeriodOptions:              [],
  flavorOptionsByZones:               {},
  eipOptions:                         [
    intl.value('cceCn.eipSelection.none'),
    intl.value('cceCn.eipSelection.exist'),
    intl.value('cceCn.eipSelection.new'),
  ],
  authentiactionOptions: [
    intl.value('cceCn.authentiactionMode.rbac'),
    intl.value('cceCn.authentiactionMode.authenticating_proxy'),
  ],
  highAvailabilityOptions: [
    intl.value('generic.enabled'),
    intl.value('generic.disabled'),
  ],
});
const state = ref({
  loading:                  false,
  vpcLoading:               false,
  publicIPsLoading:         false,
  subnetsLoading:           false,
  securityGroupsLoading:    false,
  volumeTypesLoading:       false,
  osKeypairsLoading:        false,
  flavorLoading:            false,
  versionLoading:           false,
  regionName:               '',
  managementScale:          'small',
  eipSelection:             'none',
  highAvailabilityEnabled:  's2',
  highAvailabilityDisabled: false,
  clusterLoading:           false,
  showPrivateRegistryInput: false,
  eniNetworks:              [],
  errors:                   [],
});
const emit = defineEmits(['done']);
const {
  save,
  doneRoute,
} = useCreateEditView(props, {
  emit, normanCluster, cceConfig, nodePools, state
});
const isImport = ref(route.query.mode === _IMPORT);
const hasCredential = computed(() => {
  return !!cceConfig.value?.huaweiCredentialSecret;
});

const isNewOrUnprovisioned = computed(() => {
  return props.mode === _CREATE || !normanCluster.value?.cceStatus?.upstreamSpec;
});

const isTurbo = computed(() => {
  return cceConfig.value.category === 'Turbo';
});

const containerNetworkModeOptions = computed(() => {
  return CONFIG_ENV.CONTAINER_NETWORK_MODES.filter((item) => item.value !== 'eni');
});

const clusterActive = computed(() => {
  if (!isNewOrUnprovisioned.value) {
    return normanCluster.value.state === 'active';
  }

  return true;
});

const kubernetesSupport = computed(() => {
  const version = cceConfig.value.version;
  const matched = find(options.value.kubernetesVersionOptions, { value: version }) || {};

  return {
    rancherEnabled: matched.rancherEnabled,
    cceEnabled:     matched.cceEnabled,
  };
});

// 创建/未 provision 且 version 尚未填充时不展示版本告警
const showVersionWarnings = computed(() => {
  if (isNewOrUnprovisioned.value && !cceConfig.value.version) {
    return false;
  }

  return !kubernetesSupport.value.rancherEnabled || !kubernetesSupport.value.cceEnabled;
});

const CREATE = computed(() => {
  return _CREATE;
});

const VIEW = computed(() => {
  return _VIEW;
});

const ruleSets = computed(() => {
  if (!hasCredential.value) {
    return {};
  }

  const isImportMode = isImport.value || cceConfig.value.imported;
  const commonRules = {
    name: [
      CCEValidators.nameRequired(normanCluster, intl),
    ],
  };
  const nonImportRules = !isImportMode ? {
    category: [
      CCEValidators.categoryRequired(cceConfig, intl),
    ],
    version: [
      CCEValidators.versionRequired(cceConfig, intl),
    ],
    managementScale: [
      CCEValidators.managementScaleRequired(state, intl),
    ],
    containerNetworkMode: !isTurbo.value ? [
      CCEValidators.containerNetworkModeRequired(cceConfig, intl),
    ] : [],
    vpcId: [
      CCEValidators.vpcIdRequired(cceConfig, intl),
    ],
    subnetId: [
      CCEValidators.subnetIdRequired(cceConfig, intl),
    ],
    containerNetworkCidr: !isTurbo.value ? [
      CCEValidators.containerNetworkCidrRequired(cceConfig, intl),
      CCEValidators.validateContainerNetworkCidr(cceConfig, intl),
    ] : [],
    eniNetworks: isTurbo.value ? [
      CCEValidators.eniNetworksRequired(state, intl),
    ] : [],
    kubernetesSvcIPRange: [
      CCEValidators.kubernetesSvcIPRangeRequired(cceConfig, intl),
      CCEValidators.validateKubernetesSvcIPRange(cceConfig, intl),
    ],
    securityGroup: [
      CCEValidators.securityGroupRequired(cceConfig, intl),
    ],
    eipSelection: state.value.eipSelection === 'exist' ? [
      CCEValidators.eipSelectionRequired(cceConfig, intl),
    ] : [],
    eipType: state.value.eipSelection === 'new' ? [
      CCEValidators.eipTypeRequired(cceConfig, intl),
    ] : [],
    eipChargeMode: state.value.eipSelection === 'new' ? [
      CCEValidators.eipChargeModeRequired(cceConfig, intl),
    ] : [],
    eipBandwidthSize: state.value.eipSelection === 'new' ? [
      CCEValidators.eipBandwidthSizeRequired(cceConfig, intl),
    ] : [],
    authenticatingProxyCa: cceConfig.value.authentiactionMode === 'authenticating_proxy' && isNewOrUnprovisioned.value ? [
      CCEValidators.authenticatingProxyCaRequired(cceConfig, intl),
    ] : [],
    authenticatingProxyCert: cceConfig.value.authentiactionMode === 'authenticating_proxy' && isNewOrUnprovisioned.value ? [
      CCEValidators.authenticatingProxyCertRequired(cceConfig, intl),
    ] : [],
    authenticatingProxyPrivateKey: cceConfig.value.authentiactionMode === 'authenticating_proxy' && isNewOrUnprovisioned.value ? [
      CCEValidators.authenticatingProxyPrivateKeyRequired(cceConfig, intl),
    ] : [],
    nodePoolName: [
      CCEValidators.nodePoolNameRequired(nodePools, intl),
      CCEValidators.nodePoolNamesUnique(nodePools, intl),
    ],
    availableZone: [
      CCEValidators.availableZoneRequired(nodePools, intl),
    ],
    rootVolumeType: [
      CCEValidators.rootVolumeTypeRequired(nodePools, intl),
    ],
    dataVolumeType: [
      CCEValidators.dataVolumeTypeRequired(nodePools, intl),
    ],
    rootVolumeSize: [
      CCEValidators.rootVolumeSizeRequired(nodePools, intl),
    ],
    dataVolumeSize: [
      CCEValidators.dataVolumeSizeRequired(nodePools, intl),
    ],
    flavor: [
      CCEValidators.flavorRequired(nodePools, intl),
    ],
    operatingSystem: [
      CCEValidators.operatingSystemRequired(nodePools, intl),
    ],
    sshKey: [
      CCEValidators.sshKeyRequired(nodePools, intl),
    ],
  } : {};
  const importRules = isImportMode ? {
    clusterID: [
      CCEValidators.clusterIDRequired(cceConfig, intl),
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

  for (const key in rules) {
    const validators = rules[key] || [];

    for (const validate of validators) {
      if (validate()) {
        return false;
      }
    }
  }

  return true;
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

function registerWatch() {
  watch(() => cceConfig.value.huaweiCredentialSecret, async(credential) => {
    state.value.errors = [];
    if (!credential) {
      return;
    }
    const promises = [];

    promises.push(fetchRegion(credential));
    if (!isImport.value) {
      if (isNewOrUnprovisioned.value) {
        applyStaticClusterDefaultsIfEmpty();
        applyAllNodePoolDefaults();
      }
      promises.push(
        fetchKubernetesVersions(credential),
        fetchVpc(credential),
        fetchListPublicIPs(credential),
        fetchVolumeTypes(credential),
        fetchOsAvailabilityZone(credential),
        fetchSecurityGroups(credential),
        fetchOsKeypairs(credential),
        fetchFlavors(credential)
      );
    }
    try {
      await Promise.all(promises);
      if (isImport.value) {
        await fetchClusters(credential);
      }
    } catch (err) {
      if (state.value.errors.length === 0) {
        state.value.errors.push(err);
      }
    }
  }, { immediate: true });
}

function setValidityPeriodOption() {
  const validityPeriodOptions = Object.keys(CONFIG_ENV.BILLING_MODE_VALIDITY_PERIOD).reduce((prev, period) => {
    CONFIG_ENV.BILLING_MODE_VALIDITY_PERIOD[period].forEach((item) => {
      prev.push({
        label: `${ item } ${ intl.value(`cceCn.bmsIsAutoRenew.${ period }s`, { count: item }) }`,
        value: `${ item } ${ period }`
      });
    });

    return prev;
  }, []);

  options.value.validityPeriodOptions = validityPeriodOptions;
}

function getFirstOptionValue(list) {
  return Array.isArray(list) && list.length > 0 ? list[0]?.value : '';
}

function parseKubernetesMinorVersion(version) {
  const matched = String(version || '').match(/v?(\d+)\.(\d+)(?:\.(\d+))?/);

  if (!matched) {
    return null;
  }

  return [
    Number(matched[1]),
    Number(matched[2]),
    Number(matched[3] || 0),
  ];
}

function compareKubernetesVersion(a, b) {
  const parsedA = parseKubernetesMinorVersion(a);
  const parsedB = parseKubernetesMinorVersion(b);

  if (!parsedA || !parsedB) {
    return 0;
  }

  for (let i = 0; i < parsedA.length; i++) {
    if (parsedA[i] !== parsedB[i]) {
      return parsedA[i] - parsedB[i];
    }
  }

  return 0;
}

function isRancherSupportedVersion(version) {
  return compareKubernetesVersion(version, RANCHER_SUPPORTED_MIN_VERSION) >= 0 &&
    compareKubernetesVersion(version, RANCHER_SUPPORTED_MAX_VERSION) <= 0;
}

function normalizeVersionOption(version) {
  const value = version?.value || version?.version || version?.name || version?.label || version;

  if (!value) {
    return null;
  }

  return {
    label:          version?.label || value,
    value,
    rancherEnabled: isRancherSupportedVersion(value),
    cceEnabled:     true,
  };
}

function normalizeVersionOptions(res) {
  const list = Array.isArray(res) ? res : (res?.versions || res?.items || res?.data || []);

  return list
    .map(normalizeVersionOption)
    .filter((item) => item?.rancherEnabled);
}

function withCurrentVersionOption(list) {
  const currentVersion = cceConfig.value.version;

  if (!currentVersion || list.some((item) => item.value === currentVersion)) {
    return list;
  }

  const currentOption = normalizeVersionOption(currentVersion);

  return currentOption?.value ? [...list, currentOption] : list;
}

function filterVersionOptionsMinCurrent(versionOptions, currentVersion) {
  if (!currentVersion) {
    return versionOptions;
  }

  return versionOptions.filter((item) => compareKubernetesVersion(item.value, currentVersion) >= 0);
}

function applyKubernetesVersionOptions(versionOptions) {
  let list = versionOptions.length > 0 ? versionOptions : CONFIG_ENV.KUBERNETESVERSIONS;

  // 只有在集群创建出来之后才过滤版本
  if (!isNewOrUnprovisioned.value) {
    list = filterVersionOptionsMinCurrent(list, cceConfig.value.version);
  }

  options.value.kubernetesVersionOptions = withCurrentVersionOption(list);
}

// 初始化 Kubernetes 版本：取 API 返回列表第一项，仅新建/未创建成功且 version 为空时填充
function syncCreateVersionDefault() {
  if (!isNewOrUnprovisioned.value) {
    return;
  }

  const versionOptions = options.value.kubernetesVersionOptions || [];

  applyLinkedDefaultIfEmpty(cceConfig.value, 'version', getFirstOptionValue(versionOptions));
}

function getFirstNonDefaultOptionValue(list) {
  if (!Array.isArray(list)) {
    return '';
  }

  return list.find((item) => item?.value && item.value !== 'default')?.value || '';
}

function normalizeNumber(value) {
  const num = Number(value);

  return Number.isNaN(num) ? undefined : num;
}

function isEmptyValue(value) {
  return value === undefined || value === null || value === '';
}

function canApplyLinkedDefaults(target) {
  return isNewOrUnprovisioned.value || target?.isNew === true;
}

// 强制覆盖联动字段（用户主动切换类型/VPC/新增节点池时使用，overwrite: true）
function applyLinkedValue(target, key, value) {
  if (!canApplyLinkedDefaults(target) || isEmptyValue(value)) {
    return;
  }

  target[key] = value;
}

// 仅当字段为空时填充（API 请求返回后补默认值，不覆盖用户已选值）
function applyLinkedDefaultIfEmpty(target, key, value) {
  if (!canApplyLinkedDefaults(target) || isEmptyValue(value) || !isEmptyValue(target?.[key])) {
    return;
  }

  target[key] = value;
}

function getPoolFlavorOption(pool) {
  if (!pool?.availableZone) {
    return undefined;
  }

  const flavorOptions = options.value.flavorOptionsByZones?.[pool.availableZone] || [];

  return flavorOptions.find((item) => item.value === pool.flavor);
}

// 联动节点池操作系统：根据集群版本、节点规格、集群类型（Standard/Turbo）选取默认 OS
function syncNodePoolOperatingSystem(pool) {
  if (!pool || !canApplyLinkedDefaults(pool)) {
    return;
  }

  if (pool.flavor && pool.availableZone && !getPoolFlavorOption(pool)) {
    const zoneOptions = options.value.flavorOptionsByZones?.[pool.availableZone];

    if (!zoneOptions?.length) {
      return;
    }
  }

  const nextOs = getDefaultOperatingSystemValue({
    clusterVersion: cceConfig.value.version,
    flavorOption:   getPoolFlavorOption(pool),
    cceConfig:      cceConfig.value,
  });

  if (nextOs) {
    pool.operatingSystem = nextOs;
  }
}

function syncAllNodePoolOperatingSystems() {
  if (!Array.isArray(nodePools.value)) {
    return;
  }

  nodePools.value.forEach((pool) => syncNodePoolOperatingSystem(pool));
}

// 初始化/联动节点池默认值
// overwrite=false：请求返回后只填空；overwrite=true：用户切换类型或新增节点池时强制覆盖
// 编辑模式下新增节点池（pool.isNew）同样适用
// 字段：可用区、根盘/数据盘类型、节点规格、SSH 密钥、根盘 50G、数据盘 100G、节点数 3、按需计费、containerd 运行时、操作系统
function applyNodePoolDefaults(pool, { overwrite = false } = {}) {
  if (!pool || (!isNewOrUnprovisioned.value && !(overwrite && pool.isNew))) {
    return;
  }

  const setValue = overwrite ? applyLinkedValue : applyLinkedDefaultIfEmpty;

  setValue(pool, 'availableZone', getFirstOptionValue(options.value.availableZoneOptions));

  const zone = pool.availableZone;
  const volumeTypeOptions = zone ? (options.value.volumeTypeChoicesByZones?.[zone] || []) : [];
  const flavorOptions = zone ? (options.value.flavorOptionsByZones?.[zone] || []) : [];

  setValue(pool, 'rootVolumeType', getFirstOptionValue(volumeTypeOptions));
  setValue(pool, 'dataVolumeType', getFirstOptionValue(volumeTypeOptions));
  setValue(pool, 'flavor', getDefaultFlavorValue(flavorOptions));
  setValue(pool, 'sshKey', getFirstOptionValue(options.value.sshKeyOptions));
  setValue(pool, 'rootVolumeSize', CONFIG_ENV.DEFAULT_NODE_GROUP_CONFIG.rootVolumeSize);
  setValue(pool, 'dataVolumeSize', CONFIG_ENV.DEFAULT_NODE_GROUP_CONFIG.dataVolumeSize);
  setValue(pool, 'initialNodeCount', CONFIG_ENV.DEFAULT_NODE_GROUP_CONFIG.initialNodeCount);
  setValue(pool, 'billingMode', CONFIG_ENV.DEFAULT_NODE_GROUP_CONFIG.billingMode);
  setValue(pool, 'runtime', CONFIG_ENV.DEFAULT_NODE_GROUP_CONFIG.runtime);
  syncNodePoolOperatingSystem(pool);
}

// 对所有节点池执行 applyNodePoolDefaults
function applyAllNodePoolDefaults({ overwrite = false } = {}) {
  if (!Array.isArray(nodePools.value)) {
    return;
  }

  nodePools.value.forEach((pool) => applyNodePoolDefaults(pool, { overwrite }));
}

// 防止快速连续切换集群类型时，旧的 async 请求覆盖最新选择
let categoryUpdateId = 0;

// 切换集群类型时立即重置网络相关字段（不等待 API）
// Turbo：容器网络 eni、清空容器网段、VPC 取第一个非 default、清空子网
// Standard：容器网络 vpc-router、容器网段 10.0.0.0/16、VPC/子网 default
function applyCategoryDefaults() {
  if (!isNewOrUnprovisioned.value) {
    return;
  }

  state.value.eniNetworks = [];

  if (isTurbo.value) {
    cceConfig.value.containerNetworkMode = 'eni';
    cceConfig.value.containerNetworkCidr = '';
    cceConfig.value.vpcId = getFirstNonDefaultOptionValue(options.value.vpcOptions);
    cceConfig.value.subnetId = '';

    return;
  }

  cceConfig.value.containerNetworkMode = 'vpc-router';
  cceConfig.value.containerNetworkCidr = CONFIG_ENV.DEFAULTCCECONFIG.containerNetworkCidr;
  cceConfig.value.vpcId = 'default';
  cceConfig.value.subnetId = 'default';
}

// 根据集群类型初始化/联动网络字段（fetchVpc/fetchListSubnets 完成后或用户切换类型后）
// Turbo：VPC、子网、ENI 子网（取 API 列表第一项）
// Standard：VPC default、子网 default、容器网段 10.0.0.0/16
function applyCategoryNetworkDefaults({ overwrite = false } = {}) {
  if (!isNewOrUnprovisioned.value) {
    return;
  }

  const setValue = overwrite ? applyLinkedValue : applyLinkedDefaultIfEmpty;

  if (isTurbo.value) {
    setValue(cceConfig.value, 'vpcId', getFirstNonDefaultOptionValue(options.value.vpcOptions));
    setValue(cceConfig.value, 'subnetId', getFirstNonDefaultOptionValue(options.value.subnetOptions));

    const eniSubnet = getFirstOptionValue(options.value.eniNetworkCidrMutipleSelectOptions);

    if (eniSubnet && (overwrite || !state.value.eniNetworks?.length)) {
      state.value.eniNetworks = [eniSubnet];
    }
  } else {
    setValue(cceConfig.value, 'vpcId', getFirstOptionValue(options.value.vpcOptions) || 'default');
    setValue(cceConfig.value, 'subnetId', getFirstOptionValue(options.value.subnetOptions) || 'default');
    setValue(cceConfig.value, 'containerNetworkCidr', CONFIG_ENV.DEFAULTCCECONFIG.containerNetworkCidr);
  }
}

// 用户切换 VPC 后联动子网/ENI 默认值
// Turbo：子网取第一个非 default、ENI 子网取第一项
// Standard：子网 default
function applySubnetDefaults({ overwrite = false } = {}) {
  if (!isNewOrUnprovisioned.value) {
    return;
  }

  const setValue = overwrite ? applyLinkedValue : applyLinkedDefaultIfEmpty;

  if (isTurbo.value) {
    setValue(cceConfig.value, 'subnetId', getFirstNonDefaultOptionValue(options.value.subnetOptions));

    const eniSubnet = getFirstOptionValue(options.value.eniNetworkCidrMutipleSelectOptions);

    if (eniSubnet && (overwrite || !state.value.eniNetworks?.length)) {
      state.value.eniNetworks = [eniSubnet];
    }
  } else {
    setValue(cceConfig.value, 'subnetId', getFirstOptionValue(options.value.subnetOptions) || 'default');
  }
}

// fetchVpc 完成后初始化 VPC：Turbo 取第一个真实 VPC，Standard 取 default
function applyVpcDefaultIfEmpty() {
  if (!isNewOrUnprovisioned.value) {
    return;
  }

  if (isTurbo.value) {
    applyLinkedDefaultIfEmpty(cceConfig.value, 'vpcId', getFirstNonDefaultOptionValue(options.value.vpcOptions));
  } else {
    applyLinkedDefaultIfEmpty(cceConfig.value, 'vpcId', getFirstOptionValue(options.value.vpcOptions) || 'default');
  }
}

// fetchSecurityGroups 完成后初始化安全组：取 API 返回列表第一项
function applySecurityGroupDefaultIfEmpty() {
  if (!isNewOrUnprovisioned.value) {
    return;
  }

  applyLinkedDefaultIfEmpty(cceConfig.value, 'securityGroup', getFirstOptionValue(options.value.securityGroupOptions));
}

// 选择云凭证后同步初始化集群静态字段（不依赖 API）
// 集群类型 CCE、容器网络模式、Service 网段 10.247.0.0/16、kube-proxy iptables、
// 认证模式 rbac、EIP 按流量计费/5_bgp、Standard 容器网段 10.0.0.0/16
function applyStaticClusterDefaultsIfEmpty() {
  if (!isNewOrUnprovisioned.value) {
    return;
  }

  applyLinkedDefaultIfEmpty(cceConfig.value, 'category', CONFIG_ENV.DEFAULTCCECONFIG.category);

  if (isEmptyValue(cceConfig.value.containerNetworkMode)) {
    cceConfig.value.containerNetworkMode = isTurbo.value ? 'eni' : CONFIG_ENV.DEFAULTCCECONFIG.containerNetworkMode;
  }

  applyLinkedDefaultIfEmpty(cceConfig.value, 'kubernetesSvcIPRange', CONFIG_ENV.DEFAULTCCECONFIG.kubernetesSvcIPRange);
  applyLinkedDefaultIfEmpty(cceConfig.value, 'kubeProxyMode', CONFIG_ENV.DEFAULTCCECONFIG.kubeProxyMode);
  applyLinkedDefaultIfEmpty(cceConfig.value, 'authentiactionMode', CONFIG_ENV.DEFAULTCCECONFIG.authentiactionMode);
  applyLinkedDefaultIfEmpty(cceConfig.value, 'eipChargeMode', CONFIG_ENV.DEFAULTCCECONFIG.eipChargeMode);
  applyLinkedDefaultIfEmpty(cceConfig.value, 'eipType', CONFIG_ENV.DEFAULTCCECONFIG.eipType);

  if (!isTurbo.value) {
    applyLinkedDefaultIfEmpty(cceConfig.value, 'containerNetworkCidr', CONFIG_ENV.DEFAULTCCECONFIG.containerNetworkCidr);
  }
}

// 联动集群规格 clusterFlavor（格式 cce.{高可用}.{规模}，如 cce.s2.small）
// 管理规模 >200 节点时强制开启高可用（s2）并禁用高可用选项
function syncClusterFlavor() {
  if (!isNewOrUnprovisioned.value) {
    return;
  }

  const matched = find(CONFIG_ENV.MANAGEMENT_SCALE_VIRTUAL, { value: state.value.managementScale });

  state.value.highAvailabilityDisabled = false;
  if (matched && parseInt(matched.label, 10) > 200) {
    state.value.highAvailabilityDisabled = true;
    state.value.highAvailabilityEnabled = 's2';
  }

  cceConfig.value.clusterFlavor = `cce.${ state.value.highAvailabilityEnabled }.${ state.value.managementScale }`;
}

async function updateCategory(value) {
  cceConfig.value.category = value;

  if (!isNewOrUnprovisioned.value) {
    return;
  }

  const updateId = ++categoryUpdateId;

  applyCategoryDefaults();

  if (cceConfig.value.huaweiCredentialSecret) {
    await fetchVpc(cceConfig.value.huaweiCredentialSecret);
    if (updateId !== categoryUpdateId) {
      return;
    }
    await fetchListSubnets(cceConfig.value.huaweiCredentialSecret);
    if (updateId !== categoryUpdateId) {
      return;
    }
  }

  applyCategoryNetworkDefaults({ overwrite: true });
  applyAllNodePoolDefaults({ overwrite: true });
}

function updateVersion(value) {
  cceConfig.value.version = value;

  if (!isNewOrUnprovisioned.value) {
    return;
  }

  syncAllNodePoolOperatingSystems();
}

async function updateVpcId(value) {
  cceConfig.value.vpcId = value;

  if (!isNewOrUnprovisioned.value) {
    return;
  }

  if (isTurbo.value) {
    cceConfig.value.subnetId = '';
    state.value.eniNetworks = [];
  } else {
    cceConfig.value.subnetId = 'default';
  }

  if (cceConfig.value.huaweiCredentialSecret) {
    await fetchListSubnets(cceConfig.value.huaweiCredentialSecret);
  }

  applySubnetDefaults({ overwrite: true });
}

function updateContainerNetworkMode(value) {
  cceConfig.value.containerNetworkMode = value;

  if (!isNewOrUnprovisioned.value) {
    return;
  }

  syncAllNodePoolOperatingSystems();
}

function updateManagementScale(value) {
  state.value.managementScale = value;
  syncClusterFlavor();
}

function updateHighAvailabilityEnabled(value) {
  state.value.highAvailabilityEnabled = value;
  syncClusterFlavor();
}

// method
async function fetchKubernetesVersions(cloudCredentialId) {
  state.value.versionLoading = true;
  try {
    const res = await queryHuawei({
      resource:       'versions',
      cloudCredentialId,
      store,
      externalParams: {},
    });
    const versionOptions = normalizeVersionOptions(res);

    applyKubernetesVersionOptions(versionOptions);
    syncCreateVersionDefault();
    if (isNewOrUnprovisioned.value) {
      syncAllNodePoolOperatingSystems();
    }
  } catch (err) {
    applyKubernetesVersionOptions(CONFIG_ENV.KUBERNETESVERSIONS);
    syncCreateVersionDefault();
    state.value.errors = [];
    state.value.errors.push(err);
  }
  state.value.versionLoading = false;
}

async function fetchFlavors(cloudCredentialId) {
  const flavorOptionsByZones = {};

  state.value.flavorLoading = true;
  try {
    const res = await queryHuawei({
      resource:       'flavors',
      cloudCredentialId,
      store,
      externalParams: {},
    });

    options.value.flavorOptionsByZones = {};
    if (res.length === 0) {
      state.value.flavorLoading = false;

      return;
    }
    res.forEach((flavor) => {
      const specAz = flavor?.os_extra_specs['cond:operation:az'] || '';

      specAz.split(',').forEach((az) => {
        if (az.includes('(normal)')) {
          const zone = az.substr(0, az.length - 8);

          flavorOptionsByZones[zone] = flavorOptionsByZones[zone] || [];
          flavorOptionsByZones[zone].push({
            label:  `${ flavor.name } ( vCPUs: ${ flavor.vcpus }, memory: ${ flavor.ram / 1024 } GB )`,
            value:  flavor.name,
            group:  flavor.name.split('.')[0],
            vcpus:  normalizeNumber(flavor.vcpus),
            memory: normalizeNumber(flavor.ram / 1024),
            raw:    flavor,
          });
        }
      });
    });

    options.value.flavorOptionsByZones = flavorOptionsByZones;
    applyAllNodePoolDefaults();
  } catch (err) {
    options.value.flavorOptionsByZones = {};
    state.value.errors = [];
    state.value.errors.push(err);
  }
  state.value.flavorLoading = false;
}

async function fetchVpc(cloudCredentialId) {
  state.value.vpcLoading = true;
  try {
    const externalParams = {};
    const res = await queryHuawei({
      resource: 'vpcs',
      cloudCredentialId,
      store,
      externalParams,
    });
    const initVpcs = [];
    let vpcOptions = [];

    options.value.vpcOptions = [];
    if (!isTurbo.value) {
      initVpcs.push({
        label: intl.value('cceCn.vpcId.default'),
        value: 'default',
      });
    }

    if (res?.length > 0) {
      vpcOptions = res.reduce((prev, v) => {
        prev.push({
          label: v.name,
          value: v.id
        });

        return prev;
      }, initVpcs);
    }

    options.value.vpcOptions = vpcOptions;

    if (isNewOrUnprovisioned.value) {
      applyVpcDefaultIfEmpty();
    }
    await fetchListSubnets(cloudCredentialId);
  } catch (err) {
    options.value.vpcOptions = [];
    state.value.errors = [];
    state.value.errors.push(err);
  }
  state.value.vpcLoading = false;
}

async function fetchListPublicIPs(cloudCredentialId) {
  state.value.publicIPsLoading = true;
  try {
    const externalParams = {};
    const res = await queryHuawei({
      resource: 'listPublicIPs',
      cloudCredentialId,
      store,
      externalParams,
    });
    let eipOptions = [];

    if (res?.length > 0) {
      eipOptions = res.reduce((prev, eip) => {
        if (eip.status === 'DOWN') {
          prev.push({
            label: `${ eip.public_ip_address }(${ eip.type }) `,
            value: eip.public_ip_address,
          });
        }

        return prev;
      }, []);
    }
    options.value.externalIPOptions = eipOptions;
  } catch (err) {
    options.value.externalIPOptions = [];
    state.value.errors = [];
    state.value.errors.push(err);
  }
  state.value.publicIPsLoading = false;
}

async function fetchListSubnets(cloudCredentialId) {
  state.value.subnetsLoading = true;
  const vpcID = cceConfig.value.vpcId;

  if (!vpcID || vpcID === 'default') {
    if (!isTurbo.value) {
      options.value.subnetOptions = [{
        label: intl.value('cceCn.subnetId.default'),
        value: 'default',
      }];
    } else {
      options.value.subnetOptions = [];
      options.value.eniNetworkCidrMutipleSelectOptions = [];
    }
    applySubnetDefaults({ overwrite: false });
    state.value.subnetsLoading = false;

    return;
  }
  try {
    const externalParams = { vpcID };
    const res = await queryHuawei({
      resource: 'subnets',
      cloudCredentialId,
      store,
      externalParams,
    });
    const initSubnetOptions = [];
    let subnetOptions = [];

    if (!isTurbo.value) {
      initSubnetOptions.push({
        label: intl.value('cceCn.subnetId.default'),
        value: 'default',
      });
    }

    if (res?.length > 0) {
      subnetOptions = res.reduce((prev, s) => {
        if (s.vpc_id === vpcID) {
          prev.push({
            label:         s.name,
            value:         s.id,
            neutronSubnet: s.neutron_subnet_id,
          });
        }

        return prev;
      }, initSubnetOptions);
    }
    options.value.eniNetworkCidrMutipleSelectOptions = subnetOptions.map((subnet) => {
      return {
        label: subnet.label,
        value: subnet.neutronSubnet,
      };
    });
    options.value.subnetOptions = subnetOptions;
    applySubnetDefaults({ overwrite: false });
  } catch (err) {
    options.value.eniNetworkCidrMutipleSelectOptions = [];
    options.value.subnetOptions = [];
    state.value.errors = [];
    state.value.errors.push(err);
  }
  state.value.subnetsLoading = false;
}

async function fetchVolumeTypes(cloudCredentialId) {
  const volumeTypeChoicesByZones = {};
  const types = ['SSD', 'SAS', 'SATA', 'GPSSD', 'ESSD'];

  state.value.volumeTypesLoading = true;
  try {
    const res = await queryHuawei({
      resource:       'volumeTypes',
      cloudCredentialId,
      store,
      externalParams: {},
    });

    options.value.volumeTypeChoicesByZones = {};

    if (res.length === 0) {
      state.value.volumeTypesLoading = false;

      return;
    }

    res.forEach((volumeType) => {
      const extraSpecs = volumeType.extra_specs;

      if (
        typeof extraSpecs !== 'object' ||
        extraSpecs === null ||
        !types.includes(volumeType.name)
      ) {
        return;
      }

      const rawAvailability = extraSpecs['RESKEY:availability_zones'] ?? '';

      if (typeof rawAvailability !== 'string' || rawAvailability.trim() === '') {
        return;
      }
      const availabilityArr = rawAvailability
        .split(',')
        .map((z) => z.trim())
        .filter((z) => z);

      const rawSoldOut = extraSpecs['os-vendor-extended:sold_out_availability_zones'] ?? '';
      const soldOutArr = typeof rawSoldOut === 'string' ? rawSoldOut.split(',').map((z) => z.trim()) : [];

      const availableZones = availabilityArr.filter(
        (zone) => !soldOutArr.includes(zone)
      );

      availableZones.forEach((zone) => {
        if (!volumeTypeChoicesByZones[zone]) {
          volumeTypeChoicesByZones[zone] = [];
        }
        volumeTypeChoicesByZones[zone].push({
          label: `cceCn.volumetype.${ volumeType.name }`,
          value: volumeType.name,
        });
      });

      options.value.volumeTypeChoicesByZones = volumeTypeChoicesByZones;
    });
    applyAllNodePoolDefaults();
  } catch (err) {
    options.value.volumeTypeChoicesByZones = {};
    state.value.errors = [];
    state.value.errors = [err];
  }
  state.value.volumeTypesLoading = false;
}

async function fetchOsAvailabilityZone(cloudCredentialId) {
  state.value.osAvailabilityZoneLoading = true;
  try {
    const res = await queryHuawei({
      resource:       'osAvailabilityZone',
      cloudCredentialId,
      store,
      externalParams: {},
    });

    options.value.availableZoneOptions = [];
    if (res.length === 0) {
      state.value.osAvailabilityZoneLoading = false;

      return;
    }

    const availableZoneOptions = res.reduce((prev, zone) => {
      if (zone?.zoneState?.available && cceConfig.value.regionID) {
        const id = zone.zoneName || '';
        const regionId = cceConfig.value.regionID;

        if (id.startsWith(regionId)) {
          const num = id.substr(regionId.length, 1).charCodeAt() - 96;

          prev.push({
            label: intl.value('cceCn.availableZone.value', { num }),
            value: id
          });
        } else {
          prev.push({
            label: zone.zoneName,
            value: zone.zoneName,
          });
        }
      }

      return prev;
    }, []);

    options.value.availableZoneOptions = availableZoneOptions;
    applyAllNodePoolDefaults();
  } catch (err) {
    options.value.availableZoneOptions = [];
    state.value.errors = [];
    state.value.errors = [err];
  }
  state.value.osAvailabilityZoneLoading = false;
}

async function fetchSecurityGroups(cloudCredentialId) {
  state.value.securityGroupsLoading = true;
  try {
    const res = await queryHuawei({
      resource:       'securityGroups',
      cloudCredentialId,
      store,
      externalParams: {},
    });

    options.value.securityGroupOptions = [];
    if (res.length === 0) {
      state.value.securityGroupsLoading = false;

      return;
    }

    const securityGroupChoices = res.map((item) => {
      return {
        label: item.name,
        value: item.id
      };
    });

    options.value.securityGroupOptions = securityGroupChoices;
    applySecurityGroupDefaultIfEmpty();
  } catch (err) {
    options.value.securityGroupOptions = [];
    state.value.errors = [];
    state.value.errors = [err];
  }
  state.value.securityGroupsLoading = false;
}

async function fetchOsKeypairs(cloudCredentialId) {
  state.value.osKeypairsLoading = true;
  try {
    const res = await queryHuawei({
      resource:       'osKeypairs',
      cloudCredentialId,
      store,
      externalParams: {},
    });

    options.value.sshKeyOptions = [];
    if (res.length === 0) {
      state.value.osKeypairsLoading = false;

      return;
    }

    const sshKeyOptions = res.map((sshKey) => {
      return {
        label: sshKey?.keypair?.name,
        value: sshKey?.keypair?.name,
      };
    });

    options.value.sshKeyOptions = sshKeyOptions;
    applyAllNodePoolDefaults();
  } catch (err) {
    options.value.sshKeyOptions = [];
    state.value.errors = [];
    state.value.errors = [err];
  }
  state.value.osKeypairsLoading = false;
}

async function fetchClusters(cloudCredentialId) {
  state.value.clusterLoading = true;
  try {
    const res = await queryHuawei({
      resource:       'clusters',
      cloudCredentialId,
      store,
      externalParams: { regionID: cceConfig.value.regionID },
    });
    const out = [];

    if (res.length === 0) {
      options.value.clusterOptions = out;
      state.value.clusterLoading = false;

      return;
    }
    res.forEach((c) => {
      out.push({
        label: c.metadata.name,
        value: c.metadata.uid
      });
    });

    options.value.clusterOptions = out;
  } catch (err) {
    options.value.clusterOptions = [];
    state.value.errors = [];
    state.value.errors = [err];
  }
  state.value.clusterLoading = false;
}

function cancelCredential() {
  if (cruresource.value) {
    cruresource.value.emitOrRoute();
  }
}

function initPrivateRegistryConfig() {
  if (!normanCluster.value?.importedConfig) {
    normanCluster.value.importedConfig = { privateRegistryURL: null };
  } else if (!normanCluster.value.importedConfig.privateRegistryURL) {
    normanCluster.value.importedConfig.privateRegistryURL = null;
  }

  state.value.showPrivateRegistryInput = !!normanCluster.value.importedConfig.privateRegistryURL;
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

function setClusterName(name) {
  normanCluster.value['name'] = name;
  cceConfig.value['name'] = name;
}

async function fetchRegion(credentialID) {
  const allCredentials = await store.dispatch('rancher/findAll', { type: NORMAN.CLOUD_CREDENTIAL });
  const filteredCredentials = allCredentials.filter((x) => x.provider === 'huawei');
  const matched = find(filteredCredentials, { id: credentialID });
  const regionId = matched?.huaweicredentialConfig?.regionID ?? '';

  cceConfig.value.regionID = regionId;
  state.value.regionName = intl.value(`cceCn.region.${ regionId.replace(/\-/g, '_') }`);
}

async function initCustomConfig() {
  state.value.loading = true;
  state.value.errors = [];
  if (props.value.id) {
    const liveNormanCluster = await props.value.findNormanCluster();

    normanCluster.value = await store.dispatch(`rancher/clone`, { resource: liveNormanCluster });
    initPrivateRegistryConfig();

    if (normanCluster.value.cceConfig) {
      fixConfig(normanCluster);
    }
  } else {
    normanCluster.value = await store.dispatch('rancher/create', { type: NORMAN.CLUSTER }, { root: true });
    initPrivateRegistryConfig();

    const principalId = store.getters['auth/principalId'];

    if (principalId.includes('local://')) {
      normanCluster.value.annotations = { ...normanCluster.value.annotations, [CREATOR_PRINCIPAL_ID]: principalId };
    }

    nodePools.value = [{ ...CONFIG_ENV.DEFAULT_NODE_GROUP_CONFIG }];
    cceConfig.value = { ...CONFIG_ENV.DEFAULTCCECONFIG };
  }
  state.value.loading = false;
}

async function initImportConfig() {
  state.value.loading = true;
  state.value.errors = [];
  normanCluster.value = await store.dispatch('rancher/create', { type: NORMAN.CLUSTER }, { root: true });
  initPrivateRegistryConfig();

  const principalId = store.getters['auth/principalId'];

  if (principalId.includes('local://')) {
    normanCluster.value.annotations = { ...normanCluster.value.annotations, [CREATOR_PRINCIPAL_ID]: principalId };
  }

  if (!normanCluster?.value?.cceConfig) {
    normanCluster.value.cceConfig = {
      imported:               true,
      name:                   '',
      huaweiCredentialSecret: '',
      clusterID:              '',
      regionID:               '',
    };
  }
  if (normanCluster?.value?.cceConfig?.nodePools && normanCluster?.value?.cceConfig?.nodePools?.length > 0) {
    nodePools.value = cloneDeep(normanCluster.value.cceConfig.nodePools);
  }

  cceConfig.value = cloneDeep({ ...normanCluster.value.cceConfig });

  state.value.loading = false;
}

function fixConfig(liveNormanCluster) {
  const config = liveNormanCluster?.value?.cceConfig;
  const nodePoolList = [];
  const pools = config?.nodePools || [];

  pools.forEach((pool) => {
    const {
      flavor,
      availableZone,
      operatingSystem,
      sshKey,
      rootVolume,
      dataVolumes,
      billingMode,
      runtime,
      extendParam
    } = pool.nodeTemplate;
    const out = {
      name:             pool.name,
      initialNodeCount: pool.initialNodeCount,
      flavor,
      availableZone,
      operatingSystem,
      sshKey,
      rootVolumeSize:   rootVolume.size,
      rootVolumeType:   rootVolume.type,
      dataVolumeSize:   dataVolumes[0].size,
      dataVolumeType:   dataVolumes[0].type,
      billingMode,
      runtime,
    };

    if (pool.nodePoolID) {
      out.nodePoolID = pool.nodePoolID;
    }

    if (billingMode === 1) {
      out.validityPeriod = `${ extendParam.periodNum } ${ extendParam.periodType }`;
      out.bmsIsAutoRenew = extendParam.isAutoRenew;
    }

    const displayShowValue = {};

    nodePoolList.push(Object.assign(out, displayShowValue));
  });

  const {
    category,
    containerNetwork,
    version,
    hostNetwork,
    kubernetesSvcIPRange,
    description,
    authentication,
    tags,
    clusterID,
    publicIP,
    kubeProxyMode,
    eniNetwork,
    flavor,
    huaweiCredentialSecret,
  } = config;

  const out = {
    category,
    huaweiCredentialSecret,
    containerNetworkCidr: containerNetwork.cidr,
    containerNetworkMode: containerNetwork.mode,
    version,
    vpcId:                hostNetwork.vpcID ? hostNetwork.vpcID : 'default',
    subnetId:             hostNetwork.subnetID ? hostNetwork.subnetID : 'default',
    securityGroup:        hostNetwork.securityGroup,
    kubernetesSvcIPRange,
    description,
    authentiactionMode:   authentication.mode,
    tags,
    taglength:            Object.keys(tags || {}).length,
    clusterID,
    kubeProxyMode,
    imported:             config.imported,
    clusterFlavor:        config.flavor,
    eniNetwork,
  };

  if (config.publicAccess) {
    if (config?.publicIP?.eip?.ipType) {
      state.value.eipSelection = 'new';
      out.eipBandwidthSize = publicIP?.eip?.bandwidth?.size;
      out.eipChargeMode = publicIP?.eip?.bandwidth?.chargeMode;
      out.eipType = publicIP?.eip?.ipType;
    } else if (config?.extendParam?.clusterExternalIP || liveNormanCluster.value?.cceStatus?.clusterExternalIP) {
      state.value.eipSelection = 'exist';
      out.clusterExternalIP = config?.extendParam?.clusterExternalIP || liveNormanCluster.value?.cceStatus?.clusterExternalIP;
    }
  } else {
    state.value.eipSelection = 'none';
  }

  if (authentication.mode === 'authenticating_proxy') {
    const { ca, cert, privateKey } = authentication.authenticatingProxy || {};

    out.authenticatingProxyCa = base64Decode(ca);
    out.authenticatingProxyCert = base64Decode(cert);
    out.authenticatingProxyPrivateKey = base64Decode(privateKey);
  }

  nodePools.value = nodePoolList;
  cceConfig.value = out;

  if (eniNetwork && eniNetwork?.subnets?.length > 0) {
    state.value.eniNetworks = eniNetwork.subnets;
  }

  if ( flavor ) {
    const arr = flavor.split('.');

    state.value.highAvailabilityEnabled = arr[1];
    state.value.managementScale = arr[2];
  }
}

function addPool() {
  if (cceConfig.value.imported) {
    return;
  }
  let nextDefaultSuffix = nodePools.value?.length + 1;

  while (nodePools.value.find((group) => group.name === `nodepool-${ nextDefaultSuffix }`)) {
    nextDefaultSuffix++;
  }

  const name = `nodepool-${ nextDefaultSuffix }`;
  const ngConfig = {
    ...CONFIG_ENV.DEFAULT_NODE_GROUP_CONFIG,
    name,
    isNew: true,
  };

  nodePools.value.push(ngConfig);
  applyNodePoolDefaults(ngConfig, { overwrite: true });
}

function removePool(index) {
  if (cceConfig.value.imported) {
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

  pullAt(nodePools.value, index);
}

function poolIsValid(pool) {
  if (
    !pool.name ||
    !pool.availableZone ||
    !pool.rootVolumeType ||
    !pool.rootVolumeSize ||
    !pool.dataVolumeType ||
    !pool.dataVolumeSize ||
    isNaN(pool.initialNodeCount) ||
    pool.initialNodeCount < 0 ||
    !pool.flavor ||
    !pool.sshKey
  ) {
    return false;
  }

  const names = nodePools.value?.map((pool) => pool.name) || [];

  return uniqBy(names, (name) => name).length === names.length;
}

function updateCceConfigTags(tags) {
  cceConfig.value.tags = tags;
}

onMounted(async() => {
  if (isImport.value) {
    await initImportConfig();
  } else {
    await initCustomConfig();
  }
  syncClusterFlavor();
  registerWatch();
  setValidityPeriodOption();
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
    <div :class="{'row': hasCredential, 'mb-10': hasCredential}">
      <div :class="{'col': true, 'span-6': hasCredential}">
        <SelectCredential
          v-model:value="cceConfig.huaweiCredentialSecret"
          data-testid="crucce-select-credential"
          :mode="mode === VIEW ? VIEW : CREATE"
          provider="huawei"
          :default-on-cancel="true"
          :showing-form="hasCredential"
          class="mt-20"
          :cancel="cancelCredential"
        />
      </div>
      <div
        v-if="hasCredential"
        class="col span-6"
      >
        <LabeledInput
          class="mt-20"
          :value="state.regionName"
          :mode="mode"
          label-key="cceCn.region.label"
          disabled="true"
        />
      </div>
    </div>
    <div
      v-if="hasCredential"
      class="mt-10"
      data-testid="crucce-form"
    >
      <div
        v-if="isImport"
      >
        <div>
          <ImportCce
            v-model:name="normanCluster.name"
            v-model:description="normanCluster.description"
            v-model:clusterID="cceConfig.clusterID"
            :clusterOptions="options.clusterOptions"
            :clusterLoading="state.clusterLoading"
            :mode="mode"
            :rules="{
              name: ruleSets.name,
              clusterID: ruleSets.clusterID,
            }"
            @update:setClusterName="setClusterName"
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
          :label="t('cceCn.updateWarn')"
        />
        <Banner
          v-for="(err, i) in state.errors"
          :key="i"
          color="error"
          :label="stringify(err)"
        />
        <div class="cluster-basic-card mb-10">
          <div class="cluster-basic-card__header">
            <h3 class="cluster-basic-card__title">
              {{ intl('cceCn.basicConfig.title') }}
            </h3>
            <div class="cluster-basic-card__desc">
              {{ intl('cceCn.basicConfig.description') }}
            </div>
          </div>
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
          <div class="row mb-10">
            <div class="col span-6">
              <LabeledSelect
                :value="cceConfig.category"
                data-testid="crucce-clusterType"
                :mode="mode"
                :options="CONFIG_ENV.CLUSTER_TYPES"
                option-label="label"
                option-key="value"
                label-key="cceCn.clusterType.label"
                :rules="ruleSets.category"
                required
                :localizedLabel="true"
                :disabled="!isNewOrUnprovisioned"
                @update:value="updateCategory"
              />
            </div>
            <div class="col span-6">
              <LabeledSelect
                :value="cceConfig.version"
                data-testid="crucce-version"
                :mode="mode"
                :options="options.kubernetesVersionOptions"
                option-label="label"
                option-key="value"
                label-key="cceCn.version.label"
                :rules="ruleSets.version"
                :disabled="cceConfig.imported"
                required
                :loading="state.versionLoading"
                @update:value="updateVersion"
              />
            </div>
          </div>
          <div
            v-if="showVersionWarnings"
          >
            <Banner
              v-if="!kubernetesSupport.rancherEnabled"
              color="warning"
              label-key="cceCn.version.warningRacher"
            />
            <Banner
              v-if="!kubernetesSupport.cceEnabled"
              color="warning"
              :label="intl('cceCn.version.warningNotRecommend', { version: cceConfig.version })"
            />
          </div>
          <div class="row mb-10">
            <div class="col span-6">
              <LabeledSelect
                :value="state.managementScale"
                data-testid="crucce-management-scale"
                :mode="mode"
                :options="CONFIG_ENV.MANAGEMENT_SCALE_VIRTUAL"
                option-label="label"
                option-key="value"
                label-key="cceCn.managementScale.label"
                :rules="ruleSets.managementScale"
                required
                :disabled="!isNewOrUnprovisioned"
                @update:value="updateManagementScale"
              />
            </div>
            <div
              class="col span-6"
            >
              <LabeledSelect
                :value="cceConfig.containerNetworkMode"
                data-testid="crucce-container-network-mode"
                :mode="mode"
                :options="containerNetworkModeOptions"
                option-label="label"
                option-key="value"
                label-key="cceCn.containerNetworkMode.label"
                :rules="ruleSets.containerNetworkMode"
                required
                :localizedLabel="true"
                :disabled="!isNewOrUnprovisioned || isTurbo"
                @update:value="updateContainerNetworkMode"
              />
            </div>
          </div>
          <div class="network-option-card mt-10">
            <div class="network-option-card__title">
              {{ intl('cceCn.highAvailability.label') }}
            </div>
            <div class="network-option-card__desc">
              {{ intl('cceCn.highAvailability.description') }}
            </div>
            <div class="mt-10">
              <RadioGroup
                :value="state.highAvailabilityEnabled"
                :disabled="!isNewOrUnprovisioned || state.highAvailabilityDisabled"
                name="highAvailabilityEnabled"
                :options="['s2', 's1']"
                :labels="options.highAvailabilityOptions"
                :mode="mode"
                @update:value="updateHighAvailabilityEnabled"
              />
            </div>
          </div>
        </div>
        <div class="cluster-basic-card mb-10">
          <div class="cluster-basic-card__header">
            <h3 class="cluster-basic-card__title">
              {{ intl('cceCn.networkConfig.title') }}
            </h3>
            <div class="cluster-basic-card__desc">
              {{ intl('cceCn.networkConfig.description') }}
            </div>
          </div>
          <div class="row mb-10">
            <div class="col span-6">
              <LabeledSelect
                :value="cceConfig.vpcId"
                data-testid="crucce-vpc-id"
                :mode="mode"
                :options="options.vpcOptions"
                option-label="label"
                option-key="value"
                label-key="cceCn.vpcId.label"
                :rules="ruleSets.vpcId"
                required
                :disabled="!isNewOrUnprovisioned"
                :loading="state.vpcLoading"
                @update:value="updateVpcId"
              />
            </div>
            <div class="col span-6">
              <LabeledSelect
                v-model:value="cceConfig.subnetId"
                data-testid="crucce-subnet-id"
                :mode="mode"
                :options="options.subnetOptions"
                option-label="label"
                option-key="value"
                label-key="cceCn.subnetId.label"
                :rules="ruleSets.subnetId"
                required
                :disabled="!isNewOrUnprovisioned"
                :loading="state.subnetsLoading"
              />
            </div>
          </div>
          <div class="row mb-10">
            <div class="col span-6">
              <LabeledInput
                v-if="!isTurbo"
                v-model:value="cceConfig.containerNetworkCidr"
                data-testid="crucce-container-network-cidr"
                :mode="mode"
                :disabled="!isNewOrUnprovisioned"
                label-key="cceCn.containerNetworkCidr.label"
                :rules="ruleSets.containerNetworkCidr"
                :placeholder="intl('cceCn.containerNetworkCidr.placeholder')"
                required
              />
              <LabeledMultiSelect
                v-else
                v-model:value="state.eniNetworks"
                required
                :mode="mode"
                :options="options.eniNetworkCidrMutipleSelectOptions"
                :disabled="!isNewOrUnprovisioned"
                label-key="cceCn.eniNetworkCidr.label"
                :loading="state.subnetsLoading"
                :rules="ruleSets.eniNetworks"
              />
            </div>
            <div class="col span-6">
              <LabeledInput
                v-model:value="cceConfig.kubernetesSvcIPRange"
                data-testid="crucce-kubernetes-svc-ip-range"
                :mode="mode"
                :disabled="!isNewOrUnprovisioned"
                label-key="cceCn.kubernetesSvcIPRange.label"
                :rules="ruleSets.kubernetesSvcIPRange"
                :placeholder="intl('cceCn.kubernetesSvcIPRange.placeholder')"
                required
              />
            </div>
          </div>
          <div class="row mb-10">
            <div class="col span-6">
              <LabeledSelect
                v-model:value="cceConfig.securityGroup"
                data-testid="crucce-security-group"
                :mode="mode"
                :options="options.securityGroupOptions"
                option-label="label"
                option-key="value"
                :disabled="cceConfig.imported"
                label-key="cceCn.securityGroup.label"
                :rules="ruleSets.securityGroup"
                required
                :loading="state.securityGroupsLoading"
              />
            </div>
          </div>
          <div class="network-option-card mt-10">
            <div class="network-option-card__title">
              {{ intl('cceCn.kubeProxyMode.label') }}
            </div>
            <div class="network-option-card__desc">
              {{ intl('cceCn.kubeProxyMode.description') }}
            </div>
            <div class="mt-10">
              <RadioGroup
                v-model:value="cceConfig.kubeProxyMode"
                :disabled="!isNewOrUnprovisioned"
                name="selectKubeProxyMode"
                :options="['iptables', 'ipvs']"
                :labels="[
                  'iptables',
                  'IPVS',
                ]"
                :mode="mode"
              />
            </div>
          </div>
        </div>
        <div class="network-option-card mb-10">
          <div class="network-option-card__title">
            {{ intl('cceCn.publicAccess.label') }}
          </div>
          <div class="network-option-card__desc">
            {{ intl('cceCn.publicAccess.description') }}
          </div>
          <div class="row mt-10">
            <div class="col span-6">
              <RadioGroup
                v-model:value="state.eipSelection"
                name="eipSelection"
                :disabled="!isNewOrUnprovisioned"
                :options="['none', 'exist', 'new']"
                :labels="options.eipOptions"
                :mode="mode"
              />
            </div>
            <div class="col span-6">
              <LabeledSelect
                v-if="state.eipSelection === 'exist'"
                v-model:value="cceConfig.clusterExternalIP"
                data-testid="crucce-external-ip"
                :mode="mode"
                :options="options.externalIPOptions"
                option-label="label"
                option-key="value"
                label-key="cceCn.eipIds.label"
                required
                :rules="ruleSets.eipSelection"
                :disabled="!isNewOrUnprovisioned"
              />
              <div
                v-if="state.eipSelection === 'new'"
              >
                <LabeledSelect
                  v-model:value="cceConfig.eipType"
                  data-testid="crucce-eip-type"
                  :mode="mode"
                  :options="CONFIG_ENV.EIPTYPEOTPTIONS"
                  option-label="label"
                  option-key="value"
                  label-key="cceCn.eipType.label"
                  :localizedLabel="true"
                  :rules="ruleSets.eipType"
                  required
                  :disabled="!isNewOrUnprovisioned"
                />
                <LabeledSelect
                  v-model:value="cceConfig.eipChargeMode"
                  class="mt-10"
                  data-testid="crucce-external-ip"
                  :mode="mode"
                  :options="CONFIG_ENV.EIPCHARGEMODEOPTIONS"
                  option-label="label"
                  option-key="value"
                  :localizedLabel="true"
                  :rules="ruleSets.eipChargeMode"
                  required
                  label-key="cceCn.eipChargeMode.label"
                  :disabled="!isNewOrUnprovisioned"
                />
                <UnitInput
                  v-model:value="cceConfig.eipBandwidthSize"
                  class="mt-10"
                  :disabled="!isNewOrUnprovisioned"
                  :label="intl('cceCn.eipBandwidthSize.label')"
                  :rules="ruleSets.eipBandwidthSize"
                  required
                  min="0"
                  :mode="mode"
                  suffix="Mbit/s"
                />
              </div>
            </div>
          </div>
        </div>
        <div class="network-option-card mb-10">
          <div class="network-option-card__title">
            {{ intl('cceCn.authentiactionMode.label') }}
          </div>
          <div class="network-option-card__desc">
            {{ intl('cceCn.authentiactionMode.description') }}
          </div>
          <div class="mt-10">
            <RadioGroup
              v-model:value="cceConfig.authentiactionMode"
              name="authentiactionOptions"
              :disabled="!isNewOrUnprovisioned"
              :options="['rbac', 'authenticating_proxy']"
              :labels="options.authentiactionOptions"
              :mode="mode"
            />
          </div>
          <div v-if="cceConfig.authentiactionMode === 'authenticating_proxy' && isNewOrUnprovisioned">
            <div class="row mt-10">
              <div class="col span-6">
                <LabeledInput
                  v-model:value="cceConfig.authenticatingProxyCa"
                  class="cce-authenticating-textarea-multiline"
                  :disabled="!isNewOrUnprovisioned"
                  :mode="mode"
                  :rules="ruleSets.authenticatingProxyCa"
                  required
                  label-key="cceCn.authenticatingProxyCa.label"
                  type="multiline"
                  minHeight="90"
                />
                <FileSelector
                  :mode="mode"
                  :disabled="!isNewOrUnprovisioned"
                  :label="intl('cceCn.authenticatingProxyCa.label')"
                  class="role-tertiary mt-10"
                  @selected="e => cceConfig.authenticatingProxyCa = e"
                />
              </div>
              <div class="col span-6">
                <LabeledInput
                  v-model:value="cceConfig.authenticatingProxyCert"
                  class="cce-authenticating-textarea-multiline"
                  :disabled="!isNewOrUnprovisioned"
                  :mode="mode"
                  :rules="ruleSets.authenticatingProxyCert"
                  required
                  label-key="cceCn.authenticatingProxyCert.label"
                  type="multiline"
                  minHeight="90"
                />
                <FileSelector
                  :mode="mode"
                  :disabled="!isNewOrUnprovisioned"
                  :label="intl('cceCn.authenticatingProxyCert.label')"
                  class="role-tertiary mt-10"
                  @selected="e => cceConfig.authenticatingProxyCert = e"
                />
              </div>
            </div>
            <div class="row mt-10">
              <div class="col span-6">
                <LabeledInput
                  v-model:value="cceConfig.authenticatingProxyPrivateKey"
                  class="cce-authenticating-textarea-multiline"
                  :disabled="!isNewOrUnprovisioned"
                  :mode="mode"
                  :rules="ruleSets.authenticatingProxyPrivateKey"
                  required
                  label-key="cceCn.authenticatingProxyPrivateKey.label"
                  type="multiline"
                  minHeight="90"
                />
                <FileSelector
                  :mode="mode"
                  :disabled="!isNewOrUnprovisioned"
                  :label="intl('cceCn.authenticatingProxyPrivateKey.label')"
                  class="role-tertiary mt-10"
                  @selected="e => cceConfig.authenticatingProxyPrivateKey = e"
                />
              </div>
            </div>
          </div>
        </div>
        <div class="network-option-card mb-10">
          <div class="network-option-card__title">
            {{ intl('cceCn.tagsConfig.title') }}
          </div>
          <div class="network-option-card__desc">
            {{ intl('cceCn.tagsConfig.description') }}
          </div>
          <div class="mt-10">
            <KeyValue
              key="labels"
              :disabled="!isNewOrUnprovisioned"
              :value="cceConfig.tags"
              :protected-keys="[]"
              :add-label="t('labels.addTag')"
              :add-icon="addIcon"
              :mode="mode"
              :read-allowed="false"
              :value-can-be-empty="false"
              @update:value="updateCceConfigTags($event)"
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
              v-model:runtime="pool.runtime"
              v-model:availableZone="pool.availableZone"
              v-model:billingMode="pool.billingMode"
              v-model:rootVolumeType="pool.rootVolumeType"
              v-model:rootVolumeSize="pool.rootVolumeSize"
              v-model:dataVolumeType="pool.dataVolumeType"
              v-model:dataVolumeSize="pool.dataVolumeSize"
              v-model:flavor="pool.flavor"
              v-model:operatingSystem="pool.operatingSystem"
              v-model:initialNodeCount="pool.initialNodeCount"
              v-model:validityPeriod="pool.validityPeriod"
              v-model:sshKey="pool.sshKey"
              v-model:bmsIsAutoRenew="pool.bmsIsAutoRenew"
              :cceConfig="cceConfig"
              :volumeTypesLoading="state.volumeTypesLoading"
              :osAvailabilityZoneLoading="state.osAvailabilityZoneLoading"
              :osKeypairsLoading="state.osKeypairsLoading"
              :flavorLoading="state.flavorLoading"
              :availableZoneOptions="options.availableZoneOptions"
              :cluster-version="cceConfig.version"
              :validityPeriodOptions="options.validityPeriodOptions"
              :sshKeyOptions="options.sshKeyOptions"
              :volumeTypeChoicesByZones="options.volumeTypeChoicesByZones"
              :flavorOptionsByZones="options.flavorOptionsByZones"
              :isNewOrUnprovisioned="isNewOrUnprovisioned || pool.isNew"
              :mode="mode"
              :rules="{
                name: ruleSets.nodePoolName,
                availableZone: ruleSets.availableZone,
                rootVolumeType: ruleSets.rootVolumeType,
                dataVolumeType: ruleSets.dataVolumeType,
                rootVolumeSize: ruleSets.rootVolumeSize,
                dataVolumeSize: ruleSets.dataVolumeSize,
                flavor: ruleSets.flavor,
                operatingSystem: ruleSets.operatingSystem,
                sshKey: ruleSets.sshKey,
              }"
              @errors="e=>state.errors=e"
            />
          </Tab>
        </Tabbed>
      </div>
      <div>
        <Accordion
          class="mb-20"
          :title="intl('generic.labelsAndAnnotations')"
        >
          <Labels
            v-model:value="normanCluster"
          />
        </Accordion>
      </div>
      <Accordion
        class="mb-20"
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
      <FloatingHelpPanel
        :title="intl('cceCn.validationHelp.title')"
        :items="validationMessages"
        :close-label="intl('generic.close')"
      />
    </div>
    <template
      v-if="!hasCredential"
      #form-footer
    >
      <div><!-- Hide the outer footer --></div>
    </template>
  </CruResource>
</template>
<style lang="scss" scoped>
  .cce-authenticating-textarea-multiline {
    height: 120px !important;
    overflow: auto !important;
  }
  .cluster-basic-card,
  .network-option-card {
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
  }
  .cluster-basic-card {
    padding: 20px;
  }
  .cluster-basic-card__header {
    margin-bottom: 20px;
  }
  .cluster-basic-card__title,
  .network-option-card__title {
    margin: 0;
    color: var(--body-text);
    font-size: 16px;
    font-weight: 600;
    line-height: 1.5;
  }
  .cluster-basic-card__desc,
  .network-option-card__desc {
    margin-top: 4px;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.5;
  }
  .network-option-card {
    padding: 16px;
  }
</style>
