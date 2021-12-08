<script>
import { _VIEW } from '@/config/query-params';
import LabeledSelect from '@/components/form/LabeledSelect';
import UnitInput from '@/components/form/UnitInput';
import { parseSi, convertToMillis } from '@/utils/units';

export default {
  components: { LabeledSelect, UnitInput },

  props: {
    mode: {
      type:     String,
      required: true,
    },
    types: {
      type:    Array,
      default: () => []
    },
    type: {
      type:    String,
      default: ''
    },
    value: {
      type:    Object,
      default: () => {
        return {};
      }
    }
  },

  data() {
    return { };
  },

  computed: {
    isView() {
      return this.mode === _VIEW;
    },

    typed() {
      return this.types.find(type => type.value === this.type);
    },
    isUnitless() {
      return this.typed?.units === 'unitless';
    },

    isCpu() {
      return this.typed?.units === 'cpu';
    },

    isMemory() {
      return this.typed?.units === 'memory';
    },

    isStorage() {
      return this.typed?.units === 'storage';
    },

    cpuLimit: {
      get() {
        return convertToMillis(this.value.spec.resourceQuota.limit[this.type]);
      },
      set(v) {
        this.$set(this.value.spec.resourceQuota.limit, this.type, [null, undefined].includes(v) ? '' : `${ v }m`);
      }
    },
    cpuNsDefaultLimit: {
      get() {
        return convertToMillis(this.value.spec.namespaceDefaultResourceQuota.limit[this.type]);
      },
      set(v) {
        this.$set(this.value.spec.namespaceDefaultResourceQuota.limit, this.type, [null, undefined].includes(v) ? '' : `${ v }m`);
      }
    },
    memLimit: {
      get() {
        const v = this.value.spec.resourceQuota.limit[this.type];

        return v ? `${ parseSi(v, { increment: 1024 }) / (1024 ** 2) }` : '';
      },
      set(v) {
        this.$set(this.value.spec.resourceQuota.limit, this.type, [null, undefined].includes(v) ? '' : `${ v }Mi`);
      }
    },
    memNsDefaultLimit: {
      get() {
        const v = this.value.spec.namespaceDefaultResourceQuota.limit[this.type];

        return v ? `${ parseSi(v, { increment: 1024 }) / (1024 ** 2) }` : '';
      },
      set(v) {
        this.$set(this.value.spec.namespaceDefaultResourceQuota.limit, this.type, [null, undefined].includes(v) ? '' : `${ v }Mi`);
      }
    },
    storageLimit: {
      get() {
        const v = this.value.spec.resourceQuota.limit[this.type];

        return v ? `${ parseSi(v, { increment: 1024 }) / (1024 ** 3) }` : '';
      },
      set(v) {
        this.$set(this.value.spec.resourceQuota.limit, this.type, [null, undefined].includes(v) ? '' : `${ v }Gi`);
      }
    },
    storageNsDefaultLimit: {
      get() {
        const v = this.value.spec.namespaceDefaultResourceQuota.limit[this.type];

        return v ? `${ parseSi(v, { increment: 1024 }) / (1024 ** 3) }` : '';
      },
      set(v) {
        this.$set(this.value.spec.namespaceDefaultResourceQuota.limit, this.type, [null, undefined].includes(v) ? '' : `${ v }Gi`);
      }
    },
    unitlessLimit: {
      get() {
        return this.value.spec.resourceQuota.limit[this.type];
      },
      set(v) {
        this.$set(this.value.spec.resourceQuota.limit, this.type, v);
      }
    },
    unitlessNsDefaultLimit: {
      get() {
        return this.value.spec.namespaceDefaultResourceQuota.limit[this.type];
      },
      set(v) {
        this.$set(this.value.spec.namespaceDefaultResourceQuota.limit, this.type, v);
      }
    }
  },

  methods: {
    updateType(type) {
      if (typeof this.value.spec.resourceQuota.limit[this.type] !== 'undefined') {
        this.$delete(this.value.spec.resourceQuota.limit, this.type);
      }

      if (typeof this.value.spec.namespaceDefaultResourceQuota.limit[this.type] !== 'undefined') {
        this.$delete(this.value.spec.namespaceDefaultResourceQuota.limit, this.type);
      }

      this.$emit('type-change', type);
    }
  },
};
</script>
<template>
  <div class="row">
    <LabeledSelect class="mr-10" :value="type" :options="types" :label="t('resourceQuota.resourceType.label')" @input="updateType($event)" />

    <UnitInput
      v-if="isUnitless"
      v-model="unitlessLimit"
      class="mr-10"
      :mode="mode"
      :suffix="false"
      :label="t('resourceQuota.projectLimit.label')"
      :placeholder="t('resourceQuota.projectLimit.unitlessPlaceholder')"
    />
    <UnitInput
      v-if="isUnitless"
      v-model="unitlessNsDefaultLimit"
      :mode="mode"
      :suffix="false"
      :label="t('resourceQuota.namespaceDefaultLimit.label')"
      :placeholder="t('resourceQuota.namespaceDefaultLimit.unitlessPlaceholder')"
    />

    <UnitInput
      v-if="isCpu"
      v-model="cpuLimit"
      class="mr-10"
      :suffix="t('suffix.milliCpus')"
      :mode="mode"
      :label="t('resourceQuota.projectLimit.label')"
      :placeholder="t('resourceQuota.projectLimit.cpuPlaceholder')"
    />
    <UnitInput
      v-if="isCpu"
      v-model="cpuNsDefaultLimit"
      :suffix="t('suffix.milliCpus')"
      :mode="mode"
      :label="t('resourceQuota.namespaceDefaultLimit.label')"
      :placeholder="t('resourceQuota.namespaceDefaultLimit.cpuPlaceholder')"
    />

    <UnitInput
      v-if="isMemory"
      v-model="memLimit"
      class="mr-10"
      :suffix="t('suffix.mib')"
      :mode="mode"
      :label="t('resourceQuota.projectLimit.label')"
      :placeholder="t('resourceQuota.projectLimit.memoryPlaceholder')"
    />
    <UnitInput
      v-if="isMemory"
      v-model="memNsDefaultLimit"
      :suffix="t('suffix.mib')"
      :mode="mode"
      :label="t('resourceQuota.namespaceDefaultLimit.label')"
      :placeholder="t('resourceQuota.namespaceDefaultLimit.memoryPlaceholder')"
    />

    <UnitInput
      v-if="isStorage"
      v-model="storageLimit"
      class="mr-10"
      :suffix="t('suffix.gb')"
      :mode="mode"
      :placeholder="t('resourceQuota.projectLimit.storagePlaceholder')"
      :label="t('resourceQuota.projectLimit.label')"
    />
    <UnitInput
      v-if="isStorage"
      v-model="storageNsDefaultLimit"
      :suffix="t('suffix.gb')"
      :mode="mode"
      :label="t('resourceQuota.namespaceDefaultLimit.label')"
      :placeholder="t('resourceQuota.namespaceDefaultLimit.storagePlaceholder')"
    />
  </div>
</template>

<style lang='scss' scoped>
  .row {
    display: flex;
    flex-direction: row;
    justify-content: space-evenly;
  }
</style>
