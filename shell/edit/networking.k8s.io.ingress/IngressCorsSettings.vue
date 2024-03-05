<template>
  <div>
    <h3>
      {{ t('ingress.formIngressCorsSetting.title') }}
      <i
        v-clean-tooltip="t('ingress.formIngressCorsSetting.detail')"
        class="icon icon-info"
      />
    </h3>
    <div class="row mb-20">
      <div class="col span-6">
        <RadioGroup
          v-model="enableCors"
          name="enableCors"
          :options="enableCorsOptions"
          :mode="mode"
        />
      </div>
      <div
        v-if="enableCors === 'true'"
        class="col span-6"
      >
        <h3>
          {{ t('ingress.formIngressCorsSetting.corsAllowMethod.title') }} <span class="required">*</span>
        </h3>
        <Checkbox
          v-for="opt in corsAllowMethodsOptions"
          :key="opt.value"
          v-model="corsAllowMethods"
          :mode="mode"
          :label="opt.label"
          :value-when-true="opt.value"
        />
      </div>
    </div>
    <div
      v-if="enableCors === 'true'"
      class="row mb-20"
    >
      <div class="col span-6">
        <LabeledInput
          v-model="corsAllowHeaders"
          :label="t('ingress.formIngressCorsSetting.corsAllowHeader.title')"
          :placeholder="t('ingress.formIngressCorsSetting.corsAllowHeader.placeholder')"
          :tooltip="t('ingress.formIngressCorsSetting.corsAllowHeader.detail')"
          :mode="mode"
        />
      </div>
      <div class="col span-6">
        <LabeledInput
          v-model="corsExposeHeaders"
          :label="t('ingress.formIngressCorsSetting.corsExposeHeader.title')"
          :placeholder="t('ingress.formIngressCorsSetting.corsExposeHeader.placeholder')"
          :tooltip="t('ingress.formIngressCorsSetting.corsExposeHeader.detail')"
          :mode="mode"
        />
      </div>
    </div>
    <div
      v-if="enableCors === 'true'"
      class="row mb-20"
    >
      <div class="col span-6">
        <LabeledInput
          v-model="corsAllowOrigin"
          :label="t('ingress.formIngressCorsSetting.corsAllowOrigin.title')"
          :placeholder="t('ingress.formIngressCorsSetting.corsAllowOrigin.placeholder')"
          :tooltip="t('ingress.formIngressCorsSetting.corsAllowOrigin.detail')"
          :mode="mode"
        />
      </div>
      <div class="col span-6">
        <RadioGroup
          v-model="corsAllowCredentials"
          :label="t('ingress.formIngressCorsSetting.corsAllowCredential.title')"
          name="corsAllowCredentials"
          :options="enableAllowCredentialsOptions"
          :mode="mode"
        />
      </div>
    </div>
    <div
      v-if="enableCors === 'true'"
      class="row"
    >
      <div class="col span-6">
        <LabeledInput
          v-model.number="corsMaxAge"
          type="number"
          :label="t('ingress.formIngressCorsSetting.corsMaxAge.title')"
          :placeholder="t('ingress.formIngressCorsSetting.corsMaxAge.placeholder')"
          :mode="mode"
        />
      </div>
    </div>
  </div>
</template>
<script>
import { RadioGroup } from '@components/Form/Radio';
import { LabeledInput } from '@components/Form/LabeledInput';
import { Checkbox } from '@components/Form/Checkbox';
const ENABLE_CORS = 'nginx.ingress.kubernetes.io/enable-cors';
const CORS_ALLOW_METHODS = 'nginx.ingress.kubernetes.io/cors-allow-methods';
const CORS_ALLOW_HEADERS = 'nginx.ingress.kubernetes.io/cors-allow-headers';
const CORS_EXPOSE_HEADERS = 'nginx.ingress.kubernetes.io/cors-expose-headers';
const CORS_ALLOW_ORIGIN = 'nginx.ingress.kubernetes.io/cors-allow-origin';
const CORS_ALLOW_CREDENTIALS = 'nginx.ingress.kubernetes.io/cors-allow-credentials';
const CORS_MAX_AGE = 'nginx.ingress.kubernetes.io/cors-max-age';

export default {
  components: {
    RadioGroup,
    LabeledInput,
    Checkbox
  },
  props: {
    value: {
      type:     Object,
      required: true,
    },
    mode: {
      type:    String,
      default: 'edit'
    },
  },
  data() {
    const corsAllowMethodsOptions = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'].map(m => ({ label: m, value: m }));

    return { corsAllowMethodsOptions };
  },
  computed: {
    enableCorsOptions() {
      return [
        {
          label: this.t('generic.enabled'),
          value: 'true'
        },
        {
          label: this.t('generic.disable'),
          value: 'false'
        }
      ];
    },
    enableCors: {
      get() {
        return this.value?.metadata?.annotations?.[ENABLE_CORS] ?? 'false';
      },
      set(v) {
        if (!this.value?.metadata?.annotations) {
          this.$set(this.value.metadata, 'annotations', {});
        }
        if (v === 'false') {
          this.$delete(this.value.metadata.annotations, ENABLE_CORS);
          this.$delete(this.value.metadata.annotations, CORS_ALLOW_METHODS);
          this.$delete(this.value.metadata.annotations, CORS_ALLOW_HEADERS);
          this.$delete(this.value.metadata.annotations, CORS_EXPOSE_HEADERS);
          this.$delete(this.value.metadata.annotations, CORS_ALLOW_ORIGIN);
          this.$delete(this.value.metadata.annotations, CORS_ALLOW_CREDENTIALS);
          this.$delete(this.value.metadata.annotations, CORS_MAX_AGE);
        } else {
          this.$set(this.value.metadata.annotations, ENABLE_CORS, v);
        }
      }
    },
    corsAllowMethods: {
      get() {
        return this.value?.metadata?.annotations?.[CORS_ALLOW_METHODS]?.split(',').map(m => m?.trim() ) ?? [];
      },
      set(v) {
        if (!this.value?.metadata?.annotations) {
          this.$set(this.value.metadata, 'annotations', {});
        }
        if (v?.length === 0) {
          this.$delete(this.value.metadata.annotations, CORS_ALLOW_METHODS);
        } else {
          this.$set(this.value.metadata.annotations, CORS_ALLOW_METHODS, v.join(','));
        }
      }
    },
    corsAllowHeaders: {
      get() {
        return this.value?.metadata?.annotations?.[CORS_ALLOW_HEADERS] ?? '';
      },
      set(v) {
        if (!this.value?.metadata?.annotations) {
          this.$set(this.value.metadata, 'annotations', {});
        }
        if (v?.trim() === '') {
          this.$delete(this.value.metadata.annotations, CORS_ALLOW_HEADERS);
        } else {
          this.$set(this.value.metadata.annotations, CORS_ALLOW_HEADERS, v);
        }
      }
    },
    corsExposeHeaders: {
      get() {
        return this.value?.metadata?.annotations?.[CORS_EXPOSE_HEADERS] ?? '';
      },
      set(v) {
        if (!this.value?.metadata?.annotations) {
          this.$set(this.value.metadata, 'annotations', {});
        }
        if (v?.trim() === '') {
          this.$delete(this.value.metadata.annotations, CORS_EXPOSE_HEADERS);
        } else {
          this.$set(this.value.metadata.annotations, CORS_EXPOSE_HEADERS, v);
        }
      }
    },
    corsAllowOrigin: {
      get() {
        return this.value?.metadata?.annotations?.[CORS_ALLOW_ORIGIN] ?? '';
      },
      set(v) {
        if (!this.value?.metadata?.annotations) {
          this.$set(this.value.metadata, 'annotations', {});
        }
        if (v?.trim() === '') {
          this.$delete(this.value.metadata.annotations, CORS_ALLOW_ORIGIN);
        } else {
          this.$set(this.value.metadata.annotations, CORS_ALLOW_ORIGIN, v);
        }
      }
    },
    enableAllowCredentialsOptions() {
      return [
        {
          label: this.t('generic.enabled'),
          value: 'true'
        },
        {
          label: this.t('generic.disable'),
          value: 'false'
        }
      ];
    },
    corsAllowCredentials: {
      get() {
        return this.value?.metadata?.annotations?.[CORS_ALLOW_CREDENTIALS] ?? 'true';
      },
      set(v) {
        if (!this.value?.metadata?.annotations) {
          this.$set(this.value.metadata, 'annotations', {});
        }
        if (v?.trim() === 'true') {
          this.$delete(this.value.metadata.annotations, CORS_ALLOW_CREDENTIALS);
        } else {
          this.$set(this.value.metadata.annotations, CORS_ALLOW_CREDENTIALS, v);
        }
      }
    },
    corsMaxAge: {
      get() {
        return this.value?.metadata?.annotations?.[CORS_MAX_AGE] ?? null;
      },
      set(v) {
        if (!this.value?.metadata?.annotations) {
          this.$set(this.value.metadata, 'annotations', {});
        }
        if (!v) {
          this.$delete(this.value.metadata.annotations, CORS_MAX_AGE);
        } else {
          this.$set(this.value.metadata.annotations, CORS_MAX_AGE, v);
        }
      }
    }
  },
  methods: {
    validate() {
      if (this.enableCors === 'false') {
        return [];
      }
      if (this.corsAllowMethods.length === 0) {
        return [this.t('ingress.formIngressCorsSetting.corsAllowMethod.required')];
      }

      return [];
    }
  }
};
</script>
<style scoped>
.required {
  color: var(--error);
}
</style>
