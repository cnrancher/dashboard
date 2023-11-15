<template>
  <div class="page-switch">
    <Loading v-if="loading" />
    <template v-else-if="hideInstallView">
      <slot />
    </template>
    <template v-else>
      <InstllView />
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
      apps: [], loading: true, errors: []
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
    hideInstallView() {
      return this.apps.find((app) => app.spec?.chart?.metadata?.name === 'rancher-f5-cis');
    }
  }
};
</script>
<style scoped>

</style>
