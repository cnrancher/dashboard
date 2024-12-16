import { mapGetters } from 'vuex';
import omitBy from 'lodash/omitBy';
import { cleanUp } from '@shell/utils/object';
import {
  CONFIG_MAP,
  SECRET,
  WORKLOAD_TYPES,
  NODE,
  SERVICE,
  PVC,
  SERVICE_ACCOUNT,
  CAPI,
  POD,
  MANAGEMENT,
  LIST_WORKLOAD_TYPES,
  HCI,
} from '@shell/config/types';
import Tab from '@shell/components/Tabbed/Tab';
import CreateEditView from '@shell/mixins/create-edit-view';
import ResourceManager from '@shell/mixins/resource-manager';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { LabeledInput } from '@components/Form/LabeledInput';
import ServiceNameSelect from '@shell/components/form/ServiceNameSelect';
import HealthCheck from '@shell/components/form/HealthCheck';
import Security from '@shell/components/form/Security';
import Upgrading from '@shell/edit/workload/Upgrading';
import Loading from '@shell/components/Loading';
import Networking from '@shell/components/form/Networking';
import VolumeClaimTemplate from '@shell/edit/workload/VolumeClaimTemplate';
import Job from '@shell/edit/workload/Job';
import { _EDIT, _CREATE, _VIEW, _CLONE } from '@shell/config/query-params';
import WorkloadPorts from '@shell/components/form/WorkloadPorts';
import ContainerResourceLimit from '@shell/components/ContainerResourceLimit';
import KeyValue from '@shell/components/form/KeyValue';
import Tabbed from '@shell/components/Tabbed';

import NodeScheduling from '@shell/components/form/NodeScheduling';
import PodAffinity from '@shell/components/form/PodAffinity';
import Tolerations from '@shell/components/form/Tolerations';
import CruResource from '@shell/components/CruResource';
import Command from '@shell/components/form/Command';
import LifecycleHooks from '@shell/components/form/LifecycleHooks';
import Storage from '@shell/edit/workload/storage';
import ContainerMountPaths from '@shell/edit/workload/storage/ContainerMountPaths.vue';
import Labels from '@shell/components/form/Labels';
import { RadioGroup } from '@components/Form/Radio';
import { UI_MANAGED } from '@shell/config/labels-annotations';
import { removeObject, uniq } from '@shell/utils/array';
import { BEFORE_SAVE_HOOKS } from '@shell/mixins/child-hook';
import NameNsDescription from '@shell/components/form/NameNsDescription';
import formRulesGenerator from '@shell/utils/validators/formRules';
import { TYPES as SECRET_TYPES } from '@shell/models/secret';
import LabeledInputSugget from '@shell/components/form/LabeledInputSugget';
import debounce from 'lodash/debounce';
import GpuResourceLimit from '@shell/components/GpuResourceLimit';
import { SETTING } from '@shell/config/settings';
import { defaultContainer } from '@shell/models/workload';
import { allHash } from '@shell/utils/promise';
import HamiResourceLimit from '@shell/components/HamiResourceLimit';

const TAB_WEIGHT_MAP = {
  general:              99,
  healthCheck:          98,
  labels:               97,
  networking:           96,
  nodeScheduling:       95,
  podScheduling:        94,
  resources:            93,
  upgrading:            92,
  securityContext:      91,
  storage:              90,
  volumeClaimTemplates: 89,
};

const GPU_KEY = 'nvidia.com/gpu';
const GPU_SHARED_KEY = 'rancher.io/gpu-mem';
const VGPU_KEY = 'virtaitech.com/gpu';
const DUAL_NETWORK_CARD = '[{"name":"static-macvlan-cni-attach","interface":"eth1"}]';
const MACVLAN_SERVICE = 'macvlan.panda.io/macvlanService';
const MACVLAN_ANNOTATION_MAP = {
  network:  'k8s.v1.cni.cncf.io/networks',
  network0: 'v1.multus-cni.io/default-network',
  ip:       'macvlan.pandaria.cattle.io/ip',
  mac:      'macvlan.pandaria.cattle.io/mac',
  subnet:   'macvlan.pandaria.cattle.io/subnet',
  // v2 flatnetwork
  ipV2:     'flatnetwork.pandaria.io/ip',
  macV2:    'flatnetwork.pandaria.io/mac',
  subnetV2: 'flatnetwork.pandaria.io/subnet'
};
const ID_KEY = Symbol('container-id');

const serialMaker = function() {
  let prefix = '';
  let seq = 0;

  return {
    setPrefix(p) {
      prefix = p;
    },
    setSeq(s) {
      seq = s;
    },
    genSym() {
      const result = prefix + seq;

      seq += 1;

      return result;
    }
  };
}();

export default {
  name:       'CruWorkload',
  components: {
    ContainerResourceLimit,
    Command,
    CruResource,
    HealthCheck,
    Job,
    KeyValue,
    LabeledInput,
    LabeledSelect,
    Labels,
    LifecycleHooks,
    Loading,
    NameNsDescription,
    Networking,
    NodeScheduling,
    PodAffinity,
    RadioGroup,
    Security,
    ServiceNameSelect,
    Storage,
    Tab,
    Tabbed,
    Tolerations,
    Upgrading,
    VolumeClaimTemplate,
    WorkloadPorts,
    ContainerMountPaths,
    LabeledInputSugget,
    GpuResourceLimit,
    HamiResourceLimit
  },

  mixins: [CreateEditView, ResourceManager],

  props: {
    value: {
      type:     Object,
      required: true,
    },

    mode: {
      type:    String,
      default: 'create',
    },

    createOption: {
      default: (text) => {
        if (text) {
          return { metadata: { name: text } };
        }
      },
      type: Function
    },
  },

  async fetch() {
    // TODO Should remove these lines
    // ? The results aren't stored, so don't know why we fetch?

    // User might not have access to these resources - so check before trying to fetch
    const fetches = {};

    if (this.$store.getters[`management/canList`](CAPI.RANCHER_CLUSTER)) {
      fetches.rancherClusters = this.$store.dispatch('management/findAll', { type: CAPI.RANCHER_CLUSTER });
    }

    if (this.$store.getters[`management/canList`](HCI.HARVESTER_CONFIG)) {
      fetches.harvesterConfigs = this.$store.dispatch('management/findAll', { type: HCI.HARVESTER_CONFIG });
    }

    await allHash(fetches);

    this.$store.dispatch('harbor/fetchHarborVersion');
    this.$store.dispatch('harbor/loadHarborServerUrl');
    try {
      const inStore = this.$store.getters['currentProduct'].inStore;

      const hamiResourceTypes = await this.$store.dispatch(
        `${ inStore }/request`,
        { url: `/k8s/clusters/${ this.currentCluster.id }/v1/hami.pandaria.com.resourcetypes/rancher-hami-resourcetypes` }
      );

      this.hamiResourceLimtsOptions = hamiResourceTypes?.spec?.resourceTypes?.map((item) => ({ label: item, value: item })) ?? [];
    } catch (error) {
      console.error('Error: Load HAMi ResourceTypes Failed', error); // eslint-disable-line no-console
    }

    // don't block UI for these resources
    this.resourceManagerFetchSecondaryResources(this.secondaryResourceData);
    this.servicesOwned = await this.value.getServicesOwned();
    this.systemGpuManagementSchedulerName = this.$store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.SYSTEM_GPU_MANAGEMENT_SCHEDULER_NAME)?.value ?? '';
  },

  data() {
    serialMaker.setPrefix('container-');
    serialMaker.setSeq(0);
    let type = this.$route.params.resource;
    const createSidecar = !!this.$route.query.sidecar;

    if (type === 'workload') {
      type = null;
    }

    if (!this.value.spec) {
      this.value.spec = {};
      if (this.value.type === POD) {
        const podContainers = [{
          imagePullPolicy: 'IfNotPresent',
          name:            `container-0`,
        }];

        const metadata = { ...this.value.metadata };

        const podSpec = { template: { spec: { containers: podContainers, initContainers: [] }, metadata } };

        this.$set(this.value, 'spec', podSpec);
      }
    }

    // EDIT view for POD
    // Transform it from POD world to workload
    if ((this.mode === _EDIT || this.mode === _VIEW || this.realMode === _CLONE ) && this.value.type === 'pod') {
      const podSpec = { ...this.value.spec };
      const metadata = { ...this.value.metadata };

      this.$set(this.value.spec, 'template', { spec: podSpec, metadata });
    }

    const spec = this.value.spec;
    let podTemplateSpec = type === WORKLOAD_TYPES.CRON_JOB ? spec.jobTemplate.spec.template.spec : spec?.template?.spec;

    let containers = podTemplateSpec.containers || [];
    let container;

    if (this.mode === _VIEW && this.value.type === 'pod' ) {
      podTemplateSpec = spec;
    }

    if (
      this.mode === _CREATE ||
      this.mode === _VIEW ||
      this.realMode === _CLONE ||
      (!createSidecar && !this.value.hasSidecars) // hasSideCars = containers.length > 1 || initContainers.length;
    ) {
      container = containers[0];
    } else {
      // This means that there are no containers.
      if (!podTemplateSpec.initContainers) {
        podTemplateSpec.initContainers = [];
      }
      const allContainers = [
        ...podTemplateSpec.initContainers,
        ...podTemplateSpec.containers,
      ];

      if (this.$route.query.init) {
        podTemplateSpec.initContainers.push({
          imagePullPolicy: 'IfNotPresent',
          name:            `container-${ allContainers.length }`,
          _init:           true,
        });

        containers = podTemplateSpec.initContainers;
      }
      if (createSidecar || this.value.type === 'pod') {
        container = {
          imagePullPolicy: 'IfNotPresent',
          name:            `container-${ allContainers.length }`,
          _init:           false,
        };

        containers.push(container);
      } else {
        container = containers[0];
      }
    }

    this.selectContainer(container);
    if (this.realMode === _CLONE && this.value.type === WORKLOAD_TYPES.JOB) {
      this.cleanUpClonedJobData();
    }

    return {
      secondaryResourceData:      this.secondaryResourceDataConfig(),
      namespacedConfigMaps:       [],
      allNodes:                   null,
      allNodeObjects:             [],
      namespacedSecrets:          [],
      imagePullNamespacedSecrets: [],
      allServices:                [],
      headlessServices:           [],
      name:                       this.value?.metadata?.name || null,
      pvcs:                       [],
      namespacedServiceNames:     [],
      showTabs:                   false,
      pullPolicyOptions:          ['Always', 'IfNotPresent', 'Never'],
      spec,
      type,
      servicesOwned:              [],
      servicesToRemove:           [],
      portsForServices:           [],
      container,
      containerChange:            0,
      tabChange:                  0,
      podFsGroup:                 podTemplateSpec.securityContext?.fsGroup,
      savePvcHookName:            'savePvcHook',
      tabWeightMap:               TAB_WEIGHT_MAP,
      fvFormRuleSets:             [{
        path: 'image', rootObject: this.container, rules: ['required'], translationKey: 'workload.container.image'
      }],
      fvReportedValidationPaths: ['spec'],
      isNamespaceNew:            false,
      allPods:                   [],
      idKey:                     ID_KEY,

      systemGpuManagementSchedulerName: '',
      hamiResourceLimtsOptions:         []
    };
  },

  computed: {
    ...mapGetters(['currentCluster']),
    tabErrors() {
      return { general: this.fvGetPathErrors(['image'])?.length > 0 };
    },

    defaultTab() {
      if (!!this.$route.query.sidecar || this.$route.query.init || this.mode === _CREATE) {
        const container = this.allContainers.find((c) => c.__active);

        return container?.name ?? 'container-0';
      }

      return this.allContainers.length ? this.allContainers[0][this.idKey] : '';
    },

    isEdit() {
      return this.mode === _EDIT;
    },

    isJob() {
      return this.type === WORKLOAD_TYPES.JOB || this.isCronJob;
    },

    isCronJob() {
      return this.type === WORKLOAD_TYPES.CRON_JOB;
    },

    isReplicable() {
      return (
        this.type === WORKLOAD_TYPES.DEPLOYMENT ||
        this.type === WORKLOAD_TYPES.REPLICA_SET ||
        this.type === WORKLOAD_TYPES.REPLICATION_CONTROLLER ||
        this.type === WORKLOAD_TYPES.STATEFUL_SET
      );
    },

    isDeployment() {
      return this.type === WORKLOAD_TYPES.DEPLOYMENT;
    },

    isPod() {
      return this.value.type === POD;
    },

    isStatefulSet() {
      return this.type === WORKLOAD_TYPES.STATEFUL_SET;
    },

    enabledVlansubnet() {
      return this.podTemplateSpec?.vlansubnet?.allowVlansubnet;
    },

    // if this is a cronjob, grab pod spec from within job template spec
    podTemplateSpec: {
      get() {
        return this.isCronJob ? this.spec.jobTemplate.spec.template.spec : this.spec?.template?.spec;
      },
      set(neu) {
        this.updateStaticPod(neu);
        if (this.isCronJob) {
          this.$set(this.spec.jobTemplate.spec.template, 'spec', neu);
        } else {
          this.$set(this.spec.template, 'spec', neu);
        }
      },
    },

    podLabels: {
      get() {
        if (this.isCronJob) {
          if (!this.spec.jobTemplate.metadata) {
            this.$set(this.spec.jobTemplate, 'metadata', { labels: {} });
          }

          return this.spec.jobTemplate.metadata.labels;
        }

        if (!this.spec.template.metadata) {
          this.$set(this.spec.template, 'metadata', { labels: {} });
        }

        return this.spec.template.metadata.labels;
      },
      set(neu) {
        if (this.isCronJob) {
          this.$set(this.spec.jobTemplate.metadata, 'labels', neu);
        } else {
          this.$set(this.spec.template.metadata, 'labels', neu);
        }
      },
    },

    podAnnotations: {
      get() {
        if (this.isCronJob) {
          if (!this.spec.jobTemplate.metadata) {
            this.$set(this.spec.jobTemplate, 'metadata', { annotations: {} });
          }

          return this.spec.jobTemplate.metadata.annotations;
        }
        if (!this.spec.template.metadata) {
          this.$set(this.spec.template, 'metadata', { annotations: {} });
        }

        return this.spec.template.metadata.annotations;
      },
      set(neu) {
        if (this.isCronJob) {
          this.$set(this.spec.jobTemplate.metadata, 'annotations', neu);
        } else {
          this.$set(this.spec.template.metadata, 'annotations', neu);
        }
      },
    },

    allContainers() {
      const containers = this.podTemplateSpec?.containers || [];
      const initContainers = this.podTemplateSpec?.initContainers || [];
      const key = this.idKey;

      return [
        ...containers.map((each) => {
          each._init = false;
          if (!each[key]) {
            each[key] = serialMaker.genSym();
          }

          return each;
        }),
        ...initContainers.map((each) => {
          each._init = true;
          if (!each[key]) {
            each[key] = serialMaker.genSym();
          }

          return each;
        }),
      ].map((container) => {
        const containerImageRule = formRulesGenerator(this.$store.getters['i18n/t'], { name: container.name }).containerImage;

        container.error = containerImageRule(container);

        return container;
      });
    },

    flatResources: {
      get() {
        const { limits = {}, requests = {} } = this.container.resources || {};
        const {
          cpu: limitsCpu,
          memory: limitsMemory,
          [GPU_KEY]: limitsGpu,
        } = limits;
        const { cpu: requestsCpu, memory: requestsMemory } = requests;

        return {
          limitsCpu,
          limitsMemory,
          requestsCpu,
          requestsMemory,
          limitsGpu,
        };
      },
      set(neu) {
        const {
          limitsCpu,
          limitsMemory,
          requestsCpu,
          requestsMemory,
          // limitsGpu,
        } = neu;

        const out = {
          requests: {
            cpu:    requestsCpu,
            memory: requestsMemory,
          },
          limits: {
            cpu:    limitsCpu,
            memory: limitsMemory,
            // [GPU_KEY]: limitsGpu,
          },
        };

        this.$set(this.container, 'resources', cleanUp(out));
      },
    },

    flatGpuResources: {
      get() {
        const { limits = {}, requests = {} } = this.container.resources || {};
        const limitGpuDevices = Object.entries(limits).filter(([k]) => k.startsWith('nvidia.com/') && k !== GPU_KEY);
        const requestGpuDevices = Object.entries(requests).filter(([k]) => k.startsWith('nvidia.com/') && k !== GPU_KEY);
        const limitGpuDevice = {
          name:  '',
          value: '',
        };
        const requestGpuDevice = {
          name:  '',
          value: ''
        };

        if (limitGpuDevices.length > 0) {
          limitGpuDevice.name = limitGpuDevices[0][0];
          limitGpuDevice.value = limitGpuDevices[0][1];
        }
        if (requestGpuDevices.length > 0) {
          requestGpuDevice.name = requestGpuDevices[0][0];
          requestGpuDevice.value = requestGpuDevices[0][1];
        }

        return {
          limitsGpuShared:   limits[GPU_SHARED_KEY],
          limitsGpu:         limits[GPU_KEY],
          limitsVgpu:        limits[VGPU_KEY],
          requestsGpuShared: requests[GPU_SHARED_KEY],
          requestsGpu:       requests[GPU_KEY],
          limitGpuDevice,
          requestGpuDevice,
        };
      },
      set(neu) {
        const {
          limitsGpuShared, limitsGpu, limitsVgpu, requestsGpuShared, requestsGpu, limitGpuDevice = {}, requestGpuDevice = {}
        } = neu;
        const schedulerName = this.podTemplateSpec.schedulerName;
        const { limits = {}, requests = {} } = this.container.resources || {};

        const out = {
          requests: {
            ...requests,
            [GPU_SHARED_KEY]: requestsGpuShared,
            [GPU_KEY]:        requestsGpu,

            [limitGpuDevice.name]: limitGpuDevice.value
          },
          limits: {
            ...limits,
            [GPU_SHARED_KEY]: limitsGpuShared,
            [GPU_KEY]:        limitsGpu,
            [VGPU_KEY]:       limitsVgpu,

            [requestGpuDevice.name]: requestGpuDevice.value
          }
        };

        this.$set(this.container, 'resources', cleanUp(out));

        if (requestsGpuShared && limitsGpuShared && (!schedulerName || schedulerName === 'default-scheduler')) {
          this.podTemplateSpec.schedulerName = this.systemGpuManagementSchedulerName;
        } else if ((!requestsGpuShared || !limitsGpuShared) && this.systemGpuManagementSchedulerName && schedulerName === this.systemGpuManagementSchedulerName) {
          this.podTemplateSpec.schedulerName = '';
        }
      }
    },

    flatHamiResources: {
      get() {
        const { limits = {} } = this.container.resources || {};
        const keys = this.hamiResourceLimtsOptions.map((item) => item.value);

        return Object.entries(limits).filter(([k]) => keys.includes(k)).reduce((t, [k, v]) => {
          t[k] = v;

          return t;
        }, {});
      },
      set(v) {
        const { limits = {}, requests = {} } = this.container.resources || {};
        const resetLimits = this.hamiResourceLimtsOptions.map((item) => item.value).reduce((t, c) => {
          t[c] = null;

          return t;
        }, {});
        const out = {
          requests: { ...requests },
          limits:   {
            ...limits,
            ...resetLimits,
            ...v
          }
        };

        this.$set(this.container, 'resources', cleanUp(out));
      }
    },

    healthCheck: {
      get() {
        const { readinessProbe, livenessProbe, startupProbe } = this.container;

        return {
          readinessProbe,
          livenessProbe,
          startupProbe,
        };
      },
      set(neu) {
        Object.assign(this.container, neu);
      },
    },

    imagePullSecrets: {
      get() {
        if (!this.podTemplateSpec.imagePullSecrets) {
          this.$set(this.podTemplateSpec, 'imagePullSecrets', []);
        }

        const { imagePullSecrets } = this.podTemplateSpec;

        return imagePullSecrets.map((each) => each.name);
      },
      set(neu) {
        this.podTemplateSpec.imagePullSecrets = neu.map((secret) => {
          return { name: secret };
        });
      },
    },

    schema() {
      return this.$store.getters['cluster/schemaFor'](this.type);
    },

    // array of id, label, description, initials for type selection step
    workloadSubTypes() {
      const workloadTypes = omitBy(LIST_WORKLOAD_TYPES, (type) => {
        return (
          type === WORKLOAD_TYPES.REPLICA_SET ||
          type === WORKLOAD_TYPES.REPLICATION_CONTROLLER
        );
      });

      const out = [];

      for (const prop in workloadTypes) {
        const type = workloadTypes[prop];
        const subtype = {
          id:          type,
          description: `workload.typeDescriptions.'${ type }'`, // i18n-uses workload.typeDescriptions.*
          label:       this.nameDisplayFor(type),
          bannerAbbrv: this.initialDisplayFor(type),
        };

        out.push(subtype);
      }

      return out;
    },

    containerOptions() {
      const out = [...this.allContainers];

      if (!this.isView) {
        out.push({ name: 'Add Container', __add: true });
      }

      return out;
    },

    harborImagsChoices() {
      const images = this.harbor?.harborImages?.urls || [];
      let inUse = [];
      let suggestions = [];

      this.allPods.forEach((pod) => {
        inUse = inUse.concat(pod.spec?.containers || []);
      });
      inUse = inUse.map((obj) => (obj.image || ''))
        .filter((str) => !str.includes('sha256:') && !str.startsWith('rancher/'))
        .sort();
      inUse = uniq(inUse);
      if (inUse.length > 0) {
        suggestions = suggestions.concat(
          [
            { kind: 'group', label: 'Used by other containers' },
            ...inUse,
          ]
        );
      }
      if (images.length > 0) {
        suggestions = suggestions.concat(
          [
            { kind: 'group', label: 'Images in harbor image repositories' },
            ...images,
          ]
        );
      }

      return suggestions;
    },
    suggestions() {
      return [
        ...this.harborImagsChoices
      ];
    },
    harborImageTagsChoices() {
      return (this.harbor?.harborImageTags || []).map((h) => h.name);
    },

    ...mapGetters({ t: 'i18n/t', harbor: 'harbor/all' }),
  },

  watch: {
    async 'value.metadata.namespace'(neu) {
      if (this.isNamespaceNew) {
        // we don't need to re-fetch namespace specific (or non-namespace specific) resources when the namespace hasn't been created yet
        return;
      }
      this.secondaryResourceData.namespace = neu;
      // Fetch resources that are namespace specific, we don't need to re-fetch non-namespaced resources on namespace change
      this.resourceManagerFetchSecondaryResources(this.secondaryResourceData, true);

      this.servicesOwned = await this.value.getServicesOwned();
    },

    isNamespaceNew(neu, old) {
      if (!old && neu) {
        // As the namespace is new any resource that's been fetched with a namespace is now invalid
        this.resourceManagerClearSecondaryResources(this.secondaryResourceData, true);
      }
    },

    type(neu, old) {
      const template =
        old === WORKLOAD_TYPES.CRON_JOB ? this.spec?.jobTemplate?.spec?.template : this.spec?.template;

      if (!template.spec) {
        template.spec = {};
      }

      let restartPolicy;

      if (this.isJob || this.isCronJob) {
        restartPolicy = 'Never';
      } else {
        restartPolicy = 'Always';
      }

      this.$set(template.spec, 'restartPolicy', restartPolicy);

      if (!this.isReplicable) {
        delete this.spec.replicas;
      }

      if (old === WORKLOAD_TYPES.CRON_JOB) {
        this.$set(this.spec, 'template', { ...template });
        delete this.spec.jobTemplate;
        delete this.spec.schedule;
      } else if (neu === WORKLOAD_TYPES.CRON_JOB) {
        this.$set(this.spec, 'jobTemplate', { spec: { template } });
        this.$set(this.spec, 'schedule', '0 * * * *');
        delete this.spec.template;
      }

      this.$set(this.value, 'type', neu);
      delete this.value.apiVersion;
    },

    'container.imageTag'(neu) {
      const tag = this.container.imageTag;

      if (tag) {
        const image = this.container.image;
        const harborRepo = this.harbor?.harborRepo || '';
        let repo = image;

        if (repo.startsWith(`${ harborRepo }/`)) {
          repo = repo.replace(`${ harborRepo }/`, '');
        }
        const index = repo.indexOf(':');

        this.$set(this.container, 'image', index > -1 ? `${ image.substr(0, image.lastIndexOf(':')) }:${ tag }` : `${ image }:${ tag }`);
      }
    },

    harborImageTagsChoices() {
      if (this.harbor.imageTag) {
        this.container.imageTag = this.harbor.imageTag;
      }
    }
  },

  created() {
    this.registerBeforeHook(this.saveWorkload, 'willSaveWorkload');
    this.registerBeforeHook(this.getPorts, 'getPorts');

    this.registerAfterHook(this.saveService, 'saveService');
    this.initStaticPod(this.podTemplateSpec, this.podAnnotations);
  },

  methods: {
    secondaryResourceDataConfig() {
      return {
        namespace: this.value?.metadata?.namespace || null,
        data:      {
          [CONFIG_MAP]:      { applyTo: [{ var: 'namespacedConfigMaps' }] },
          [PVC]:             { applyTo: [{ var: 'pvcs' }] },
          [SERVICE_ACCOUNT]: { applyTo: [{ var: 'namespacedServiceNames' }] },
          [SECRET]:          {
            applyTo: [
              { var: 'namespacedSecrets' },
              {
                var:         'imagePullNamespacedSecrets',
                parsingFunc: (data) => {
                  return data.filter((secret) => (secret._type === SECRET_TYPES.DOCKER || secret._type === SECRET_TYPES.DOCKER_JSON));
                }
              }
            ]
          },
          [NODE]: {
            applyTo: [
              { var: 'allNodeObjects' },
              {
                var:         'allNodes',
                parsingFunc: (data) => {
                  return data.map((node) => node.id);
                }
              }
            ]
          },
          [SERVICE]: {
            applyTo: [
              { var: 'allServices' },
              {
                var:         'headlessServices',
                parsingFunc: (data) => {
                  return data.filter((service) => service.spec.clusterIP === 'None');
                }
              }
            ]
          },
          [POD]: { applyTo: [{ var: 'allPods' }] },
        }
      };
    },
    addContainerBtn() {
      this.selectContainer({ name: 'Add Container', __add: true });
    },
    nameDisplayFor(type) {
      const schema = this.$store.getters['cluster/schemaFor'](type);

      return this.$store.getters['type-map/labelFor'](schema) || '';
    },

    // TODO better images for workload types?
    // show initials of workload type in blue circles for now
    initialDisplayFor(type) {
      const typeDisplay = this.nameDisplayFor(type);

      return typeDisplay
        .split('')
        .filter((letter) => letter.match(/[A-Z]/))
        .join('');
    },

    cancel() {
      this.done();
    },

    async getPorts() {
      const ports = (await this.value.getPortsWithServiceType()) || [];

      this.portsForServices = ports;
    },

    async saveService() {
      // If we can't access services then just return - the UI should only allow ports without service creation
      if (!this.$store.getters['cluster/schemaFor'](SERVICE)) {
        return;
      }

      const { toSave = [], toRemove = [] } =
        (await this.value.servicesFromContainerPorts(
          this.mode,
          this.portsForServices
        )) || {};

      this.servicesOwned = toSave;
      this.servicesToRemove = toRemove;

      if (!toSave.length && !toRemove.length) {
        return;
      }

      return Promise.all([
        ...toSave.map((svc) => svc.save()),
        ...toRemove.map((svc) => {
          const ui = svc?.metadata?.annotations?.[UI_MANAGED];

          if (ui) {
            svc.remove();
          }
        }),
      ]);
    },

    saveWorkload() {
      if (
        this.type !== WORKLOAD_TYPES.JOB &&
        this.type !== WORKLOAD_TYPES.CRON_JOB &&
        (this.mode === _CREATE || this.realMode === _CLONE)
      ) {
        this.spec.selector = { matchLabels: this.value.workloadSelector };
        Object.assign(this.value.metadata.labels, this.value.workloadSelector);
      }

      let template;

      if (this.type === WORKLOAD_TYPES.CRON_JOB) {
        template = this.spec.jobTemplate;
      } else {
        template = this.spec.template;
      }

      // WORKLOADS
      if (
        this.type !== WORKLOAD_TYPES.JOB &&
        this.type !== WORKLOAD_TYPES.CRON_JOB &&
        (this.mode === _CREATE || this.realMode === _CLONE)
      ) {
        if (!template.metadata) {
          template.metadata = { labels: this.value.workloadSelector };
        } else {
          if (!template.metadata?.labels ) {
            template.metadata.labels = {};
          }
          Object.assign(template.metadata.labels, this.value.workloadSelector);
        }
      }

      if (template.spec.containers && template.spec.containers[0]) {
        const containerResources = template.spec.containers[0].resources;
        const nvidiaGpuLimit =
          template.spec.containers[0].resources?.limits?.[GPU_KEY];

        // Though not required, requests are also set to mirror the ember ui
        if (nvidiaGpuLimit > 0) {
          containerResources.requests = containerResources.requests || {};
          containerResources.requests[GPU_KEY] = nvidiaGpuLimit;
        }

        if (!this.nvidiaIsValid(nvidiaGpuLimit)) {
          try {
            delete containerResources.requests[GPU_KEY];
            delete containerResources.limits[GPU_KEY];

            if (Object.keys(containerResources.limits).length === 0) {
              delete containerResources.limits;
            }
            if (Object.keys(containerResources.requests).length === 0) {
              delete containerResources.requests;
            }
            if (Object.keys(containerResources).length === 0) {
              delete template.spec.containers[0].resources;
            }
          } catch {}
        }
      }

      const nodeAffinity = template?.spec?.affinity?.nodeAffinity || {};
      const podAffinity = template?.spec?.affinity?.podAffinity || {};
      const podAntiAffinity = template?.spec?.affinity?.podAntiAffinity || {};

      this.fixNodeAffinity(nodeAffinity);
      this.fixPodAffinity(podAffinity);

      // The fields are being removed because they are not allowed to be editabble
      if (this.mode === _EDIT) {
        if (template?.spec?.affinity && Object.keys(template?.spec?.affinity).length === 0) {
          delete template.spec.affinity;
        }

        // Removing `affinity` fixes the issue with setting the `imagePullSecrets`
        // However, this field should not be set. Therefore this is explicitly removed.
        if (template?.spec?.imagePullSecrets && template?.spec?.imagePullSecrets.length === 0) {
          delete template.spec.imagePullSecrets;
        }
      }

      this.fixPodAffinity(podAntiAffinity);
      this.fixPodSecurityContext(this.podTemplateSpec);

      template.metadata.namespace = this.value.metadata.namespace;

      // Handle the case where the user has changed the name of the workload
      // Only do this for clone. Not allowed for edit
      if (this.realMode === _CLONE) {
        template.metadata.name = this.value.metadata.name;
        template.metadata.description = this.value.metadata.description;
      }

      // delete this.value.kind;
      if (this.container && !this.container.name) {
        this.$set(this.container, 'name', this.value.metadata.name);
      }

      const ports = this.value.containers.reduce((total, each) => {
        const containerPorts = each.ports || [];

        total.push(
          ...containerPorts.filter(
            (port) => port._serviceType && port._serviceType !== ''
          )
        );

        return total;
      }, []);

      // ports contain info used to create services after saving
      this.portsForServices = ports;
      Object.assign(this.value, { spec: this.spec });
    },

    // node and pod affinity are formatted incorrectly from API; fix before saving
    fixNodeAffinity(nodeAffinity) {
      const preferredDuringSchedulingIgnoredDuringExecution =
        nodeAffinity.preferredDuringSchedulingIgnoredDuringExecution || [];
      const requiredDuringSchedulingIgnoredDuringExecution =
        nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution || {};

      preferredDuringSchedulingIgnoredDuringExecution.forEach((term) => {
        const matchExpressions = term?.preference?.matchExpressions || [];

        matchExpressions.forEach((expression) => {
          if (expression.values) {
            expression.values =
              typeof expression.values === 'string' ? [expression.values] : [...expression.values];
          }
        });
      });

      (
        requiredDuringSchedulingIgnoredDuringExecution.nodeSelectorTerms || []
      ).forEach((term) => {
        const matchExpressions = term.matchExpressions || [];

        matchExpressions.forEach((expression) => {
          if (expression.values) {
            expression.values =
              typeof expression.values === 'string' ? [expression.values] : [...expression.values];
          }
        });
      });
    },

    fixPodAffinity(podAffinity) {
      const preferredDuringSchedulingIgnoredDuringExecution =
        podAffinity.preferredDuringSchedulingIgnoredDuringExecution || [];
      const requiredDuringSchedulingIgnoredDuringExecution =
        podAffinity.requiredDuringSchedulingIgnoredDuringExecution || [];

      preferredDuringSchedulingIgnoredDuringExecution.forEach((term) => {
        const matchExpressions =
          term?.podAffinityTerm?.labelSelector?.matchExpressions || [];

        matchExpressions.forEach((expression) => {
          if (expression.values) {
            expression.values =
              typeof expression.values === 'string' ? [expression.values] : [...expression.values];
          }
        });
      });

      requiredDuringSchedulingIgnoredDuringExecution.forEach((term) => {
        const matchExpressions = term?.labelSelector?.matchExpressions || [];

        matchExpressions.forEach((expression) => {
          if (expression.values) {
            expression.values =
              typeof expression.values === 'string' ? [expression.values] : [...expression.values];
          }
        });
      });

      return podAffinity;
    },

    fixPodSecurityContext(podTempSpec) {
      if (this.podFsGroup) {
        podTempSpec.securityContext = podTempSpec.securityContext || {};
        podTempSpec.securityContext.fsGroup = this.podFsGroup;
      } else {
        if (podTempSpec.securityContext?.fsGroup) {
          delete podTempSpec.securityContext.fsGroup;
        }
        if (Object.keys(podTempSpec.securityContext || {}).length === 0) {
          delete podTempSpec.securityContext;
        }
      }
    },

    selectType(type) {
      if (!this.type && type) {
        this.$router.replace({ params: { resource: type } });
      } else {
        this.type = type;
      }
    },

    selectContainer(container) {
      if (container.__add) {
        this.addContainer();

        return;
      }
      (this.allContainers || []).forEach((container) => {
        if (container.__active) {
          delete container.__active;
        }
      });
      container.__active = true;
      this.container = container;
      this.containerChange++;
    },

    addContainer() {
      let nameNumber = this.allContainers.length;
      const allNames = this.allContainers.reduce((names, each) => {
        names.push(each.name);

        return names;
      }, []);

      while (allNames.includes(`container-${ nameNumber }`)) {
        nameNumber++;
      }
      const container = {
        ...defaultContainer,
        imagePullPolicy: 'IfNotPresent',
        name:            `container-${ nameNumber }`,
        active:          true
      };

      this.podTemplateSpec.containers.push(container);
      this.selectContainer(container);
      this.$nextTick(() => {
        this.$refs.containersTabbed?.select(container.name);
      });
    },

    removeContainer(container) {
      if (container._init) {
        removeObject(this.podTemplateSpec.initContainers, container);
      } else {
        removeObject(this.podTemplateSpec.containers, container);
      }
      this.selectContainer(this.allContainers[0]);
    },

    updateInitContainer(neu, container) {
      if (!container) {
        return;
      }
      const containers = this.podTemplateSpec.containers;
      const initContainers = this.podTemplateSpec.initContainers ?? [];

      if (neu) {
        this.podTemplateSpec.initContainers = initContainers;
        container._init = true;
        if (!initContainers.includes(container)) {
          initContainers.push(container);
        }
        removeObject(containers, container);
      } else {
        container._init = false;
        removeObject(initContainers, container);
        if (!containers.includes(container)) {
          containers.push(container);
        }
      }
    },

    updateStaticPod(neu) {
      const annotationsForm = neu.vlansubnet || {};
      const annotations = this.podAnnotations || {};
      const props = Object.values(MACVLAN_ANNOTATION_MAP);
      const propMap = Object.assign({}, MACVLAN_ANNOTATION_MAP);

      if (!annotationsForm?.allowVlansubnet) {
        const form = {};

        Object.keys(annotations).forEach((a) => {
          if (props.includes(a) < 0) {
            form[a] = annotations[a];
          }
        });
        if (annotationsForm.isFlatNetworkV2 && !this.enforcesUseV1) {
          delete form[MACVLAN_SERVICE];
        } else {
          form[MACVLAN_SERVICE] = 'disable';
        }

        this.podAnnotations = Object.assign({}, form);

        return;
      }

      const { network, subnet } = annotationsForm;

      if (annotationsForm?.allowVlansubnet && network && subnet) {
        const form = {};

        if (annotationsForm.isFlatNetworkV2 && !this.enforcesUseV1) {
          Object.keys(annotationsForm).forEach((a) => {
            if (a === 'allowVlansubnet' || a === 'enforcesUseV1' || a === 'isFlatNetworkV2') {
              return;
            }

            if (a === 'ip' || a === 'mac') {
              const key = a === 'ip' ? 'ipV2' : 'macV2';

              if (!annotationsForm[a]) {
                form[propMap[key]] = 'auto';
              } else {
                const v = annotationsForm[a].split(/,|，/);

                form[propMap[key]] = v.join('-');
              }
            } else {
              let key = a;

              if (a === 'subnet') {
                key = 'subnetV2';
              }
              form[propMap[key]] = annotationsForm[a];
            }
          });
        } else {
          Object.keys(annotationsForm).forEach((a) => {
            if ( a === 'allowVlansubnet' || a === 'enforcesUseV1' || a === 'isFlatNetworkV2') {
              return;
            }

            if (a === 'network') {
              form[propMap[`${ annotationsForm[a] === DUAL_NETWORK_CARD ? a : `${ a }0` }`]] = annotationsForm[a];
            } else if (a === 'ip' || a === 'mac') {
              if (!annotationsForm[a]) {
                form[propMap[a]] = 'auto';
              } else {
                const v = annotationsForm[a].split(/,|，/);

                form[propMap[a]] = v.join('-');
              }
            } else {
              form[propMap[a]] = annotationsForm[a];
            }
          });
        }
        if (annotations) {
          delete annotations[MACVLAN_SERVICE];
          delete annotations[MACVLAN_ANNOTATION_MAP.network];
          delete annotations[MACVLAN_ANNOTATION_MAP.network0];
        }

        this.podAnnotations = Object.assign({}, annotations || {}, form);
      }
    },

    initStaticPod(podTemplateSpec, podAnnotations) {
      const {
        [MACVLAN_ANNOTATION_MAP.network]: network,
        [MACVLAN_ANNOTATION_MAP.network0]: network0,
        [MACVLAN_ANNOTATION_MAP.ip]: ipV1,
        [MACVLAN_ANNOTATION_MAP.subnet]: subnetV1,
        [MACVLAN_ANNOTATION_MAP.mac]: macV1,
        [MACVLAN_ANNOTATION_MAP.ipV2]: ipV2,
        [MACVLAN_ANNOTATION_MAP.subnetV2]: subnetV2,
        [MACVLAN_ANNOTATION_MAP.macV2]: macV2,
      } = podAnnotations || {};

      const ip = ipV2 || ipV1;
      const subnet = subnetV2 || subnetV1;
      const mac = macV2 || macV1;
      let neu = {};

      if ((network || network0) && subnet) {
        neu = {
          allowVlansubnet: true,
          network:         network || network0,
          ip:              ip === 'auto' || !ip ? '' : ip.split('-').join(','),
          mac:             mac === 'auto' || !mac ? '' : mac.split('-').join(','),
          subnet,
        };
      } else {
        neu = {
          allowVlansubnet: false,
          ip,
          mac,
          subnet,
          network,
        };
      }

      podTemplateSpec.vlansubnet = neu;
    },

    clearPvcFormState(hookName) {
      // On the `closePvcForm` event, remove the
      // before save hook to prevent the PVC from
      // being created. Use the PVC's unique ID to distinguish
      // between hooks for different PVCs.
      if (this[BEFORE_SAVE_HOOKS]) {
        this.unregisterBeforeSaveHook(hookName);
      }
    },

    updateServiceAccount(neu) {
      if (neu) {
        this.podTemplateSpec.serviceAccount = neu;
        this.podTemplateSpec.serviceAccountName = neu;
      } else {
        // Note - both have to be removed in order for removal to work
        delete this.podTemplateSpec.serviceAccount;
        delete this.podTemplateSpec.serviceAccountName;
      }
    },
    nvidiaIsValid(nvidiaGpuLimit) {
      if ( !Number.isInteger(parseInt(nvidiaGpuLimit)) ) {
        return false;
      }
      if (nvidiaGpuLimit === undefined) {
        return false;
      }
      if (nvidiaGpuLimit < 1) {
        return false;
      } else {
        return true;
      }

      //
    },

    onSearchImages: debounce(function(str) {
      this.$store.dispatch('harbor/loadImagesInHarbor', str);
    }, 500, { leading: false }),

    cleanUpClonedJobData() {
      const annotations = this.value?.metadata?.annotations;

      if (annotations) {
        this.$delete(annotations, 'batch.kubernetes.io/job-tracking');
      }
      const labels = this.value?.metadata?.labels;

      if (labels) {
        this.$delete(labels, 'batch.kubernetes.io/controller-uid');
        this.$delete(labels, 'batch.kubernetes.io/job-name');
        this.$delete(labels, 'controller-uid');
        this.$delete(labels, 'job-name');
      }

      const matchLabels = this.value?.spec?.selector?.matchLabels;

      if (matchLabels) {
        this.$delete(matchLabels, 'batch.kubernetes.io/controller-uid');
      }
      const templateLabels = this.value?.spec?.template?.metadata?.labels;

      if (templateLabels) {
        this.$delete(templateLabels, 'batch.kubernetes.io/controller-uid');
        this.$delete(templateLabels, 'batch.kubernetes.io/job-name');
        this.$delete(templateLabels, 'controller-uid');
        this.$delete(templateLabels, 'job-name');
      }
    }
  },
};
