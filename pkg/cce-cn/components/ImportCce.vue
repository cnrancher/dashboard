<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';

defineProps({
  name: {
    type:    String,
    default: ''
  },
  description: {
    type:    String,
    default: ''
  },
  clusterID: {
    type:    String,
    default: ''
  },
  clusterLoading: {
    type:    Boolean,
    default: false,
  },
  clusterOptions: {
    type:    Array,
    default: () => [],
  },
  rules: {
    type:    Object,
    default: () => ({}),
  },
});

const emit = defineEmits([
  'update:name',
  'update:clusterID',
  'update:description',
  'update:setClusterName'
]);

const store = useStore();
const intl = computed(() => store.getters['i18n/t']);

function updateName(name) {
  emit('update:name', name);
  emit('update:setClusterName', name);
}

</script>
<template>
  <div class="row mb-10">
    <div class="col span-6">
      <LabeledInput
        :value="name"
        :mode="mode"
        label-key="generic.name"
        required
        :rules="rules.name"
        @update:value="updateName($event)"
      />
    </div>
    <div class="col span-6">
      <LabeledInput
        :value="description"
        :mode="mode"
        label-key="nameNsDescription.description.label"
        :placeholder="intl('nameNsDescription.description.placeholder')"
        @update:value="$emit('update:description', $event)"
      />
    </div>
  </div>
  <div class="row mb-10">
    <div
      class="col span-6"
    >
      <LabeledSelect
        :value="clusterID"
        data-testid="crucce-clusterID"
        :mode="mode"
        :options="clusterOptions"
        option-label="label"
        option-key="value"
        label-key="cceCn.clusterSelect.importCluster"
        :disabled="disabled"
        :rules="rules.clusterID"
        :loading="clusterLoading"
        :placeholder="intl('cceCn.clusterSelect.placeholder')"
        @update:value="$emit('update:clusterID', $event)"
      />
    </div>
  </div>
</template>
