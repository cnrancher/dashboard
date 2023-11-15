<template>
  <div class="install-view">
    <h2 class="mb-10">
      {{ t('f5cis.installView.title') }}
    </h2>
    <p class="mb-20">
      {{ t('f5cis.installView.tips') }}
    </p>
    <div>
      <button
        class="btn role-primary mt-20"
        @click.prevent="chartRoute"
      >
        {{ t("f5cis.installView.appInstall.button") }}
      </button>
    </div>
  </div>
</template>
<script>
import { mapGetters } from 'vuex';
import { BLANK_CLUSTER } from '@shell/store/store-types.js';
import { REPO_TYPE, REPO, CHART } from '@shell/config/query-params';

export default {
  computed: { ...mapGetters(['currentCluster']) },
  methods:  {
    chartRoute() {
      const clusterId = this.currentCluster.id;

      this.$router.push({
        name:   'c-cluster-apps-charts-install',
        params: { cluster: clusterId === BLANK_CLUSTER ? 'local' : clusterId },
        query:  {
          [REPO_TYPE]: 'cluster',
          [REPO]:      'pandaria-catalog',
          [CHART]:     'rancher-f5-cis',
        },
      });
    }
  }
};
</script>
<style scoped>
.install-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-grow: 1;
  justify-content: center;
}
</style>
