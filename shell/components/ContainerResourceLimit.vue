<script>
import isEmpty from 'lodash/isEmpty';
import UnitInput from '@shell/components/form/UnitInput';
import { CONTAINER_DEFAULT_RESOURCE_LIMIT } from '@shell/config/labels-annotations';
import { cleanUp } from '@shell/utils/object';
import { _VIEW } from '@shell/config/query-params';

export default {
  emits: ['update:value'],

  components: { UnitInput },

  props: {
    mode: {
      type:    String,
      default: 'create'
    },

    namespace: {
      type:    Object,
      default: null
    },

    value: {
      type:    Object,
      default: () => {
        return {};
      }
    },

    handleGpuLimit: {
      type:    Boolean,
      default: true
    },

    registerBeforeHook: {
      type:    Function,
      default: null
    },

    showTip: {
      type:    Boolean,
      default: true
    },

    limitMinMaxValues: {
      type:    Boolean,
      default: true
    },
    limitEphemeralStorage: {
      type:    Boolean,
      default: false
    }
  },

  data() {
    const {
      limitsCpu, limitsMemory, requestsCpu, requestsMemory, limitsGpu, minCpu, maxCpu, minMemory, maxMemory, requestEphemeralStorage, limitsEphemeralStorage
    } = this.value;

    return {
      limitsCpu, limitsMemory, requestsCpu, requestsMemory, limitsGpu, minCpu, maxCpu, minMemory, maxMemory, requestEphemeralStorage, limitsEphemeralStorage, viewMode: _VIEW
    };
  },

  watch: {
    value() {
      const {
        limitsCpu, limitsMemory, requestsCpu, requestsMemory, limitsGpu, requestEphemeralStorage, limitsEphemeralStorage
      } = this.value;

      this.limitsCpu = limitsCpu;
      this.limitsMemory = limitsMemory;
      this.requestsCpu = requestsCpu;
      this.requestsMemory = requestsMemory;
      this.limitsGpu = limitsGpu;
      this.requestEphemeralStorage = requestEphemeralStorage;
      this.limitsEphemeralStorage = limitsEphemeralStorage;
    }
  },

  computed: {
    detailTopColumns() {
      return [
        {
          title: this.$store.getters['i18n/t']('generic.created'),
          name:  'created'
        },
      ];
    },
  },

  created() {
    if (this?.namespace?.id) {
      this.initLimits();
    }

    if (this.registerBeforeHook) {
      this.registerBeforeHook(this.updateBeforeSave);
    }
  },

  methods: {
    updateLimits() {
      const {
        limitsCpu,
        limitsMemory,
        requestsCpu,
        requestsMemory,
        limitsGpu,
        minCpu,
        maxCpu,
        minMemory,
        maxMemory,
        requestEphemeralStorage,
        limitsEphemeralStorage
      } = this;

      this.$emit('update:value', cleanUp({
        limitsCpu,
        limitsMemory,
        requestsCpu,
        limitsGpu,
        requestsMemory,
        minCpu,
        maxCpu,
        minMemory,
        maxMemory,
        requestEphemeralStorage,
        limitsEphemeralStorage
      }));
    },

    updateBeforeSave(value) {
      const {
        limitsCpu,
        limitsMemory,
        requestsCpu,
        requestsMemory,
        limitsGpu,
        minCpu,
        maxCpu,
        minMemory,
        maxMemory,
        requestEphemeralStorage,
        limitsEphemeralStorage
      } = this;
      const namespace = this.namespace; // no deep copy in destructure proxy yet

      const out = cleanUp({
        limitsCpu,
        limitsMemory,
        requestsCpu,
        limitsGpu,
        requestsMemory,
        minCpu,
        maxCpu,
        minMemory,
        maxMemory,
        requestEphemeralStorage,
        limitsEphemeralStorage
      });

      if (namespace) {
        const errors = this.validateResourceLimits(out);

        if (errors.length > 0) {
          return Promise.reject(errors);
        }
        namespace.setAnnotation(CONTAINER_DEFAULT_RESOURCE_LIMIT, JSON.stringify(out));
      }
    },

    initLimits() {
      const namespace = this.namespace;
      const defaults = namespace?.metadata?.annotations[CONTAINER_DEFAULT_RESOURCE_LIMIT];

      // Ember UI can set the defaults to the string literal 'null'
      if (!isEmpty(defaults) && defaults !== 'null') {
        const {
          limitsCpu,
          limitsMemory,
          requestsCpu,
          requestsMemory,
          limitsGpu,
          minCpu,
          maxCpu,
          minMemory,
          maxMemory,
          requestEphemeralStorage,
          limitsEphemeralStorage
        } = JSON.parse(defaults);

        this.limitsCpu = limitsCpu;
        this.limitsMemory = limitsMemory;
        this.requestsCpu = requestsCpu;
        this.requestsMemory = requestsMemory;
        this.limitsGpu = limitsGpu;
        this.minCpu = minCpu;
        this.maxCpu = maxCpu;
        this.minMemory = minMemory;
        this.maxMemory = maxMemory;
        this.requestEphemeralStorage = requestEphemeralStorage;
        this.limitsEphemeralStorage = limitsEphemeralStorage;
      }
    },

    validateResourceLimits(limit = {}) {
      const errors = [];
      const validate = (a, b) => {
        const aValue = limit[a];
        const bValue = limit[b];

        if (!aValue || !bValue) {
          return;
        }

        const av = Number.parseFloat(aValue);
        const bv = Number.parseFloat(bValue);

        if (Number.isNaN(av) || Number.isNaN(bv)) {
          return;
        }
        if (av <= bv) {
          return;
        }
        const message = this.t('containerResourceLimit.error', {
          key1: this.t(`containerResourceLimit.${ a }`),
          key2: this.t(`containerResourceLimit.${ b }`)
        });

        errors.push(message);
      };

      const cpuLimts = ['minCpu', 'requestsCpu', 'limitsCpu', 'maxCpu'].filter((k) => limit[k]);

      if (cpuLimts.length > 1) {
        cpuLimts.reduce((pre, cur) => {
          validate(pre, cur);

          return cur;
        });
      }

      const memoryLimits = ['minMemory', 'requestsMemory', 'limitsMemory', 'maxMemory'].filter((k) => limit[k]);

      if (memoryLimits.length > 1) {
        memoryLimits.reduce((pre, cur) => {
          validate(pre, cur);

          return cur;
        });
      }

      return errors;
    },
  },
};
</script>

<template>
  <div>
    <div class="row">
      <div
        v-if="showTip"
        class="col span-12"
      >
        <p class="helper-text mb-10">
          <t
            v-if="mode === viewMode"
            k="containerResourceLimit.helpTextDetail"
          />
          <t
            v-else
            k="containerResourceLimit.helpText"
          />
        </p>
      </div>
    </div>

    <div class="row mb-20">
      <span class="col span-6">
        <UnitInput
          v-model:value="requestsCpu"
          :placeholder="t('containerResourceLimit.cpuPlaceholder')"
          :label="t('containerResourceLimit.requestsCpu')"
          :mode="mode"
          :input-exponent="-1"
          :output-modifier="true"
          :base-unit="t('suffix.cpus')"
          data-testid="cpu-reservation"
          @update:value="updateLimits"
        />
      </span>
      <span class="col span-6">
        <UnitInput
          v-model:value="requestsMemory"
          :placeholder="t('containerResourceLimit.memPlaceholder')"
          :label="t('containerResourceLimit.requestsMemory')"
          :mode="mode"
          :input-exponent="2"
          :increment="1024"
          :output-modifier="true"
          data-testid="memory-reservation"
          @update:value="updateLimits"
        />
      </span>
    </div>

    <div class="row mb-20">
      <span class="col span-6">
        <UnitInput
          v-model:value="limitsCpu"
          :placeholder="t('containerResourceLimit.cpuPlaceholder')"
          :label="t('containerResourceLimit.limitsCpu')"
          :mode="mode"
          :input-exponent="-1"
          :output-modifier="true"
          :base-unit="t('suffix.cpus')"
          data-testid="cpu-limit"
          @update:value="updateLimits"
        />
      </span>
      <span class="col span-6">
        <UnitInput
          v-model:value="limitsMemory"
          :placeholder="t('containerResourceLimit.memPlaceholder')"
          :label="t('containerResourceLimit.limitsMemory')"
          :mode="mode"
          :input-exponent="2"
          :increment="1024"
          :output-modifier="true"
          data-testid="memory-limit"
          @update:value="updateLimits"
        />
      </span>
    </div>
    <div
      v-if="limitMinMaxValues"
      class="mb-20 row"
    >
      <span class="col span-6">
        <UnitInput
          v-model:value="maxCpu"
          :placeholder="t('containerResourceLimit.cpuPlaceholder')"
          :label="t('containerResourceLimit.maxCpu')"
          :mode="mode"
          :input-exponent="-1"
          :output-modifier="true"
          :base-unit="t('suffix.cpus')"
          data-testid="cpu-max-limit"
          @update:value="updateLimits"
        />
      </span>
      <span class="col span-6">
        <UnitInput
          v-model:value="maxMemory"
          :placeholder="t('containerResourceLimit.memPlaceholder')"
          :label="t('containerResourceLimit.maxMemory')"
          :mode="mode"
          :input-exponent="2"
          :increment="1024"
          :output-modifier="true"
          data-testid="memory-max-limit"
          @update:value="updateLimits"
        />
      </span>
    </div>
    <div
      v-if="limitMinMaxValues"
      class="mb-20 row"
    >
      <span class="col span-6">
        <UnitInput
          v-model:value="minCpu"
          :placeholder="t('containerResourceLimit.cpuPlaceholder')"
          :label="t('containerResourceLimit.minCpu')"
          :mode="mode"
          :input-exponent="-1"
          :output-modifier="true"
          :base-unit="t('suffix.cpus')"
          data-testid="cpu-min-limit"
          @update:value="updateLimits"
        />
      </span>
      <span class="col span-6">
        <UnitInput
          v-model:value="minMemory"
          :placeholder="t('containerResourceLimit.memPlaceholder')"
          :label="t('containerResourceLimit.minMemory')"
          :mode="mode"
          :input-exponent="2"
          :increment="1024"
          :output-modifier="true"
          data-testid="memory-min-limit"
          @update:value="updateLimits"
        />
      </span>
    </div>
    <div
      v-if="limitEphemeralStorage"
      class="row mb-20"
    >
      <span class="col span-6">
        <UnitInput
          v-model:value="requestEphemeralStorage"
          :placeholder="t('containerResourceLimit.memPlaceholder')"
          :label="t('containerResourceLimit.requestEphemeralStorage')"
          :mode="mode"
          :input-exponent="2"
          :increment="1024"
          :output-modifier="true"
          data-testid="ephemeral-storage-reservation"
          @update:value="updateLimits"
        />
      </span>
      <span class="col span-6">
        <UnitInput
          v-model:value="limitsEphemeralStorage"
          :placeholder="t('containerResourceLimit.memPlaceholder')"
          :label="t('containerResourceLimit.limitsEphemeralStorage')"
          :mode="mode"
          :input-exponent="2"
          :increment="1024"
          :output-modifier="true"
          data-testid="ephemeral-storage-limit"
          @update:value="updateLimits"
        />
      </span>
    </div>
    <div
      v-if="limitMinMaxValues || handleGpuLimit"
      class="row"
    >
      <span class="col span-6">
        <UnitInput
          v-model:value="limitsGpu"
          :placeholder="t('containerResourceLimit.gpuPlaceholder')"
          :label="t('containerResourceLimit.limitsGpu')"
          :mode="mode"
          :base-unit="t('suffix.gpus')"
          data-testid="gpu-limit"
          @update:value="updateLimits"
        />
      </span>
    </div>
  </div>
</template>
