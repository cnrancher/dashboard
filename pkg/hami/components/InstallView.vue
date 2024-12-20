<template>
  <div class="install-view">
    <Wizard
      v-if="steps.length > 0"
      ref="wizard"
      :steps="steps"
      :edit-first-step="true"
      :banner-title="t('rancherHami.title')"
      :banner-title-subtext="t('rancherHami.subTitle')"
      :banner-image="hamiLogo"
      @finish="finish"
    >
      <template #finish>
        <div />
      </template>
      <template #cancel>
        <div />
      </template>
      <template #next>
        <div />
      </template>
      <template #rancher-monitoring>
        <div class="content">
          <img
            :src="genericIcon"
            class="logo mb-10"
          >
          <h2 class="mb-20">
            {{ t('rancherHami.installView.steps.monitoring.title') }}
          </h2>
          <p
            v-clean-html="t('rancherHami.installView.steps.monitoring.tips', {}, true)"
            class="mb-20 text-center"
          />
          <div>
            <button
              class="btn role-primary mt-20"
              @click.prevent="monitoringChartRoute"
            >
              {{ t("rancherHami.installView.steps.monitoring.appInstall.label") }}
            </button>
            <!-- <button
              class="btn role-secondary mt-20"
              @click.prevent="skip"
            >
              {{ t("rancherHami.installView.steps.monitoring.appInstall.skip") }}
            </button> -->
          </div>
        </div>
      </template>
      <template #rancher-hami>
        <div class="content">
          <img
            :src="hamiLogo"
            class="logo mb-10"
          >
          <h2 class="mb-20">
            {{ t('rancherHami.installView.steps.hami.title') }}
          </h2>
          <p
            v-clean-html="t('rancherHami.installView.steps.hami.tips', {}, true)"
            class="mb-20 text-center"
          />
          <div>
            <button
              class="btn role-primary mt-20"
              @click.prevent="harmiChartRoute"
            >
              {{ t("rancherHami.installView.steps.hami.appInstall.label") }}
            </button>
          </div>
        </div>
      </template>
    </Wizard>
  </div>
</template>
<script>
import { mapGetters } from 'vuex';
import { BLANK_CLUSTER } from '@shell/store/store-types.js';
import { REPO_TYPE, REPO, CHART } from '@shell/config/query-params';
import Wizard from '@shell/components/Wizard.vue';
import hamiLogo from '../assets/hami-logo.png';
import genericIcon from '@shell/assets/images/generic-catalog.svg';

export default {
  components: { Wizard },
  props:      {
    monitoring: {
      type:    Boolean,
      default: false
    },
    hami: {
      type:    Boolean,
      default: false
    }
  },
  data() {
    return { hamiLogo, genericIcon };
  },
  computed: {
    ...mapGetters(['currentCluster']),
    steps() {
      const steps = [];

      if (this.monitoring === false) {
        steps.push({
          name:    'rancher-monitoring',
          label:   this.t('rancherHami.installView.steps.monitoring.label'),
          subtext: this.t('rancherHami.installView.steps.monitoring.label'),
          ready:   true
        });
      }
      if (this.hami === false) {
        steps.push({
          name:    'rancher-hami',
          label:   this.t('rancherHami.installView.steps.hami.label'),
          subtext: this.t('rancherHami.installView.steps.hami.label'),
          ready:   true
        });
      }

      return steps;
    }
  },
  methods: {
    skip() {
      this.$refs.wizard?.next();
    },
    harmiChartRoute() {
      const clusterId = this.currentCluster.id;

      this.$router.push({
        name:   'c-cluster-apps-charts-install',
        params: { cluster: clusterId === BLANK_CLUSTER ? 'local' : clusterId },
        query:  {
          [REPO_TYPE]: 'cluster',
          [REPO]:      'pandaria-catalog',
          [CHART]:     'rancher-hami',
        },
      });
    },
    monitoringChartRoute() {
      const clusterId = this.currentCluster.id;

      this.$router.push({
        name:   'c-cluster-apps-charts-install',
        params: { cluster: clusterId === BLANK_CLUSTER ? 'local' : clusterId },
        query:  {
          [REPO_TYPE]: 'cluster',
          [REPO]:      'rancher-charts',
          [CHART]:     'rancher-monitoring',
        },
      });
    },
    finish() {

    }
  }
};
</script>
<style scoped>
.install-view {
  position: relative;
  padding: 0 20px;
  display: flex;
  flex: 1;
}
.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-grow: 1;
  justify-content: center;
  margin-bottom: 100px;
  width: 100%;
}
.text-center {
  text-align: center;
}
.logo {
  width: 64px;
  height: 64px;
}
</style>
