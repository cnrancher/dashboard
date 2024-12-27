<script>
import GrafanaDashboard from './GrafanaDashboard';
import DashboardOptions from '@shell/components/DashboardOptions';
import InstallView from './InstallView.vue';
import TypeDescription from '@shell/components/TypeDescription';
import Loading from '@shell/components/Loading';
import { CATALOG } from '@shell/config/types';
import { computeDashboardUrl } from '@shell/utils/grafana';
import { mapGetters } from 'vuex';

const PVC_STATES_URL = '/api/v1/namespaces/cattle-monitoring-system/services/http:rancher-monitoring-grafana:80/proxy/d/pandaria-volumes/pandaria-volumes?kiosk=true&orgId=1';
const PVC_STATES_CHECK_URL = '/api/v1/namespaces/cattle-monitoring-system/services/http:rancher-monitoring-grafana:80/proxy/api/dashboards/uid/pandaria-volumes?kiosk=true&orgId=1';

export default {
  components: {
    GrafanaDashboard, DashboardOptions, TypeDescription, InstallView, Loading
  },
  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;

    if (this.$store.getters[`${ inStore }/canList`](CATALOG.APP)) {
      try {
        const res = await this.$store.dispatch(`${ inStore }/find`, { type: CATALOG.APP, id: 'cattle-monitoring-system/rancher-monitoring' });

        this.monitoringVersion = res?.currentVersion;
      } catch (err) {}
    }
  },
  data() {
    return {
      showInstallView:   false,
      monitoringVersion: '',
      timer:             null,
      loading:           true,
      graphOptions:      { range: '6h', refreshRate: '30s' }
    };
  },
  computed: {
    ...mapGetters(['prefs/theme']),
    graphBackgroundColor() {
      return this.theme === 'dark' ? '#2e3035' : '#f3f4f9';
    },
    theme() {
      return this['prefs/theme'];
    },
    url() {
      return PVC_STATES_URL;
    },
    computeCheckUrl() {
      const embedUrl = PVC_STATES_CHECK_URL;
      const clusterId = this.$store.getters['currentCluster'].id;
      const params = {};

      return computeDashboardUrl(this.monitoringVersion, embedUrl, clusterId, params, true);
    },
  },
  async mounted() {
    this.loading = true;
    try {
      await this.check();
    } finally {
      this.loading = false;
    }
  },
  beforeUnmount() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
  },
  methods: {
    handleError(e) {
      if (e?._status === 404) {
        this.showInstallView = true;
      }
    },
    async check() {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
      try {
        const url = this.computeCheckUrl;

        await this.$store.dispatch('management/request', { url });
        this.showInstallView = false;
      } catch (error) {
        if (error?._status === 404) {
          this.timer = setTimeout(() => this.check(), 3000);
          this.showInstallView = true;
        }
      }
    }
  },

};
</script>
<template>
  <Loading v-if="loading" />
  <div v-else>
    <InstallView v-if="showInstallView" />
    <div v-else>
      <header>
        <TypeDescription resource="pvc-states" />
        <div class="title">
          <h1 class="mb-0">
            {{ t('nav.pvcStates.label') }}
          </h1>
        </div>
      </header>

      <div>
        <DashboardOptions
          v-model:value="graphOptions"
          :has-summary-and-detail="false"
        />
      </div>
      <GrafanaDashboard
        :background-color="graphBackgroundColor"
        :theme="theme"
        :url="url"
        :refresh-rate="graphOptions.refreshRate"
        :range="graphOptions.range"
        @error="handleError"
      />
    </div>
  </div>
</template>
