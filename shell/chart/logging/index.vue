<script>
import { mapGetters } from 'vuex';
import { LabeledInput } from '@components/Form/LabeledInput';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { Checkbox } from '@components/Form/Checkbox';

export default {
  components: {
    Checkbox, LabeledInput, LabeledSelect
  },
  props: {
    value: {
      type:    Object,
      default: () => {
        return {};
      }
    }
  },

  data() {
    return {
      clusterType:  this.value?.loggingOverlay?.spec?.fluentbit ? 'tke' : '',
      clusterTypes: [{
        label: this.t('logging.install.clusterType.default'),
        value: '',
      }, {
        label: this.t('logging.install.clusterType.tke'),
        value: 'tke'
      }]
    };
  },

  watch: {
    provider(neu) {
      this.$set(this, 'clusterType', neu === 'tke' ? 'tke' : '');
    },
    clusterType(neu) {
      if (neu === 'tke') {
        const loggingOverlay = {
          spec: {
            fluentbit: {
              extraVolumeMounts: [
                {
                  destination: '/var/lib/containerd',
                  readOnly:    true,
                  source:      '/var/lib/containerd'
                }
              ]
            }
          }
        };

        this.$set(this.value, 'loggingOverlay', loggingOverlay);
      } else {
        this.value.loggingOverlay && this.$set(this.value, 'loggingOverlay', {});
      }
    },
  },

  computed: {
    ...mapGetters(['currentCluster']),
    provider() {
      return (this.currentCluster.status.provider || '').split('.')[0];
    }
  },

  created() {
    const provider = this.provider;

    if ( !this.value._setSources ) {
      // Save a note so that form -> yaml -> form doesn't reset these
      Object.defineProperty(this.value, '_setSources', { enumerable: false, value: true });

      this.$set(this.value, 'additionalLoggingSources', this.value.additionalLoggingSources || {});
      this.$set(this.value.additionalLoggingSources, provider, this.value.additionalLoggingSources[provider] || {});
      this.$set(this.value.additionalLoggingSources[provider], 'enabled', true);
      this.$set(this.value, 'global', this.value.global || {});
    }
  },
};
</script>

<template>
  <div class="logging">
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledSelect
          v-model="clusterType"
          :label="t('logging.install.clusterType.label')"
          :placeholder="t('logging.install.clusterType.placeholder')"
          :localized-label="true"
          :options="clusterTypes"
        />
      </div>
    </div>
    <div
      v-if="provider === 'k3s' && clusterType === ''"
      class="row mb-20"
    >
      <div class="col span-6">
        <LabeledInput v-model="value.additionalLoggingSources.k3s.container_engine" :label="t('logging.install.k3sContainerEngine')" />
      </div>
    </div>
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledInput v-model="value.global.dockerRootDirectory" :label="t('logging.install.dockerRootDirectory')" />
      </div>
    </div>
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledInput
          v-model="value.systemdLogPath"
          :placeholder="t('logging.install.default')"
          :label="t('logging.install.systemdLogPath')"
          :tooltip="t('logging.install.tooltip', {}, true)"
        />
        <p class="mt-6" v-html="t('logging.install.url', {}, true)">
        </p>
      </div>
    </div>
    <div class="row">
      <div class="col span-6">
        <Checkbox v-model="value.additionalLoggingSources[provider].enabled" :label="t('logging.install.enableAdditionalLoggingSources')" />
      </div>
    </div>
  </div>
</template>
