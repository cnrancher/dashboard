<template>
  <div>
    <div class="row mt-20">
      <div class="col span-6">
        <div class="mb-10">
          <p class="helper-text">
            <t k="gpuReservation.label"></t>
          </p>
        </div>
        <div class="mb-10">
          <RadioGroup
            v-model="gpuReservationMode"
            name="gpuReservationMode"
            :options="modeOptions"
            :labels="modeLabels"
          />
        </div>
        <template v-if="gpuReservationMode === 'shared'">
          <div>
            <UnitInput
              v-model="gpuShared"
              :suffix="t('gpuReservation.memUnit')"
              :placeholder="t('gpuReservation.placeholder')"
              :label="t('gpuReservation.shared')"
              min="1"
              :mode="mode"
              @input="updateGpuShared"
            />
            <Banner color="warning" :label="t('gpuReservation.sharedTips')" />
          </div>
        </template>
        <template v-else-if="gpuReservationMode === 'set'">
          <div>
            <UnitInput
              v-model="gpuSet"
              :suffix="t('gpuReservation.unit')"
              :placeholder="t('gpuReservation.placeholder')"
              :label="t('gpuReservation.set')"
              :mode="mode"
              min="1"
              @input="updateGpuSet"
            />
          </div>
        </template>
      </div>
      <div v-if="showVgpu" class="col span-6">
        <div class="mb-10">
          <p class="helper-text">
            <t k="vGpuReservation.label"></t>
          </p>
        </div>
        <UnitInput
          v-model="vGpus"
          :suffix="t('vGpuReservation.unit')"
          :placeholder="t('vGpuReservation.placeholder')"
          :label="t('vGpuReservation.set')"
          :mode="mode"
          min="1"
          @input="updateVgpus"
        />
      </div>
    </div>
  </div>
</template>
<script>
import RadioGroup from '@/components/form/RadioGroup';
import UnitInput from '@/components/form/UnitInput';
import Banner from '@/components/Banner';
import { _VIEW } from '@/config/query-params';
import { mapFeature, VIRTAITECH_GPU_SERVICE_UI } from '@/store/features';

export default {
  props: {
    mode: {
      type:     String,
      required: true,
    },
    value: {
      type:    Object,
      default: () => {
        return {};
      }
    },
  },
  data() {
    const {
      limitsGpuShared, limitsGpu, limitsVgpu, requestsGpuShared, requestsGpu
    } = this.value;
    let gpuReservationMode = null;

    if (limitsGpuShared && requestsGpuShared) {
      gpuReservationMode = 'shared';
    } else if (limitsGpu && requestsGpu) {
      gpuReservationMode = 'set';
    }

    return {
      gpuReservationMode,
      gpuReservationModeOptions: [
        {
          label: this.t('gpuReservation.shared'),
          value: 'shared',
        },
        {
          label: this.t('gpuReservation.set'),
          value: 'set',
        }
      ],
      gpuShared: null,
      gpuSet:    null,
      vGpus:     limitsVgpu,
    };
  },
  computed: {
    isView() {
      return this.mode === _VIEW;
    },
    showVgpu: mapFeature(VIRTAITECH_GPU_SERVICE_UI),
    modeOptions() {
      return this.gpuReservationModeOptions.reduce((t, c) => {
        t.push(c.value);

        return t;
      }, []);
    },
    modeLabels() {
      return this.gpuReservationModeOptions.reduce((t, c) => {
        t.push(c.label);

        return t;
      }, []);
    }
  },
  methods: {
    updateGpuShared(v) {
      this.$emit('input', {
        limitsGpuShared:   v,
        requestsGpuShared: v,
        limitsVgpu:        this.vGpus,
      });
    },
    updateGpuSet(v) {
      this.$emit('input', {
        limitsGpu:   v,
        requestsGpu: v,
        limitsVgpu:  this.vGpus,
      });
    },
    updateVgpus(v) {
      this.$emit('input', {
        limitsGpu:         this.gpuSet,
        requestsGpu:       this.gpuSet,
        limitsGpuShared:   this.gpuShared,
        requestsGpuShared: this.gpuShared,
        limitsVgpu:        v,
      });
    }
  },
  watch: {
    gpuReservationMode(m) {
      if (m === 'shared') {
        this.$emit('input', {
          limitsGpuShared:   this.gpuShared,
          requestsGpuShared: this.gpuShared,
          limitsVgpu:        this.vGpus,
        });
      } else if (m === 'set') {
        this.$emit('input', {
          limitsGpu:   this.gpuSet,
          requestsGpu: this.gpuSet,
          limitsVgpu:  this.vGpus,
        });
      }
    }
  },
  components: {
    RadioGroup,
    UnitInput,
    Banner,
  }
};
</script>
<style scoped>
</style>
