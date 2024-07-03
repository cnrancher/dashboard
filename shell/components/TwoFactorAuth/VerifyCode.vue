<template>
  <div
    class="verify-code__contnet"
  >
    <LabeledInput
      v-model="form.passCode"
      :label="t('mfa.code.label')"
      required
    />
    <AsyncButton
      :action-label="t('mfa.verify')"
      :waiting-label="t('mfa.validating')"
      :success-label="t('mfa.validated')"
      :error-label="t('asyncButton.default.error')"
      :disabled="loading"
      @click="verify"
    />
  </div>
</template>
<script>
import { LabeledInput } from '@components/Form/LabeledInput';
import AsyncButton from '@shell/components/AsyncButton';
import { stringify } from '@shell/utils/error';
import { MANAGEMENT } from '@shell/config/types';
import AESEncrypt from '@shell/utils/aes-encrypt';

import { SETTING } from '@shell/config/settings';

export default {
  components: { LabeledInput, AsyncButton },
  props:      {
    handleVerify: {
      type:    Function,
      default: null
    },
    isRecoveryCode: {
      type:    Boolean,
      default: false
    },
    isBind: {
      type:    Boolean,
      default: false
    }
  },
  data() {
    const disabledEncryption = this.$store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.DISABLE_PASSWORD_ENCRYPT);

    return {
      loading: false,
      errors:  [],
      form:    {
        passCode:     '',
        recoveryCode: '',
        ttlMillis:    0
      },
      disabledEncryption

    };
  },
  methods: {
    validate() {
      if (this.form.passCode?.trim() === '') {
        this.errors = [this.t('mfa.errors.codeRequired')];

        return false;
      }

      return true;
    },
    async verify(buttonCb) {
      if (!this.validate()) {
        buttonCb(false);
        this.$emit('on-errors', [...this.errors]);

        return;
      }
      this.loading = true;
      const userId = this.$store.getters['auth/v3User']?.id ?? this.$route.query?.userId;
      const data = { ...this.form };

      if (this.isRecoveryCode) {
        data.recoveryCode = this.encryptCode(data.passCode);
        data.passCode = '';
      }
      if (this.isBind) {
        data.bind = true;
      }
      try {
        const s = await this.$store.dispatch('management/find', { type: MANAGEMENT.SETTING, id: 'auth-user-otp-session-ttl-minutes' });

        const v = s?.value;

        if (v) {
          data.ttlMillis = (parseInt(v) ?? 0) * 60 * 1000;
        }

        if (typeof this.handleVerify === 'function') {
          await this.handleVerify({
            userId, ...data, passCode: data.passCode || data.recoveryCode
          });
        } else {
          await this.$store.dispatch('management/request', {
            url: `/v1/management.cattle.io.users/${ userId }?action=verifyCode`, method: 'POST', data, redirectUnauthorized: false
          });
        }

        buttonCb(true);
        this.$emit('on-done');
      } catch (err) {
        this.errors = [stringify(err)];
        this.$emit('on-errors', [stringify(err)]);
        buttonCb(false);
      }

      this.loading = false;
    },
    encryptCode(code) {
      if (this.disabledEncryption?.value === 'true') {
        return code;
      }

      return AESEncrypt(code);
    },
  }
};
</script>
<style scoped>
.verify-code__contnet {
  width: 200px; display: grid; justify-items: center; gap: 8px;
}
</style>
