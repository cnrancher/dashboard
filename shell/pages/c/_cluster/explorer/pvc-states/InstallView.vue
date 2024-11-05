<template>
  <div class="install-view">
    <h2 class="mb-10">
      {{ t('nav.pvcStates.name') }}
    </h2>
    <p class="mb-20">
      {{ t('nav.pvcStates.desc') }}
    </p>
    <div>
      <button
        class="btn role-primary mt-20"
        @click.prevent="chartRoute"
      >
        {{ t("nav.pvcStates.appInstall.label") }}
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
          [CHART]:     'rancher-extra-dashboards',
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
