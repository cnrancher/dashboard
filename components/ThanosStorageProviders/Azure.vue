<script>
import Provider from '@/mixins/thanos-storage-provider';
import LabeledInput from '@/components/form/LabeledInput';

export const answers = {
  bucketName:          'thanos.objectConfig.config.container',
  endpoint:            'thanos.objectConfig.config.endpoint',
  storageAccount:      'thanos.objectConfig.config.storage_account',
  storageAccountKey:   'thanos.objectConfig.config.storage_account_key',
  maxRetries:          'thanos.objectConfig.config.max_retries',
};

const defaults = { maxRetries: 0 };

export default {
  mixins: [Provider],

  data() {
    return {
      answers,
      name: 'azure',
      defaults,
    };
  },

  components: { LabeledInput },
};
</script>
<template>
  <div>
    <div class="row mb-10">
      <div class="col span-6">
        <LabeledInput
          v-model="value.thanos.objectConfig.config.container"
          :mode="mode"
          required
          :label="t('globalMonitoringPage.store.azure.bucketName.label')"
          :placeholder="t('globalMonitoringPage.store.azure.bucketName.placeholder')"
        />
      </div>
      <div class="col span-6">
        <LabeledInput
          v-model="value.thanos.objectConfig.config.endpoint"
          :mode="mode"
          required
          :label="t('globalMonitoringPage.store.azure.endpoint.label')"
          :placeholder="t('globalMonitoringPage.store.azure.endpoint.placeholder')"
        />
      </div>
    </div>
    <div class="row mb-10">
      <div class="col span-6">
        <LabeledInput
          v-model="value.thanos.objectConfig.config.storage_account"
          :mode="mode"
          required
          :label="t('globalMonitoringPage.store.azure.storageAccount.label')"
          :placeholder="t('globalMonitoringPage.store.azure.storageAccount.placeholder')"
        />
      </div>
      <div class="col span-6">
        <LabeledInput
          v-model="value.thanos.objectConfig.config.storage_account_key"
          :mode="mode"
          required
          :label="t('globalMonitoringPage.store.azure.storageAccountKey.label')"
          :placeholder="t('globalMonitoringPage.store.azure.storageAccountKey.placeholder')"
        />
      </div>
    </div>
    <div class="row mb-10">
      <div class="col span-6">
        <LabeledInput
          v-model="value.thanos.objectConfig.config.max_retries"
          :mode="mode"
          type="number"
          min="0"
          required
          :label="t('globalMonitoringPage.store.azure.maxRetries.label')"
          :placeholder="t('globalMonitoringPage.store.azure.maxRetries.placeholder')"
        />
      </div>
    </div>
  </div>
</template>
