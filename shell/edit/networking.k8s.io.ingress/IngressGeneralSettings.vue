<template>
  <div>
    <h3>
      {{ t('ingress.formIngressGeneralSetting.title') }}
      <i
        v-clean-tooltip="t('ingress.formIngressGeneralSetting.detail')"
        class="icon icon-info"
      />
    </h3>
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledInput
          v-model="permanentRedirect"
          :label="t('ingress.formIngressGeneralSetting.permanentRedirect.title')"
          :placeholder="t('ingress.formIngressGeneralSetting.permanentRedirect.placeholder')"
          :tooltip="t('ingress.formIngressGeneralSetting.permanentRedirect.detail')"
          :mode="mode"
        />
      </div>
      <div class="col span-6">
        <LabeledInput
          v-model.number="permanentRedirectCode"
          type="number"
          min="0"
          :label="t('ingress.formIngressGeneralSetting.permanentRedirectCode.title')"
          :placeholder="t('ingress.formIngressGeneralSetting.permanentRedirectCode.placeholder')"
          :tooltip="t('ingress.formIngressGeneralSetting.permanentRedirectCode.detail')"
          :mode="mode"
        />
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-6">
        <RadioGroup
          v-model="sslRedirect"
          :label="t('ingress.formIngressGeneralSetting.sslRedirect.title')"
          name="sslRedirect"
          :options="sslRedirectOptions"
          :mode="mode"
        />
      </div>
      <div class="col span-3">
        <RadioGroup
          v-model="proxyBuffering"
          :label="t('ingress.formIngressGeneralSetting.proxyBuffering.title')"
          name="proxyBuffering"
          :options="proxyBufferingOptions"
          :mode="mode"
        />
      </div>
      <div
        v-if="proxyBuffering === 'on'"
        class="col span-3"
        style="align-self: flex-end;"
      >
        <LabeledInput
          v-model.number="proxyBufferSize"
          type="number"
          min="0"
          :label="t('ingress.formIngressGeneralSetting.proxyBufferSize.title')"
          :placeholder="t('ingress.formIngressGeneralSetting.proxyBufferSize.placeholder')"
          :mode="mode"
        />
      </div>
    </div>
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledInput
          v-model="whitelistSourceRange"
          :label="t('ingress.formIngressGeneralSetting.whitelist.title')"
          :placeholder="t('ingress.formIngressGeneralSetting.whitelist.placeholder')"
          :tooltip="t('ingress.formIngressGeneralSetting.whitelist.detail')"
          :mode="mode"
        />
      </div>
      <div class="col span-6">
        <LabeledInput
          v-model.number="limitRps"
          type="number"
          min="0"
          :label="t('ingress.formIngressGeneralSetting.limitRps.title')"
          :placeholder="t('ingress.formIngressGeneralSetting.limitRps.placeholder')"
          :tooltip="t('ingress.formIngressGeneralSetting.limitRps.detail')"
          :mode="mode"
        />
      </div>
    </div>
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledInput
          v-model.number="proxyBodySize"
          type="number"
          min="0"
          :label="t('ingress.formIngressGeneralSetting.proxyBodySize.title')"
          :mode="mode"
          :placeholder="t('ingress.formIngressGeneralSetting.proxyBodySize.placeholder')"
          :tooltip="t('ingress.formIngressGeneralSetting.proxyBodySize.detail')"
        />
      </div>
      <div class="col span-6">
        <LabeledInput
          v-model="rewriteTarget"
          :label="t('ingress.formIngressGeneralSetting.rewriteTarget.title')"
          :placeholder="t('ingress.formIngressGeneralSetting.rewriteTarget.placeholder')"
          :tooltip="t('ingress.formIngressGeneralSetting.rewriteTarget.detail')"
          :mode="mode"
        />
      </div>
    </div>
  </div>
</template>
<script>
import { RadioGroup } from '@components/Form/Radio';
import { LabeledInput } from '@components/Form/LabeledInput';
const REWRITE_TARGET = 'nginx.ingress.kubernetes.io/rewrite-target';
const SSL_REDIRECT = 'nginx.ingress.kubernetes.io/ssl-redirect';
const PROXY_BUFFERING = 'nginx.ingress.kubernetes.io/proxy-buffering';
const PROXY_BUFFER_SIZE = 'nginx.ingress.kubernetes.io/proxy-buffer-size';
const WHITELIST_SOURCE_RANGE = 'nginx.ingress.kubernetes.io/whitelist-source-range';
const PERMANENT_REDIRECT = 'nginx.ingress.kubernetes.io/permanent-redirect';
const PERMANENT_REDIRECT_CODE = 'nginx.ingress.kubernetes.io/permanent-redirect-code';
const PROXY_BODY_SIZE = 'nginx.ingress.kubernetes.io/proxy-body-size';
const LIMIT_RPS = 'nginx.ingress.kubernetes.io/limit-rps';

export default {
  components: {
    LabeledInput,
    RadioGroup,
  },
  props: {
    value: {
      type:    Object,
      default: () => {
        return {};
      },
    },
    mode: {
      type:    String,
      default: 'edit'
    },
  },
  computed: {
    sslRedirectOptions() {
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
    proxyBufferingOptions() {
      return [
        {
          label: this.t('generic.enabled'),
          value: 'on'
        },
        {
          label: this.t('generic.disable'),
          value: 'off'
        }
      ];
    },
    rewriteTarget: {
      get() {
        return this.value?.metadata?.annotations?.[REWRITE_TARGET];
      },
      set(v) {
        if (!this.value?.metadata?.annotations) {
          this.$set(this.value.metadata, 'annotations', {});
        }
        if (!v?.trim()) {
          this.$delete(this.value?.metadata?.annotations, REWRITE_TARGET);
        } else {
          this.$set(this.value.metadata.annotations, REWRITE_TARGET, v);
        }
      }
    },
    sslRedirect: {
      get() {
        return this.value?.metadata?.annotations?.[SSL_REDIRECT] ?? 'true';
      },
      set(v) {
        if (!this.value?.metadata?.annotations) {
          this.$set(this.value.metadata, 'annotations', {});
        }
        if (!v?.trim() === 'false') {
          this.$delete(this.value.metadata.annotations, SSL_REDIRECT);
        } else {
          this.$set(this.value.metadata.annotations, SSL_REDIRECT, v);
        }
      }
    },
    proxyBuffering: {
      get() {
        return this.value?.metadata?.annotations?.[PROXY_BUFFERING] ?? 'off';
      },
      set(v) {
        if (!this.value?.metadata?.annotations) {
          this.$set(this.value.metadata, 'annotations', {});
        }
        if (!v?.trim() === 'off') {
          this.$delete(this.value.metadata.annotations, PROXY_BUFFERING);
          this.$delete(this.value.metadata.annotations, PROXY_BUFFER_SIZE);
        } else {
          this.$set(this.value.metadata.annotations, PROXY_BUFFERING, v);
        }
      }
    },
    proxyBufferSize: {
      get() {
        return parseFloat(this.value?.metadata?.annotations?.[PROXY_BUFFER_SIZE], 10) ?? null;
      },
      set(v) {
        if (!this.value?.metadata?.annotations) {
          this.$set(this.value.metadata, 'annotations', {});
        }
        this.$set(this.value.metadata.annotations, PROXY_BUFFER_SIZE, `${ v }k`);
      }
    },
    whitelistSourceRange: {
      get() {
        return this.value?.metadata?.annotations?.[WHITELIST_SOURCE_RANGE];
      },
      set(v) {
        if (!this.value?.metadata?.annotations) {
          this.$set(this.value.metadata, 'annotations', {});
        }
        if (!v?.trim()) {
          this.$delete(this.value?.metadata?.annotations, WHITELIST_SOURCE_RANGE);
        } else {
          this.$set(this.value.metadata.annotations, WHITELIST_SOURCE_RANGE, v);
        }
      }
    },
    permanentRedirect: {
      get() {
        return this.value?.metadata?.annotations?.[PERMANENT_REDIRECT];
      },
      set(v) {
        if (!this.value?.metadata?.annotations) {
          this.$set(this.value.metadata, 'annotations', {});
        }
        if (!v?.trim()) {
          this.$delete(this.value?.metadata?.annotations, PERMANENT_REDIRECT);
        } else {
          this.$set(this.value.metadata.annotations, PERMANENT_REDIRECT, v);
        }
      }
    },
    permanentRedirectCode: {
      get() {
        return this.value?.metadata?.annotations?.[PERMANENT_REDIRECT_CODE];
      },
      set(v) {
        if (!this.value?.metadata?.annotations) {
          this.$set(this.value.metadata, 'annotations', {});
        }
        if (!v) {
          this.$delete(this.value?.metadata?.annotations, PERMANENT_REDIRECT_CODE);
        } else {
          this.$set(this.value.metadata.annotations, PERMANENT_REDIRECT_CODE, `${ v }`);
        }
      }
    },
    proxyBodySize: {
      get() {
        return parseFloat(this.value?.metadata?.annotations?.[PROXY_BODY_SIZE], 10) ?? null;
      },
      set(v) {
        if (!this.value?.metadata?.annotations) {
          this.$set(this.value.metadata, 'annotations', {});
        }
        if (!v) {
          this.$delete(this.value?.metadata?.annotations, PROXY_BODY_SIZE);
        } else {
          this.$set(this.value.metadata.annotations, PROXY_BODY_SIZE, `${ v }m`);
        }
      }
    },
    limitRps: {
      get() {
        return this.value?.metadata?.annotations?.[LIMIT_RPS];
      },
      set(v) {
        if (!this.value?.metadata?.annotations) {
          this.$set(this.value.metadata, 'annotations', {});
        }
        if (!v) {
          this.$delete(this.value?.metadata?.annotations, LIMIT_RPS);
        } else {
          this.$set(this.value.metadata.annotations, LIMIT_RPS, `${ v }`);
        }
      }
    }
  },
  methods: {
    validate() {
      if (!this.whitelistSourceRange) {
        return [];
      }
      const cidrIPV4RegExp = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/\d{1,2}$/;
      const IPV4RegExp = /^((2[0-4]\d|25[0-5]|[01]?\d\d?)\.){3}(2[0-4]\d|25[0-5]|[01]?\d\d?)$/;
      const whitelist = this.whitelistSourceRange.split(',');

      if (whitelist.some(item => !cidrIPV4RegExp.test(item) && !IPV4RegExp.test(item))) {
        return [this.t('ingress.formIngressGeneralSetting.whitelist.formalError')];
      }

      return [];
    }
  }
};
</script>
