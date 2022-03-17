<script>
import Tabbed from '@/components/Tabbed';
import Tab from '@/components/Tabbed/Tab';
import { _EDIT } from '@/config/query-params';
import LabeledSelect from '@/components/form/LabeledSelect';
import Banner from '@/components/Banner';
import KeyValue from '@/components/form/KeyValue';
import Tolerations from '@/components/form/Tolerations';
import Reservation from '@/components/form/Reservation.vue';
import ToggleSwitch from '@/components/form/ToggleSwitch';
import { random32 } from '@/utils/string';
import { uniqBy } from 'lodash';
import GlobalDashboard from './GlobalDashboard';
import ObjectStorage from './ObjectStorage';
import Certificate from './Certificate';

const THANOS_QUERY = 'Thanos Query';
const CLUSTER_IP = 'ClusterIP';
const NODE_PORT = 'NodePort';
const LOAD_BALANCER = 'LoadBalancer';
const SERVICE_TYPES = [
  {
    label: 'globalMonitoringPage.svc.clusterIp',
    value: CLUSTER_IP
  },
  {
    label: 'globalMonitoringPage.svc.nodePort',
    value: NODE_PORT
  },
  {
    label: 'globalMonitoringPage.svc.loadBalancer',
    value: LOAD_BALANCER
  }
];

export default {
  name:  'GlobalMonitoring',
  props: {
    mode: {
      type:    String,
      default: _EDIT
    },
    existing: {
      type:    Boolean,
      default: false,
    },
    value: {
      type:     Object,
      required: true,
    },
    ui: {
      type:     Object,
      required: true,
    },
    chart: {
      type:     Object,
      default:  () => ({}),
    },
    clusters: {
      type:     Array,
      default:  () => ([]),
      required: true,
    },
    optionLabel: {
      type:    String,
      default: 'label',
    },
  },
  components: {
    Tab,
    Tabbed,
    LabeledSelect,
    Banner,
    KeyValue,
    Tolerations,
    Reservation,
    ToggleSwitch,
    GlobalDashboard,
    ObjectStorage,
    Certificate,
  },

  data() {
    return {
      thanosQuery:      THANOS_QUERY,
      serviceTypes:     SERVICE_TYPES,
      customAnswers:    {},
      chartVersion:     '',
      clusterId:        '',
      originUi:         {},
      queryTolerations: [],
    };
  },

  computed: {
    upgradeAvailable() {
      return this.enabled && this.latestVersion && this.templateVersion && this.latestVersion !== this.templateVersion;
    },
    chartVersions() {
      if (!this.chartVersion && this.chart?.versions?.length) {
        this.$set(this, 'chartVersion', this.chart.versions[0].version);
      }

      return uniqBy(this.chart?.versions || [], 'version').map(v => ({
        label: v.version,
        value: v.version,
      })).sort();
    },
  },

  methods: {
    updateClusterStore() {
      this.$set(this.value.thanos.query, 'stores', this.clusters.filter(c => !!c.monitoringEabled).map(s => s.monitoringNodeIp));
    },
    updateCluster(clusterId) {
      this.$router.push({
        name:   this.$route.name,
        params: { cluster: clusterId }
      });
    },
    validate() {
      if (this.$refs.objectStorage) {
        this.$refs.objectStorage.validate();
      }
    },
    updatecCustomAnswers() {
      const ui = this.removeCustomAnswers();

      Object.keys(this.customAnswers).forEach((key) => {
        ui[key] = this.customAnswers[key];
      });

      this.value.ui = ui;
    },
    removeCustomAnswers() {
      const newUi = {};

      Object.keys(this.ui).forEach((key) => {
        newUi[key] = this.value.ui[key];
      });

      return newUi;
    },
    getCustomAnswers() {
      const customAnswers = {};

      Object.keys(this.value.ui).forEach((key) => {
        if (this.ui[key] === undefined) {
          customAnswers[key] = this.value.ui[key];
        }
      });

      this.$set(this, 'customAnswers', customAnswers);
    },
    updateQueryTolerations(inputVal) {
      this.$set(this.value.thanos.query, 'tolerations', inputVal.map((item) => {
        delete item.vKey;

        return item;
      }));
    },
    initTolerations() {
      this.$set(this, 'queryTolerations', this.value.thanos.query.tolerations.map((item) => {
        item.vKey = random32();

        return item;
      }));
    }
  },

  mounted() {
    if (this?.chart?.id) {
      this.updateClusterStore();
    }
  },
  created() {
    if (this?.chart?.id) {
      this.getCustomAnswers();
      this.initTolerations();
    }
  }
};
</script>

<template>
  <div>
    <Tabbed :side-tabs="true" default-tab="general">
      <Tab name="general" :label="t('monitoring.tabs.general')" :weight="99">
        <div class="row mb-20">
          <div class="col span-6">
            <LabeledSelect
              v-model="value.global.cattle.clusterId"
              :mode="mode"
              :disabled="existing"
              required
              :options="clusters"
              option-key="id"
              option-label="spec.displayName"
              :label="t('globalMonitoringPage.cluster')"
              @input="updateCluster"
            />
          </div>
          <div class="col span-6">
            <LabeledSelect
              v-model="chartVersion"
              :mode="mode"
              required
              :label="upgradeAvailable ? t('monitoringPage.upgradeAvailable', {version: latestVersion}) : t('globalMonitoringPage.version')"
              :options="chartVersions"
              :option-label="optionLabel"
              @input="$emit(updateVersion, $event)"
            />
          </div>
        </div>

        <template v-if="chart.id">
          <h3>{{ t('globalMonitoringPage.enableMonitoring.title') }}</h3>
          <Banner
            :closable="true"
            class="cluster-tools-tip"
            color="warning"
            :label="t('globalMonitoringPage.enableMonitoring.warning')"
          />
          <table class="sortable-table enable-monitoring" width="100%">
            <thead>
              <tr>
                <th class="cluster" align="left">
                  {{ t('globalMonitoringPage.enableMonitoring.cluster') }}
                </th>
                <th class="button" align="left" width="100">
                  {{ t('globalMonitoringPage.enableActionLabel') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in clusters" :key="c.id">
                <td>{{ c.spec.displayName }} </td>
                <td>
                  <ToggleSwitch
                    v-model="c.monitoringEabled"
                    :labels="[false, true]"
                    @input="updateClusterStore"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </template>
      </Tab>
      <template v-if="!!chart.id">
        <Tab name="thanos" label-key="globalMonitoringPage.thanos.title" :weight="98">
          <h2>{{ t('globalMonitoringPage.thanos.title') }}</h2>
          <Reservation
            :value="value"
            :component="thanosQuery"
            class="mb-20"
            resources-key="thanos.query.resources"
            @updateWarning="$emit('updateWarning')"
          />
          <h3>{{ t('globalMonitoringPage.nodeSelector.helpText', {component: thanosQuery}) }}</h3>
          <div class="row mb-20">
            <KeyValue
              v-model="value.thanos.query.nodeSelector"
              :mode="mode"
              :read-allowed="false"
              :protip="true"
              :add-label="t('globalMonitoringPage.nodeSelector.addSelectorLabel')"
            />
          </div>

          <div class="mb-20">
            <h3 class="mb-20">
              <t k="formScheduling.toleration.workloadTitle" :workload="thanosQuery" />
            </h3>
            <div class="row">
              <Tolerations
                :value="queryTolerations"
                :mode="mode"
                @input="updateQueryTolerations"
              />
            </div>
          </div>

          <div class="row mb-20">
            <div class="col span-6">
              <LabeledSelect
                v-model="value.thanos.query.service.type"
                :mode="mode"
                :label="t('globalMonitoringPage.thanos.serviceType.label')"
                :options="serviceTypes"
                :option-label="optionLabel"
                :localized-label="true"
              />
            </div>
          </div>
        </Tab>
        <Tab name="store" label-key="globalMonitoringPage.store.title" :weight="97">
          <ObjectStorage
            ref="objectStorage"
            :value="value"
            :mode="mode"
            @updateWarning="$emit('updateWarning')"
          />
        </Tab>
        <Tab name="grafana" label-key="globalMonitoringPage.grafana.header" :weight="96">
          <GlobalDashboard
            :value="value"
            :mode="mode"
            @updateWarning="$emit('updateWarning')"
          />
        </Tab>
        <Tab name="ceritificate" label-key="globalMonitoringPage.tls.header" :weight="95">
          <Certificate
            :value="value"
            :mode="mode"
          />
        </Tab>
        <Tab name="customAnswers" label-key="globalMonitoringPage.customAnswers.title" :weight="94">
          <h2>{{ t('globalMonitoringPage.customAnswers.title') }}</h2>

          <h3>{{ t('globalMonitoringPage.customAnswers.answer.label') }}</h3>
          <div class="row mb-20">
            <KeyValue
              v-model="customAnswers"
              :mode="mode"
              :read-allowed="false"
              :protip="true"
              :add-label="t('globalMonitoringPage.customAnswers.addAnswerLabel')"
              @input="updatecCustomAnswers"
            />
          </div>
        </Tab>
      </template>
    </Tabbed>
  </div>
</template>

<style lang="scss" scoped>
  .enable-monitoring {
    th {
      padding: 8px 5px;
      font-weight: 400;
      border: 0;
    }
  }
</style>
