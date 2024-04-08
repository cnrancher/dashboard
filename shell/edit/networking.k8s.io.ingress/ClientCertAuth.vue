<template>
  <div>
    <h3>
      {{ t('ingress.formSslClientAuth.title') }}
      <i
        v-clean-tooltip="t('ingress.formSslClientAuth.detail')"
        class="icon icon-info"
      />
    </h3>
    <div class="row mb-20">
      <div class="col span-6">
        <RadioGroup
          v-model="authTlsVerifyClient"
          name="authTlsVerifyClient"
          :options="authTlsVerifyClientOptions"
          :mode="mode"
          @input="authTlsVerifyClientChanged"
        />
      </div>
      <div
        v-if="authTlsVerifyClient !== 'off'"
        class="col span-6"
      >
        <LabeledSelect
          v-model="authTlsSecret"
          :options="certsOptions"
          :label="t('ingress.formSslClientAuth.secret.title')"
          required
          :tooltip="t('ingress.formSslClientAuth.secret.detail')"
          :hover-tooltip="true"
          :searchable="true"
        />
      </div>
    </div>
    <div
      v-if="authTlsVerifyClient !== 'off'"
      class="row"
    >
      <div class="col span-6">
        <LabeledInput
          v-model.number="authTlsVerifyDepth"
          type="number"
          :label="t('ingress.formSslClientAuth.depth.title')"
          :placeholder="t('ingress.formSslClientAuth.depth.placeholder')"
          :tooltip="t('ingress.formSslClientAuth.depth.detail')"
          :mode="mode"
        />
      </div>
      <div class="col span-6">
        <LabeledInput
          v-model="authTlsErrorPage"
          :label="t('ingress.formSslClientAuth.errorPage.title')"
          :placeholder="t('ingress.formSslClientAuth.errorPage.placeholder')"
          :tooltip="t('ingress.formSslClientAuth.errorPage.detail')"
          :mode="mode"
        />
      </div>
    </div>
  </div>
</template>
<script>
import { RadioGroup } from '@components/Form/Radio';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { LabeledInput } from '@components/Form/LabeledInput';

const AUTH_TLS_VERIFY_CLIENT = 'nginx.ingress.kubernetes.io/auth-tls-verify-client';
const AUTH_TLS_SECRET = 'nginx.ingress.kubernetes.io/auth-tls-secret';
const AUTH_TLS_ERROR_PAGE = 'nginx.ingress.kubernetes.io/auth-tls-error-page';
const AUTH_TLS_VERIFY_DEPTH = 'nginx.ingress.kubernetes.io/auth-tls-verify-depth';

export default {
  props: {
    value: {
      type:    Object,
      default: () => {
        return {};
      },
    },
    namespaceSecrets: {
      type:    Array,
      default: () => [],
    },
    mode: {
      type:    String,
      default: 'edit'
    },
  },
  components: {
    RadioGroup, LabeledSelect, LabeledInput
  },
  data() {
    return {
      authTlsVerifyClientOptions: [
        {
          label: this.t('ingress.formSslClientAuth.strategy.off'),
          value: 'off'
        },
        {
          label: this.t('ingress.formSslClientAuth.strategy.on'),
          value: 'on'
        },
        {
          label: this.t('ingress.formSslClientAuth.strategy.optional'),
          value: 'optional'
        },
        {
          label: this.t('ingress.formSslClientAuth.strategy.optionalNoCA'),
          value: 'optional_no_ca'
        }
      ]
    };
  },
  computed: {
    authTlsVerifyClient: {
      get() {
        return this.value?.metadata?.annotations?.[AUTH_TLS_VERIFY_CLIENT] ?? 'off';
      },
      set(v) {
        if (!this.value?.metadata?.annotations) {
          this.$set(this.value.metadata, 'annotations', {});
        }
        if (!v?.trim()) {
          this.$delete(this.value.metadata.annotations, AUTH_TLS_VERIFY_CLIENT);
        } else {
          this.$set(this.value.metadata.annotations, AUTH_TLS_VERIFY_CLIENT, v);
        }
      }
    },
    authTlsSecret: {
      get() {
        return this.value?.metadata?.annotations?.[AUTH_TLS_SECRET] ?? null;
      },
      set(v) {
        if (!this.value?.metadata?.annotations) {
          this.$set(this.value.metadata, 'annotations', {});
        }
        if (!v?.trim()) {
          this.$delete(this.value.metadata.annotations, AUTH_TLS_SECRET);
        } else {
          this.$set(this.value.metadata.annotations, AUTH_TLS_SECRET, v);
        }
      }
    },
    authTlsVerifyDepth: {
      get() {
        return this.value?.metadata?.annotations?.[AUTH_TLS_VERIFY_DEPTH] ?? 1;
      },
      set(v) {
        if (!this.value?.metadata?.annotations) {
          this.$set(this.value.metadata, 'annotations', {});
        }
        if (!v) {
          this.$delete(this.value.metadata.annotations, AUTH_TLS_VERIFY_DEPTH);
        } else {
          this.$set(this.value.metadata.annotations, AUTH_TLS_VERIFY_DEPTH, v);
        }
      }
    },
    certsOptions() {
      return this.namespaceSecrets.filter((item) => !!item?.data?.['ca.crt']).map((c) => ({
        value: c.id,
        label: `${ c.metadata.name }(${ c.metadata.namespace })`
      }));
    },
    authTlsErrorPage: {
      get() {
        return this.value?.metadata?.annotations?.[AUTH_TLS_ERROR_PAGE];
      },
      set(v) {
        if (!this.value?.metadata?.annotations) {
          this.$set(this.value.metadata, 'annotations', {});
        }
        if (!v?.trim()) {
          this.$delete(this.value.metadata.annotations, AUTH_TLS_ERROR_PAGE);
        } else {
          this.$set(this.value.metadata.annotations, AUTH_TLS_ERROR_PAGE, v);
        }
      }
    },
  },
  methods: {
    authTlsVerifyClientChanged(v) {
      if (v === 'off') {
        [AUTH_TLS_VERIFY_CLIENT, AUTH_TLS_SECRET, AUTH_TLS_ERROR_PAGE, AUTH_TLS_VERIFY_DEPTH].forEach((k) => {
          this.$delete(this.value.metadata.annotations, k);
        });
      }
    },
    validate() {
      if (this.authTlsVerifyClient === 'off') {
        return [];
      }
      if (!this.authTlsSecret) {
        return [this.t('ingress.formSslClientAuth.secret.required')];
      }

      return [];
    }
  }
};
</script>
<style scoped></style>
