<script>
import LabeledInput from '@/components/form/LabeledInput';
import Checkbox from '@/components/form/Checkbox';

export default {
  components: { Checkbox, LabeledInput },
  props:      {
    mode: {
      type:     String,
      required: true,
    },
    value: {
      type:     Object,
      required: true
    }
  },
};
</script>

<template>
  <div>
    <div class="row mb-20">
      <div class="col span-12">
        <LabeledInput v-model="value.http_config.proxy_url" :mode="mode" :label="t('monitoringReceiver.shared.proxyUrl.label')" :placeholder="t('monitoringReceiver.shared.proxyUrl.placeholder')" />
      </div>
    </div>
    <div class="row mb-20">
      <Checkbox v-model="value.send_resolved" :mode="mode" :label="t('monitoringReceiver.shared.sendResolved.label')" />
    </div>
  </div>
</template>
