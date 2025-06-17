<script setup>
import {
  ref, onMounted, computed, watch, watchEffect
} from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import CruResource from '@shell/components/CruResource.vue';
import { useCreateEditView } from '../composables/useCreateEditView.js';
import { useFormValidation } from '../composables/useFormValidation.js';
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
import { queryHuawei } from '../util/request';
import CONFIG_ENV from '../util/config';
import { find, pullAt, uniqBy, cloneDeep } from 'lodash';
import { stringify } from '@shell/utils/error';
import { base64Decode } from '@shell/utils/crypto';
import Accordion from '@components/Accordion/Accordion.vue';
import Labels from '@shell/components/form/Labels.vue';
import ImportCce from './ImportCce';

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
  regionName:               '',
  managementScale:          'small',
  eipSelection:             'none',
  highAvailabilityEnabled:  's2',
  highAvailabilityDisabled: false,
  clusterLoading:           false,
  eniNetworks:              [],
  errors:                   [],
  isFirstRun:               true,
});
const emit = defineEmits(['done']);
const {
  save,
  doneRoute,
} = useCreateEditView(props, {
  emit, normanCluster, cceConfig, nodePools, state
});

const isImport = computed(() => {
  const router = useRouter();

  if (!router) {
    return false;
  }
  const query = router?.currentRoute?.value?.query;

  return query?.mode === _IMPORT;
});

const hasCredential = computed(() => {
  return !!cceConfig.value?.huaweiCredentialSecret;
});

const isNewOrUnprovisioned = computed(() => {
  return props.mode === _CREATE || !normanCluster.value?.cceStatus?.upstreamSpec;
});

const fvExtraRules = computed(() => {
  let out = {};

  if (hasCredential.value) {
    const commonRules = {
      nameRequired:     CCEValidators.nameRequired(normanCluster, intl),
      regionIdRequired: CCEValidators.regionIdRequired(cceConfig, intl),
    };
    const isImportMode = isImport.value || cceConfig.value.imported;
    const nonImportRules = !isImportMode ? {
      categoryRequired:             CCEValidators.categoryRequired(cceConfig, intl),
      versionRequired:              CCEValidators.versionRequired(cceConfig, intl),
      managementScaleRequired:      CCEValidators.managementScaleRequired(state, intl),
      containerNetworkModeRequired: CCEValidators.containerNetworkModeRequired(cceConfig, intl),
      vpcIdRequired:                CCEValidators.vpcIdRequired(cceConfig, intl),
      subnetIdRequired:             CCEValidators.subnetIdRequired(cceConfig, intl),
      kubernetesSvcIPRangeRequired: CCEValidators.kubernetesSvcIPRangeRequired(cceConfig, intl),
      validateKubernetesSvcIPRange: CCEValidators.validateKubernetesSvcIPRange(cceConfig, intl),
      securityGroupRequired:        CCEValidators.securityGroupRequired(cceConfig, intl),
      nodePoolNameRequired:         CCEValidators.nodePoolNameRequired(nodePools, intl),
      nodePoolNamesUnique:          CCEValidators.nodePoolNamesUnique(nodePools, intl),
      availableZoneRequired:        CCEValidators.availableZoneRequired(nodePools, intl),
      rootVolumeTypeRequired:       CCEValidators.rootVolumeTypeRequired(nodePools, intl),
      dataVolumeTypeRequired:       CCEValidators.dataVolumeTypeRequired(nodePools, intl),
      rootVolumeSizeRequired:       CCEValidators.rootVolumeSizeRequired(nodePools, intl),
      dataVolumeSizeRequired:       CCEValidators.dataVolumeSizeRequired(nodePools, intl),
      flavorRequired:               CCEValidators.flavorRequired(nodePools, intl),
      operatingSystemRequired:      CCEValidators.operatingSystemRequired(nodePools, intl),
      sshKeyRequired:               CCEValidators.sshKeyRequired(nodePools, intl),
    } : {};

    if (!isImportMode) {
      if (!isTurbo.value) {
        nonImportRules.containerNetworkCidrRequired = CCEValidators.containerNetworkCidrRequired(cceConfig, intl);
        nonImportRules.validateContainerNetworkCidr = CCEValidators.validateContainerNetworkCidr(cceConfig, intl);
      } else {
        nonImportRules.eniNetworksRequired = CCEValidators.eniNetworksRequired(state, intl);
      }
      if (state.value.eipSelection === 'exist') {
        nonImportRules.eipSelectionRequired = CCEValidators.eipSelectionRequired(cceConfig, intl);
      } else if (state.value.eipSelection === 'new') {
        nonImportRules.eipTypeRequired = CCEValidators.eipTypeRequired(cceConfig, intl);
        nonImportRules.eipChargeModeRequired = CCEValidators.eipChargeModeRequired(cceConfig, intl);
        nonImportRules.eipBandwidthSizeRequired = CCEValidators.eipBandwidthSizeRequired(cceConfig, intl);
      }
      if (cceConfig.value.authentiactionMode === 'authenticating_proxy' && isNewOrUnprovisioned.value) {
        nonImportRules.authenticatingProxyCaRequired = CCEValidators.authenticatingProxyCaRequired(cceConfig, intl);
        nonImportRules.authenticatingProxyCertRequired = CCEValidators.authenticatingProxyCertRequired(cceConfig, intl);
        nonImportRules.authenticatingProxyPrivateKeyRequired = CCEValidators.authenticatingProxyPrivateKeyRequired(cceConfig, intl);
      }
    }

    const importRules = isImportMode ? { clusterIDRequired: CCEValidators.clusterIDRequired(cceConfig, intl) } : {};

    out = {
      ...commonRules,
      ...nonImportRules,
      ...importRules,
    };
  }

  return out;
});

const isTurbo = computed(() => {
  return cceConfig.value.category === 'Turbo';
});

const clusterActive = computed(() => {
  if (!isNewOrUnprovisioned.value) {
    return normanCluster.value.state === 'active';
  }

  return true;
});

const kubernetesSupport = computed(() => {
  const version = cceConfig.value.version;
  const matched = find(CONFIG_ENV.KUBERNETESVERSIONS, { value: version }) || {};

  return {
    rancherEnabled: matched.rancherEnabled,
    cceEnabled:     matched.cceEnabled,
  };
});

const operatingSystemOptions = computed(() => {
  const types = ['EulerOS 2.9', 'CentOS 7.6'];
  const containerNetworkMode = cceConfig.value.containerNetworkMode;

  if (containerNetworkMode !== 'overlay_l2') {
    types.push('Huawei Cloud EulerOS 2.0', 'Ubuntu 22.04');
  }

  return types.map((item) => ({
    label: item,
    value: item
  }));
});

const CREATE = computed(() => {
  return _CREATE;
});

const VIEW = computed(() => {
  return _VIEW;
});

function registerWatch() {
  // watch
  // Because SelectCredential inside the component will trigger a change by default, this watch gets triggered when the component loads.
  watch(() => cceConfig.value.huaweiCredentialSecret, async(credential) => {
    state.value.errors = [];
    if (!credential) {
      return;
    }
    const promises = [];

    promises.push(fetchRegion(credential));
    if (!isImport.value) {
      promises.push(
        fetchVpc(credential),
        fetchListPublicIPs(credential),
        fetchListSubnets(credential),
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
  });

  watch(() => cceConfig.value.category, async() => {
    if (cceConfig.value.huaweiCredentialSecret) {
      await fetchVpc(cceConfig.value.huaweiCredentialSecret);
      await fetchListSubnets(cceConfig.value.huaweiCredentialSecret);
    }
    if (isNewOrUnprovisioned.value) {
      if (cceConfig.value.category === 'Turbo') {
        cceConfig.value.containerNetworkMode = 'eni';
        cceConfig.value.containerNetworkCidr = '';
        cceConfig.value.vpcId = '';
        cceConfig.value.subnetId = '';
      } else {
        cceConfig.value.containerNetworkMode = 'vpc-router';
        cceConfig.value.containerNetworkCidr = '10.0.0.0/16';
        cceConfig.value.vpcId = 'default';
        cceConfig.value.subnetId = 'default';
      }
    }
  });

  watchEffect(() => {
    if (isNewOrUnprovisioned.value) {
      const managementScale = state.value.managementScale;
      const highAvailabilityEnabled = state.value.highAvailabilityEnabled;

      // when edit first time not run this watch
      if (state.value.isFirstRun) {
        state.value.isFirstRun = false;

        return;
      }
      const matched = find(CONFIG_ENV.MANAGEMENT_SCALE_VIRTUAL, { value: managementScale });

      state.value.highAvailabilityDisabled = false;
      if (matched && parseInt(matched.label, 10) > 200) {
        state.value.highAvailabilityDisabled = true;
        state.value.highAvailabilityEnabled = 's2';
      }

      cceConfig.value.clusterFlavor = `cce.${ highAvailabilityEnabled }.${ managementScale }`;
    }
  });

  watch(() => cceConfig.value.vpcId, async() => {
    if (cceConfig.value.huaweiCredentialSecret && isNewOrUnprovisioned.value) {
      if (cceConfig.value.category === 'Turbo') {
        cceConfig.value.subnetId = '';
      } else {
        cceConfig.value.subnetId = 'default';
      }
      await fetchListSubnets(cceConfig.value.huaweiCredentialSecret);
    }
  });
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

const {
  fvFormRuleSets,
  fvUnreportedValidationErrors,
  fvFormIsValid,
  fvGetAndReportPathRules,
} = useFormValidation({ value: props.value }, store, fvExtraRules);

fvFormRuleSets.value = [
  {
    path:  'name',
    rules: ['nameRequired'],
  },
  {
    path:  'category',
    rules: ['categoryRequired'],
  },
  {
    path:  'version',
    rules: ['versionRequired'],
  },
  {
    path:  'managementScale',
    rules: ['managementScaleRequired'],
  },
  {
    path:  'containerNetworkMode',
    rules: ['containerNetworkModeRequired'],
  },
  {
    path:  'vpcId',
    rules: ['vpcIdRequired'],
  },
  {
    path:  'subnetId',
    rules: ['subnetIdRequired'],
  },
  {
    path:  'containerNetworkCidr',
    rules: ['containerNetworkCidrRequired', 'validateContainerNetworkCidr'],
  },
  {
    path:  'eniNetworks',
    rules: ['eniNetworksRequired'],
  },
  {
    path:  'kubernetesSvcIPRange',
    rules: ['kubernetesSvcIPRangeRequired', 'validateKubernetesSvcIPRange'],
  },
  {
    path:  'securityGroup',
    rules: ['securityGroupRequired'],
  },
  {
    path:  'eipSelection',
    rules: ['eipSelectionRequired'],
  },
  {
    path:  'eipType',
    rules: ['eipTypeRequired'],
  },
  {
    path:  'eipChargeMode',
    rules: ['eipChargeModeRequired'],
  },
  {
    path:  'eipBandwidthSize',
    rules: ['eipBandwidthSizeRequired'],
  },
  {
    path:  'authenticatingProxyCa',
    rules: ['authenticatingProxyCaRequired'],
  },
  {
    path:  'authenticatingProxyCert',
    rules: ['authenticatingProxyCertRequired'],
  },
  {
    path:  'authenticatingProxyPrivateKey',
    rules: ['authenticatingProxyPrivateKeyRequired'],
  },
  {
    path:  'nodePoolName',
    rules: ['nodePoolNameRequired', 'nodePoolNamesUnique']
  },
  {
    path:  'availableZone',
    rules: ['availableZoneRequired']
  },
  {
    path:  'rootVolumeType',
    rules: ['rootVolumeTypeRequired']
  },
  {
    path:  'dataVolumeType',
    rules: ['dataVolumeTypeRequired']
  },
  {
    path:  'rootVolumeSize',
    rules: ['rootVolumeSizeRequired']
  },
  {
    path:  'dataVolumeSize',
    rules: ['dataVolumeSizeRequired']
  },
  {
    path:  'flavor',
    rules: ['flavorRequired']
  },
  {
    path:  'operatingSystem',
    rules: ['operatingSystemRequired']
  },
  {
    path:  'sshKey',
    rules: ['sshKeyRequired']
  },
  {
    path:  'clusterID',
    rules: ['clusterIDRequired']
  },
];

// method
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
      return;
    }
    res.forEach((flavor) => {
      const specAz = flavor?.os_extra_specs['cond:operation:az'] || '';

      specAz.split(',').forEach((az) => {
        if (az.includes('(normal)')) {
          const zone = az.substr(0, az.length - 8);

          flavorOptionsByZones[zone] = flavorOptionsByZones[zone] || [];
          flavorOptionsByZones[zone].push({
            label: `${ flavor.name } ( vCPUs: ${ flavor.vcpus }, memory: ${ flavor.ram / 1024 } GB )`,
            value: flavor.name,
            group: flavor.name.split('.')[0]
          });
        }
      });
    });

    options.value.flavorOptionsByZones = flavorOptionsByZones;
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
    }
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
      return;
    }

    const securityGroupChoices = res.map((item) => {
      return {
        label: item.name,
        value: item.id
      };
    });

    options.value.securityGroupOptions = securityGroupChoices;
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
      return;
    }

    const sshKeyOptions = res.map((sshKey) => {
      return {
        label: sshKey?.keypair?.name,
        value: sshKey?.keypair?.name,
      };
    });

    options.value.sshKeyOptions = sshKeyOptions;
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

    if (normanCluster.value.cceConfig) {
      fixConfig(normanCluster);
    }
  } else {
    normanCluster.value = await store.dispatch('rancher/create', { type: NORMAN.CLUSTER }, { root: true });

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
    :errors="fvUnreportedValidationErrors"
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
            :rules="{
              name: fvGetAndReportPathRules('name'),
              clusterID: fvGetAndReportPathRules('clusterID'),
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
        <div class="row mb-10">
          <div class="col span-6">
            <LabeledInput
              :value="normanCluster.name"
              :mode="mode"
              label-key="generic.name"
              required
              :rules="fvGetAndReportPathRules('name')"
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
              v-model:value="cceConfig.category"
              data-testid="crucce-clusterType"
              :mode="mode"
              :options="CONFIG_ENV.CLUSTER_TYPES"
              option-label="label"
              option-key="value"
              label-key="cceCn.clusterType.label"
              :rules="fvGetAndReportPathRules('category')"
              required
              :disabled="!isNewOrUnprovisioned"
            />
          </div>
          <div class="col span-6">
            <LabeledSelect
              v-model:value="cceConfig.version"
              data-testid="crucce-version"
              :mode="mode"
              :options="CONFIG_ENV.KUBERNETESVERSIONS"
              option-label="label"
              option-key="value"
              label-key="cceCn.version.label"
              :rules="fvGetAndReportPathRules('version')"
              required
              :disabled="!isNewOrUnprovisioned"
            />
          </div>
        </div>
        <div
          v-if="!kubernetesSupport.rancherEnabled || !kubernetesSupport.cceEnabled"
        >
          <Banner
            v-if="!kubernetesSupport.rancherEnabled"
            color="warning"
            :label="intl('cceCn.version.warningRacher', { version: cceConfig.version })"
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
              v-model:value="state.managementScale"
              data-testid="crucce-management-scale"
              :mode="mode"
              :options="CONFIG_ENV.MANAGEMENT_SCALE_VIRTUAL"
              option-label="label"
              option-key="value"
              label-key="cceCn.managementScale.label"
              :rules="fvGetAndReportPathRules('managementScale')"
              required
              :disabled="!isNewOrUnprovisioned"
            />
          </div>
          <div class="col span-6">
            <LabeledSelect
              v-model:value="cceConfig.containerNetworkMode"
              data-testid="crucce-container-network-mode"
              :mode="mode"
              :options="CONFIG_ENV.CONTAINER_NETWORK_MODES"
              option-label="label"
              option-key="value"
              label-key="cceCn.containerNetworkMode.label"
              :rules="fvGetAndReportPathRules('containerNetworkMode')"
              required
              :localizedLabel="true"
              :disabled="!isNewOrUnprovisioned || isTurbo"
            />
          </div>
        </div>
        <div class="row mb-10">
          <div class="col span-6">
            <LabeledSelect
              v-model:value="cceConfig.vpcId"
              data-testid="crucce-vpc-id"
              :mode="mode"
              :options="options.vpcOptions"
              option-label="label"
              option-key="value"
              label-key="cceCn.vpcId.label"
              :rules="fvGetAndReportPathRules('vpcId')"
              required
              :disabled="!isNewOrUnprovisioned"
              :loading="state.vpcLoading"
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
              :rules="fvGetAndReportPathRules('subnetId')"
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
              :rules="fvGetAndReportPathRules('containerNetworkCidr')"
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
              :rules="fvGetAndReportPathRules('eniNetworks')"
            />
          </div>
          <div class="col span-6">
            <LabeledInput
              v-model:value="cceConfig.kubernetesSvcIPRange"
              data-testid="crucce-kubernetes-svc-ip-range"
              :mode="mode"
              :disabled="!isNewOrUnprovisioned"
              label-key="cceCn.kubernetesSvcIPRange.label"
              :rules="fvGetAndReportPathRules('kubernetesSvcIPRange')"
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
              :rules="fvGetAndReportPathRules('securityGroup')"
              required
              :loading="securityGroupsLoading"
            />
          </div>
        </div>
        <div class="row mb-10">
          <div class="col span-6">
            <h3 class="clearfix">
              {{ intl('cceCn.highAvailability.label') }}
            </h3>
            <RadioGroup
              v-model:value="state.highAvailabilityEnabled"
              :disabled="!isNewOrUnprovisioned || state.highAvailabilityDisabled"
              name="highAvailabilityEnabled"
              :options="['s2', 's1']"
              :labels="options.highAvailabilityOptions"
              :mode="mode"
            />
          </div>
        </div>
        <div class="row mb-10">
          <div class="col span-6">
            <h3 class="clearfix">
              {{ intl('cceCn.kubeProxyMode.label') }}
            </h3>
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
        <div class="row mb-10">
          <div class="col span-6">
            <h3 class="clearfix">
              {{ intl('cceCn.publicAccess.label') }}
            </h3>
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
              :rules="fvGetAndReportPathRules('eipSelection')"
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
                :rules="fvGetAndReportPathRules('eipType')"
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
                :rules="fvGetAndReportPathRules('eipChargeMode')"
                required
                label-key="cceCn.eipChargeMode.label"
                :disabled="!isNewOrUnprovisioned"
              />
              <UnitInput
                v-model:value="cceConfig.eipBandwidthSize"
                class="mt-10"
                :disabled="!isNewOrUnprovisioned"
                :label="intl('cceCn.eipBandwidthSize.label')"
                :rules="fvGetAndReportPathRules('eipBandwidthSize')"
                required
                min="0"
                :mode="mode"
                suffix="Mbit/s"
              />
            </div>
          </div>
        </div>
        <div class="mb-10">
          <div>
            <h3 class="clearfix">
              {{ intl('cceCn.authentiactionMode.label') }}
            </h3>
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
                  :rules="fvGetAndReportPathRules('authenticatingProxyCa')"
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
                  :rules="fvGetAndReportPathRules('authenticatingProxyCert')"
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
                  :rules="fvGetAndReportPathRules('authenticatingProxyPrivateKey')"
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
        <div class="mb-10">
          <KeyValue
            key="labels"
            :disabled="!isNewOrUnprovisioned"
            :value="cceConfig.tags"
            :protected-keys="[]"
            :add-label="t('tags.addTag')"
            :add-icon="addIcon"
            :mode="mode"
            :read-allowed="false"
            :value-can-be-empty="false"
            @update:value="updateCceConfigTags($event)"
          />
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
              :operatingSystemOptions="operatingSystemOptions"
              :validityPeriodOptions="options.validityPeriodOptions"
              :sshKeyOptions="options.sshKeyOptions"
              :volumeTypeChoicesByZones="options.volumeTypeChoicesByZones"
              :flavorOptionsByZones="options.flavorOptionsByZones"
              :isNewOrUnprovisioned="isNewOrUnprovisioned || pool.isNew"
              :rules="{
                name: fvGetAndReportPathRules('nodePoolName'),
                availableZone: fvGetAndReportPathRules('availableZone'),
                rootVolumeType: fvGetAndReportPathRules('rootVolumeType'),
                dataVolumeType: fvGetAndReportPathRules('dataVolumeType'),
                rootVolumeSize: fvGetAndReportPathRules('rootVolumeSize'),
                dataVolumeSize: fvGetAndReportPathRules('dataVolumeSize'),
                flavor: fvGetAndReportPathRules('flavor'),
                operatingSystem: fvGetAndReportPathRules('operatingSystem'),
                sshKey: fvGetAndReportPathRules('sshKey'),
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
</style>
