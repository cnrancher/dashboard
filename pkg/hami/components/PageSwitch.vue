<template>
  <div class="page-switch">
    <Loading v-if="loading" />
    <template
      v-else-if="hideInstallView"
    >
      <slot />
    </template>
    <template v-else>
      <InstllView
        :monitoring="monitoringInstalled"
        :hami="harmiInstalled"
      />
    </template>
  </div>
</template>
<script>
import Loading from '@shell/components/Loading';
import InstllView from './InstallView.vue';
import { stringify } from '@shell/utils/error';

export default {
  name:       'PageSwitch',
  components: {
    Loading,
    InstllView
  },
  data() {
    return {
      apps: [], loading: true, errors: [], requiredApps: ['rancher-monitoring', 'rancher-hami']
    };
  },
  created() {
    this.fetchApps();
  },
  methods: {
    async fetchApps() {
      this.loading = true;
      try {
        const id = this.$route.params.cluster;
        const { data: apps } = await this.$store.dispatch('management/request', { url: `/k8s/clusters/${ id === '_' ? 'local' : id }/v1/catalog.cattle.io.apps` });

        this.apps = apps;
      } catch (err) {
        this.errors = [stringify(err)];
      }
      this.loading = false;
    }
  },
  computed: {
    monitoringInstalled() {
      if (this.harmiInstalled) {
        return true;
      }

      return !!this.installedApps.find((app) => app.spec?.chart?.metadata?.name === 'rancher-monitoring');
    },
    harmiInstalled() {
      return !!this.installedApps.find((app) => app.spec?.chart?.metadata?.name === 'rancher-hami');
    },
    installedApps() {
      const requiredApps = this.requiredApps;
      const apps = this.apps.filter((app) => requiredApps.includes(app.spec?.chart?.metadata?.name));

      return apps;
    },

    hideInstallView() {
      return this.harmiInstalled && this.monitoringInstalled;
    }
  }
};
</script>
