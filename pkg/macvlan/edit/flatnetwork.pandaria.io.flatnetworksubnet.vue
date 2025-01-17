<script>
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import Tabbed from '@shell/components/Tabbed';
import { MANAGEMENT } from '@shell/config/types';
import Tab from '@shell/components/Tabbed/Tab';
import { isArray } from 'lodash';
import cloneDeep from 'lodash/cloneDeep';
import { mapGetters } from 'vuex';
import { RadioButton } from '@components/Form/Radio';
import FormValidation from '@shell/mixins/form-validation';
import CIDRMatcher from 'cidr-matcher';
import CreateEditView from '@shell/mixins/create-edit-view';
import CruResource from '@shell/components/CruResource.vue';
import FlatnetworkIpRoute from '../components/form/FlatnetworkIpRoute';
import FlatnetworkIpRange from '../components/form/FlatnetworkIpRange';
import { validateKubernetesName } from '@shell/utils/validators/kubernetes-name';

const defualtModeOptions = [
  {
    label: 'bridge',
    value: 'bridge',
  },
  {
    label: 'vepa',
    value: 'vepa',
  },
  {
    label: 'private',
    value: 'private',
  },
  {
    label: 'passthru',
    value: 'passthru',
  },
];

const LevelModeOptions = [
  {
    label: 'l2',
    value: 'l2',
  },
  {
    label: 'l3',
    value: 'l3',
  },
  {
    label: 'l3s',
    value: 'l3s',
  },
];

export default {
  name:   'FlatnetworksResourceCreate',
  mixins: [CreateEditView, FormValidation],
  props:  {
    resource: {
      type:     String,
      required: true,
    },
  },
  components: {
    LabeledInput,
    Tabbed,
    Tab,
    LabeledSelect,
    FlatnetworkIpRange,
    FlatnetworkIpRoute,
    CruResource,
    RadioButton,
  },
  mounted() {
    // init existed flatnetworksubnet
    this.$store.commit('flatnetwork/clearExistedFlatnetworkSubnet');
  },
  data() {
    let config = JSON.parse(JSON.stringify(this.$store.getters['flatnetwork/emptyForm']));

    if (this.value?.spec) {
      if (!this.value.spec?.routes) {
        this.value.spec.routes = [];
      }
      if (!this.value.spec?.ranges) {
        this.value.spec.ranges = [];
      }
      config = cloneDeep(this.value);
    }

    if (!config.spec.routeSettings) {
      config.spec.routeSettings = {
        addNodeCIDR:               false,
        addPodIPToHost:            false,
        flatNetworkDefaultGateway: false,
        addClusterCIDR:            false,
        addServiceCIDR:            false,
      };
    }
    if (!config?.metadata?.labels) {
      config.metadata.labels = { project: '' };
    }
    let showIPvlanFlag = false;
    let modeOptions = defualtModeOptions;

    if (this.value?.spec) {
      const { ipvlanFlag, flatMode, mode } = this.value.spec;

      if (ipvlanFlag) {
        showIPvlanFlag = true;
      }

      if (flatMode === 'ipvlan') {
        modeOptions = LevelModeOptions;
      }

      config.spec.mode = mode ?? config.spec.mode;
      config.spec.ipvlanFlag = ipvlanFlag ?? config.spec.ipvlanFlag;
    }

    return {
      config,
      errors:          [],
      cloneFormName:   '',
      flatModeOptions: [
        {
          label: 'macvlan',
          value: 'macvlan',
        },
        {
          label: 'ipvlan',
          value: 'ipvlan',
        },
      ],
      ipvlanFlagOptions: [
        {
          label: 'private',
          value: 'private',
        },
        {
          label: 'bridge',
          value: 'bridge',
        },
        {
          label: 'vepa',
          value: 'vepa',
        },
      ],
      showIPvlanFlag,
      modeOptions,
      vlan:           config.spec.vlan || '',
      fvFormRuleSets: [
        {
          path: 'metadata.name', rules: ['nameChar'], translationKey: 'generic.name', rootObject: config
        },
        {
          path: 'spec.master', rules: ['masterChar'], translationKey: 'macvlan.master.label', rootObject: config
        },
        {
          path: 'spec.vlan', rules: ['vlanValidate'], rootObject: config
        },
        {
          path: 'spec.cidr', rules: ['cidrValidate'], translationKey: 'macvlan.cidr.label', rootObject: config
        },
        {
          path: 'spec.gateway', rules: ['gatewayVlidate'], rootObject: config
        },
        {
          path: 'spec.ranges', rules: ['ipRangeVlidate'], rootObject: config
        },
        {
          path: 'spec.routes', rules: ['routeVlidate'], rootObject: config
        },
      ],
    };
  },

  computed: {
    ...mapGetters(['currentCluster']),
    doneRoute() {
      return `c-cluster-product-resource`;
    },
    tabErrors() {
      return {
        general:  this.fvGetPathErrors(['spec.master', 'spec.vlan', 'spec.cidr', 'spec.gateway'])?.length > 0,
        advanced: this.fvGetPathErrors(['spec.routes', 'spec.ranges'])?.length > 0
      };
    },
    existedFlatnetworkSubnet() {
      return this.$store.getters['flatnetwork/existedFlatnetworkSubnet'] || [];
    },
    projectOptions() {
      const out = [{
        label: 'All Projects',
        value: ''
      }];

      this.$store.getters['management/all'](
        MANAGEMENT.PROJECT
      ).forEach((obj) => {
        if (obj.spec?.clusterName === this.currentCluster?.id) {
          out.push({
            label: this.truncateString(obj.nameDisplay),
            value: obj.id.replace(/[/]/g, '-'),
          });
        }
      });

      return out;
    },
    fvExtraRules() {
      const ipv4RegExp = /^(((\d{1,2})|(1\d{2})|(2[0-4]\d)|(25[0-5]))\.){3}((\d{1,2})|(1\d{2})|(2[0-4]\d)|(25[0-5]))$/;
      const ipv6RegExp = /^((?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|((?:[0-9a-fA-F]{1,4}:){0,6}(?:[0-9a-fA-F]{1,4}))?(::)([0-9a-fA-F]{1,4}(:[0-9a-fA-F]{1,4}){0,5})?)$/;
      const cidrIPV4RegExp = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/\d{1,2}$/;
      const cidrIPV6RegExp = /^((?:[a-fA-F0-9]{1,4}:){1,7}:?|:(:[a-fA-F0-9]{1,4}){1,7})(\/(?:12[0-8]|1[01][0-9]|[1-9]?[0-9]))$/;

      const nameChar = (value) => {
        if (!value) {
          return this.t('validation.required', { key: this.t('generic.name') });
        }
        const errors = [];

        if (value.length < 2 && value.length !== 0) {
          errors.push(this.t('macvlan.name.tooShort', { key: this.t('macvlan.name.label'), min: 2 }));
        } else {
          validateKubernetesName(value, this.t('macvlan.name.label'), this.$store.getters, { minLength: 2 }, errors);
        }

        if (errors.length) {
          return errors[0];
        }
      };
      const masterChar = (value) => {
        if (!value) {
          return this.t('validation.required', { key: this.t('macvlan.master.label') });
        }
        const errors = [];

        validateKubernetesName(value, this.t('macvlan.master.label'), this.$store.getters, { minLength: 0 }, errors);
        if (errors.length) {
          return errors[0];
        }
      };
      const vlanValidate = (value) => {
        if (value !== '' && value !== 0 && (!/^\d+$/.test(value) || value < 2 || value > 4095)) {
          return this.t('macvlan.vlan.vlanRangeError');
        }
      };
      const cidrValidate = (value) => {
        if (!value) {
          return this.t('validation.required', { key: this.t('macvlan.cidr.label') });
        }
        if (!cidrIPV4RegExp.test(value) && !cidrIPV6RegExp.test(value)) {
          return this.t('macvlan.cidr.cidrFormatError');
        }
      };

      const gatewayVlidate = (value) => {
        if (value && !ipv4RegExp.test(value) && !ipv6RegExp.test(value)) {
          return this.t('macvlan.gateway.gatewayFormatError');
        }
      };
      const ipRangeVlidate = (value) => {
        if (!isArray(value)) {
          value = [value];
        }
        const IPFormatError = value.find((r) => (!ipv4RegExp.test(r.to) && !ipv6RegExp.test(r.to)) || (!ipv4RegExp.test(r.from) && !ipv6RegExp.test(r.from)));

        if (IPFormatError) {
          return this.t('macvlan.ipRange.IPFormatError', { info: `，${ IPFormatError.from || 0 } - ${ IPFormatError.to || 0 }` });
        }

        const IPInCidrError = value.find((r) => !this.ipCIDRContains(this.config.spec?.cidr, r.to) || !this.ipCIDRContains(this.config.spec?.cidr, r.from));

        if (IPInCidrError) {
          return this.t('macvlan.ipRange.IPInCidrError', { info: `${ IPInCidrError.from } - ${ IPInCidrError.to }` });
        }

        const IPRangeError = value.find((r) => this.compareIP(r.from, r.to) > 0);

        if (IPRangeError) {
          return this.t('macvlan.ipRange.IPRangeError', {
            min: IPRangeError.from,
            max: IPRangeError.to
          });
        }
      };
      const routeVlidate = (value) => {
        if (!isArray(value)) {
          value = [value];
        }
        if (value.some((r) => !r.dst)) {
          return this.t('macvlan.route.routeDstReq');
        }
        if (value.some((r) => !!r.dst && !(cidrIPV4RegExp.test(r.dst) || cidrIPV6RegExp.test(r.dst)))) {
          return this.t('macvlan.route.routeDstFormatError');
        }
        if (value.some((r) => !!r.via && !(ipv4RegExp.test(r.via) || ipv6RegExp.test(r.via)) )) {
          return this.t('macvlan.route.routeViaFormatError');
        }
        if (value.some((r) => !!r.src && !(ipv4RegExp.test(r.src) || ipv6RegExp.test(r.src)) && !this.ipCIDRContains(this.config.spec.cidr, r.src) )) {
          return this.t('macvlan.route.routeSrcFormatError');
        }
        if (value.some((r) => !!r.priority &&
          !(parseInt(r.priority, 10) === 0 || (parseInt(r.priority, 10) > 100 && parseInt(r.priority, 10) <= 2147483647)))) {
          return this.t('macvlan.route.routePriorityFormatError');
        }
      };

      return {
        nameChar, masterChar, vlanValidate, cidrValidate, gatewayVlidate, routeVlidate, ipRangeVlidate
      };
    },
  },

  watch: {
    'config.spec.flatMode': {
      handler(value) {
        if (value === 'macvlan') {
          this.modeOptions = defualtModeOptions;
          this.config.spec.mode = 'bridge';
          this.showIPvlanFlag = false;
          if (this.config.spec.ipvlanFlag) {
            delete this.config.spec.ipvlanFlag;
          }
        } else {
          if (!this.showIPvlanFlag) {
            this.showIPvlanFlag = true;
            this.config.spec.ipvlanFlag = 'bridge';
          }
          this.modeOptions = LevelModeOptions;
          this.config.spec.mode = 'l2';
        }
      },
    }
  },

  methods: {
    async save(btnCb) {
      const errors = [];

      if (errors.length) {
        this.$set(this, 'errors', errors);
        btnCb(false);

        return;
      }
      // remove unused fields
      this.$delete(this.config, 'id');
      this.$delete(this.config, 'links');
      this.$delete(this.config, 'type');
      this.$delete(this.config, '__clone');
      const metadata = this.config.metadata;

      if (metadata) {
        this.$delete(metadata, 'state');
        this.$delete(metadata, 'relationships');
        this.$delete(metadata, 'fields');
      }

      this.$store.dispatch(`flatnetwork/${ this.isEdit ? 'update' : 'create' }Flatnetwork`, {
        cluster: this.currentCluster.id,
        params:  this.config
      }).then((res) => {
        btnCb(true);
        this.cancel();
      }).catch((err) => {
        errors.push(err.message);
        this.$set(this, 'errors', errors);
        btnCb(false);
      });
    },

    cancel() {
      const { resource } = this.$route.params;

      this.$router.push({
        name:   'c-cluster-product-resource',
        params: { resource }
      });
    },
    ipCIDRContains(cidr, ip) {
      let result = false;

      try {
        const matcher = new CIDRMatcher([cidr]);

        result = matcher.contains(ip);
      } catch (err) {
        result = false;
      }

      return result;
    },
    expandIPv6Address(address) {
      if (address.includes('::')) {
        const parts = address.split('::');
        const left = parts[0] ? parts[0].split(':') : [];
        const right = parts[1] ? parts[1].split(':') : [];
        const fill = new Array(8 - (left.length + right.length)).fill('0');

        return [...left, ...fill, ...right].map((part) => part.padStart(4, '0')).join(':');
      } else {
        return address.split(':').map((part) => part.padStart(4, '0')).join(':');
      }
    },
    compareIP(ipBegin, ipEnd) {
      const isIPv4 = (ip) => ip.includes('.');
      const isIPv6 = (ip) => ip.includes(':');

      let beginParts, endParts;

      if (isIPv4(ipBegin) && isIPv4(ipEnd)) {
        beginParts = ipBegin.split('.').map((part) => parseInt(part, 10));
        endParts = ipEnd.split('.').map((part) => parseInt(part, 10));
      } else if (isIPv6(ipBegin) && isIPv6(ipEnd)) {
        beginParts = this.expandIPv6Address(ipBegin).split(':').map((part) => parseInt(part, 16));
        endParts = this.expandIPv6Address(ipEnd).split(':').map((part) => parseInt(part, 16));
      } else {
        return -1;
      }

      for (let i = 0; i < beginParts.length; i++) {
        if (beginParts[i] > endParts[i]) {
          return 1;
        } else if (beginParts[i] < endParts[i]) {
          return -1;
        }
      }

      return 0;
    },
    loadExistedFlatnetwork() {
      const { master, vlan, flatMode } = this.config.spec;

      if (!this.existedFlatnetworkSubnet.length ||
        master !== this.existedFlatnetworkSubnet[0].spec.master ||
        vlan !== this.existedFlatnetworkSubnet[0].spec.vlan ||
        flatMode !== this.existedFlatnetworkSubnet[0].spec.flatMode) {
        return this.$store.dispatch('flatnetwork/loadExistedFlatnetworkSubnet', {
          cluster: this.currentCluster.id,
          query:   {
            filter: {
              'metadata.labels.master':   this.config.spec.master,
              'metadata.labels.vlan':     this.config.spec.vlan,
              'metadata.labels.flatMode': this.config.spec.flatMode,
            },
            limit: '-1'
          }
        });
      }
    },
    onTabChanged({ selectedName }) {
      if (selectedName === 'advanced') {
        this.loadExistedFlatnetwork();
      }
    },
    handleInput() {
      this.config.spec.routeSettings.addClusterCIDR = !this.config.spec.routeSettings.addClusterCIDR;
    },
    truncateString(str, maxLength = 30) {
      return str.length > maxLength ? `${ str.slice(0, maxLength) }...` : str;
    }
  }
};
</script>

<template>
  <CruResource
    :done-route="doneRoute"
    :validation-passed="fvFormIsValid"
    :resource="config"
    :mode="mode"
    :errors="errors"
    @finish="save"
    @error="e=>errors = e"
    @cancel="cancel"
  >
    <div>
      <div class="row mb-20">
        <div class="col span-3">
          <LabeledInput
            v-model="config.metadata.name"
            required
            label-key="generic.name"
            tooltipKey="generic.name"
            placeholder-key="nameNsDescription.name.placeholder"
            :mode="mode"
            :disabled="isEdit"
            :rules="fvGetAndReportPathRules('metadata.name')"
          />
        </div>
      </div>
      <Tabbed
        :side-tabs="true"
        default-tab="general"
        @changed="onTabChanged"
      >
        <Tab
          name="general"
          :label="t('macvlan.tabs.general')"
          :weight="99"
          :error="tabErrors.general"
        >
          <div class="row mb-20">
            <div class="col span-6">
              <LabeledInput
                v-model="config.spec.master"
                required
                label-key="macvlan.master.label"
                placeholder-key="macvlan.master.placeholder"
                :mode="mode"
                :disabled="isEdit"
                :rules="fvGetAndReportPathRules('spec.master')"
              />
            </div>
            <div class="col span-6">
              <LabeledInput
                v-model="vlan"
                label-key="macvlan.vlan.label"
                placeholder-key="macvlan.vlan.placeholder"
                :mode="mode"
                :disabled="isEdit"
                :rules="fvGetAndReportPathRules('spec.vlan')"
                @input="$set(config.spec, 'vlan', Number($event));"
              />
            </div>
          </div>

          <div class="row mb-20">
            <div class="col span-6">
              <LabeledInput
                v-model="config.spec.cidr"
                required
                label-key="macvlan.cidr.label"
                placeholder-key="macvlan.cidr.placeholder"
                :mode="mode"
                :disabled="isEdit"
                :rules="fvGetAndReportPathRules('spec.cidr')"
              />
            </div>
            <div class="col span-6">
              <LabeledSelect
                v-model="config.spec.flatMode"
                :mode="mode"
                required
                label-key="macvlan.mode.flatMode"
                :options="flatModeOptions"
                option-label="label"
                :disabled="isEdit"
              />
            </div>
          </div>
          <div class="row mb-20">
            <div class="col span-6">
              <LabeledSelect
                v-model="config.spec.mode"
                :mode="mode"
                required
                label-key="macvlan.mode.label"
                :options="modeOptions"
                option-label="label"
              />
            </div>
            <div class="col span-6">
              <LabeledInput
                v-model="config.spec.gateway"
                label-key="macvlan.gateway.label"
                placeholder-key="macvlan.gateway.placeholder"
                :mode="mode"
                :rules="fvGetAndReportPathRules('spec.gateway')"
              />
            </div>
          </div>
          <div class="row mb-20">
            <div class="col span-6">
              <LabeledSelect
                v-model="config.metadata.labels.project"
                :mode="mode"
                required
                label-key="macvlan.project.label"
                :options="projectOptions"
                option-label="label"
              />
            </div>
            <div
              v-if="showIPvlanFlag"
              class="col span-6"
            >
              <LabeledSelect
                v-model="config.spec.ipvlanFlag"
                :mode="mode"
                required
                label-key="macvlan.ipvlanFlag.label"
                :options="ipvlanFlagOptions"
                option-label="label"
              />
            </div>
          </div>
        </Tab>
        <Tab
          name="advanced"
          :label="t('macvlan.tabs.advanced')"
          :weight="98"
          :error="tabErrors.advanced"
        >
          <FlatnetworkIpRange
            :value="config.spec.ranges"
            :mode="mode"
            :rules="fvGetAndReportPathRules('spec.ranges')"
          />
          <FlatnetworkIpRoute
            :value="config.spec.routes"
            :mode="mode"
            :rules="fvGetAndReportPathRules('spec.routes')"
          />
          <div>
            <h3>
              {{ t('macvlan.routeSettings.title.pod') }}
            </h3>
            <div>
              <RadioButton
                :value="config.spec.routeSettings.addClusterCIDR"
                :val="true"
                :label="t('macvlan.routeSettings.addClusterCIDR')"
                @input="() => {
                  config.spec.routeSettings.addClusterCIDR = !config.spec.routeSettings.addClusterCIDR
                }"
              />
            </div>
            <div>
              <RadioButton
                :value="config.spec.routeSettings.addServiceCIDR"
                :val="true"
                :label="t('macvlan.routeSettings.addServiceCIDR')"
                @input="() => {
                  config.spec.routeSettings.addServiceCIDR = !config.spec.routeSettings.addServiceCIDR
                }"
              />
            </div>
            <div>
              <RadioButton
                :value="config.spec.routeSettings.addNodeCIDR"
                :val="true"
                :label="t('macvlan.routeSettings.addNodeCIDR')"
                @input="() => {
                  config.spec.routeSettings.addNodeCIDR = !config.spec.routeSettings.addNodeCIDR
                }"
              />
            </div>
            <h3 class="mt-10">
              {{ t('macvlan.routeSettings.title.node') }}
            </h3>
            <RadioButton
              :value="config.spec.routeSettings.addPodIPToHost"
              :val="true"
              :label="t('macvlan.routeSettings.addPodIPToHost')"
              @input="() => {
                config.spec.routeSettings.addPodIPToHost = !config.spec.routeSettings.addPodIPToHost
              }"
            />
            <h3 class="mt-10">
              {{ t('macvlan.routeSettings.title.default') }}
            </h3>
            <RadioButton
              :value="config.spec.routeSettings.flatNetworkDefaultGateway"
              :val="true"
              :label="t('macvlan.routeSettings.flatNetworkDefaultGateway')"
              @input="() => {
                config.spec.routeSettings.flatNetworkDefaultGateway = !config.spec.routeSettings.flatNetworkDefaultGateway
              }"
            />
          </div>
        </Tab>
      </Tabbed>
    </div>
  </CruResource>
</template>

<style lang="scss" scoped>
    $spacer: 10px;

    .controls-container {
      display: flex;
      justify-content: right;
      padding-top: $spacer;

      border-top: var(--header-border-size) solid var(--header-border);
    }
</style>
