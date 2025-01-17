<script>
import isEmpty from 'lodash/isEmpty';
import UnitInput from '@/components/form/UnitInput';
import { CONTAINER_DEFAULT_RESOURCE_LIMIT } from '@/config/labels-annotations';
import { cleanUp } from '@/utils/object';
import { _VIEW } from '@/config/query-params';

export default {
  components: { UnitInput },

  props:      {
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
    }
  },

  data() {
    const {
      limitsCpu, limitsMemory, requestsCpu, requestsMemory, minCpu, maxCpu, minMemory, maxMemory, limitsGpu
    } = this.value;

    return {
      limitsCpu, limitsMemory, requestsCpu, requestsMemory, minCpu, maxCpu, minMemory, maxMemory, limitsGpu, viewMode: _VIEW
    };
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
        minCpu,
        maxCpu,
        minMemory,
        maxMemory,
        limitsGpu
      } = this;

      this.$emit('input', cleanUp({
        limitsCpu,
        limitsMemory,
        requestsCpu,
        requestsMemory,
        minCpu,
        maxCpu,
        minMemory,
        maxMemory,
        limitsGpu,
      }));
    },

    updateBeforeSave(value) {
      const {
        limitsCpu,
        limitsMemory,
        requestsCpu,
        requestsMemory,
        minCpu,
        maxCpu,
        minMemory,
        maxMemory,
        limitsGpu
      } = this;
      const namespace = this.namespace; // no deep copy in destructure proxy yet

      const out = cleanUp({
        limitsCpu,
        limitsMemory,
        requestsCpu,
        requestsMemory,
        minCpu,
        maxCpu,
        minMemory,
        maxMemory,
        limitsGpu,
      });

      if (namespace) {
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
          minCpu,
          maxCpu,
          minMemory,
          maxMemory,
          limitsGpu
        } = JSON.parse(defaults);

        this.limitsCpu = limitsCpu;
        this.limitsMemory = limitsMemory;
        this.requestsCpu = requestsCpu;
        this.requestsMemory = requestsMemory;
        this.minCpu = minCpu;
        this.maxCpu = maxCpu;
        this.minMemory = minMemory;
        this.maxMemory = maxMemory;
        this.limitsGpu = limitsGpu;
      }
    },
  }

};
</script>

<template>
  <div>
    <div class="row">
      <div v-if="showTip" class="col span-12">
        <p class="mb-10 helper-text">
          <t v-if="mode === viewMode" k="containerResourceLimit.helpTextDetail" />
          <t v-else k="containerResourceLimit.helpText" />
        </p>
      </div>
    </div>

    <div class="mb-20 row">
      <span class="col span-6">
        <UnitInput
          v-model="requestsCpu"
          :placeholder="t('containerResourceLimit.cpuPlaceholder')"
          :label="t('containerResourceLimit.requestsCpu')"
          :mode="mode"
          :input-exponent="-1"
          :output-modifier="true"
          :base-unit="t('suffix.cpus')"
          @input="updateLimits"
        />
      </span>
      <span class="col span-6">
        <UnitInput
          v-model="requestsMemory"
          :placeholder="t('containerResourceLimit.memPlaceholder')"
          :label="t('containerResourceLimit.requestsMemory')"
          :mode="mode"
          :input-exponent="2"
          :increment="1024"
          :output-modifier="true"
          @input="updateLimits"
        />
      </span>
    </div>

    <div class="mb-20 row">
      <span class="col span-6">
        <UnitInput
          v-model="limitsCpu"
          :placeholder="t('containerResourceLimit.cpuPlaceholder')"
          :label="t('containerResourceLimit.limitsCpu')"
          :mode="mode"
          :input-exponent="-1"
          :output-modifier="true"
          :base-unit="t('suffix.cpus')"
          @input="updateLimits"
        />
      </span>
      <span class="col span-6">
        <UnitInput
          v-model="limitsMemory"
          :placeholder="t('containerResourceLimit.memPlaceholder')"
          :label="t('containerResourceLimit.limitsMemory')"
          :mode="mode"
          :input-exponent="2"
          :increment="1024"
          :output-modifier="true"
          @input="updateLimits"
        />
      </span>
    </div>
    <div v-if="limitMinMaxValues" class="mb-20 row">
      <span class="col span-6">
        <UnitInput
          v-model="maxCpu"
          :placeholder="t('containerResourceLimit.cpuPlaceholder')"
          :label="t('containerResourceLimit.maxCpu')"
          :mode="mode"
          :input-exponent="-1"
          :output-modifier="true"
          :base-unit="t('suffix.cpus')"
          @input="updateLimits"
        />
      </span>
      <span class="col span-6">
        <UnitInput
          v-model="maxMemory"
          :placeholder="t('containerResourceLimit.memPlaceholder')"
          :label="t('containerResourceLimit.maxMemory')"
          :mode="mode"
          :input-exponent="2"
          :increment="1024"
          :output-modifier="true"
          @input="updateLimits"
        />
      </span>
    </div>
    <div v-if="limitMinMaxValues" class="row">
      <span class="col span-6">
        <UnitInput
          v-model="minCpu"
          :placeholder="t('containerResourceLimit.cpuPlaceholder')"
          :label="t('containerResourceLimit.minCpu')"
          :mode="mode"
          :input-exponent="-1"
          :output-modifier="true"
          :base-unit="t('suffix.cpus')"
          @input="updateLimits"
        />
      </span>
      <span class="col span-6">
        <UnitInput
          v-model="minMemory"
          :placeholder="t('containerResourceLimit.memPlaceholder')"
          :label="t('containerResourceLimit.minMemory')"
          :mode="mode"
          :input-exponent="2"
          :increment="1024"
          :output-modifier="true"
          @input="updateLimits"
        />
      </span>
    </div>
  </div>
</template>
