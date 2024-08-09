<template>
  <div class="two-factor-auth">
    <h4 v-t="'prefs.twoFactorAuthConfig.label'" />
    <div class="two-factor-auth__header">
      <div>{{ t('mfa.methods.app') }}</div>
      <div>
        <button
          v-if="enabled && !edit"
          class="btn btn-sm role-secondary"
          :disable="force"
          @click="handleEdit"
        >
          {{ t('mfa.edit') }}
        </button>
        <button
          v-else-if="!enabled && !edit"
          class="btn btn-sm role-secondary"
          @click="handleEdit"
        >
          {{ t('mfa.enable') }}
        </button>
        <button
          v-else
          class="btn btn-sm role-secondary"
          @click="edit = false"
        >
          {{ t('generic.cancel') }}
        </button>
      </div>
    </div>
    <div v-if="edit">
      <div v-if="enabled === false">
        <BindApp :handle-enable-otp="handleEnableOtp" />
      </div>

      <div v-else-if="enabled === true">
        <button
          v-if="!showBindApp"
          class="btn btn-sm role-secondary mb-10"
          @click="handleRebindApp"
        >
          {{ t('mfa.bindApp.rebindApp') }}
        </button>
        <div v-if="!showBindApp">
          <RecoveryCode />
          <DisableTwoFactorAuth
            v-if="showDisableOtpButton"
            :user-id="userId"
            class="mt-10"
          />
        </div>
        <div v-else>
          <button
            v-if="showBindApp"
            class="btn btn-sm role-secondary mb-10"
            @click="showBindApp = false"
          >
            {{ t('mfa.bindApp.cancelRebindApp') }}
          </button>
          <BindApp :handle-enable-otp="handleEnableOtp" />
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import { ENABLE_TWO_FACTOR_AUTH } from '@shell/store/prefs';
import BindApp from './BindApp.vue';
import RecoveryCode from './RecoveryCode.vue';
import DisableTwoFactorAuth from './DisableTwoFactorAuth';
import { stringify } from '@shell/utils/error';
import { SETTING } from '@shell/config/settings';
import { MANAGEMENT } from '@shell/config/types';

export default {
  name:       'TwoFactorAuth',
  components: {
    BindApp, RecoveryCode, DisableTwoFactorAuth
  },
  props: {
    enabled: {
      type:    Boolean,
      default: false
    },
    force: {
      type:    Boolean,
      default: false
    },

  },
  data() {
    const twoFactorAuthConfig = this.$store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.TWO_FACTOR_AUTH_CONFIG);

    return {
      enalbeTwoFactorAuth: false, errors: [], loading: false, edit: false, showBindApp: false, twoFactorAuthConfig
    };
  },
  computed: {
    twoFactorAuthConfigOptions() {
      return this.$store.getters['prefs/options'](ENABLE_TWO_FACTOR_AUTH).map((value) => ({
        labelKey: `prefs.twoFactorAuthConfig.${ value }`,
        value
      }));
    },
    userId() {
      return this.$store.getters['auth/v3User']?.id ?? this.$route.query?.userId;
    },
    showDisableOtpButton() {
      return this.twoFactorAuthConfig?.value !== 'harden';
    }
  },
  watch: {
    enabled(v) {
      this.edit = v;
    }
  },
  methods: {
    handleRebindApp() {
      this.showBindApp = true;
    },
    handleEnableOtp() {
      this.showBindApp = false;
      this.$emit('on-enable-otp');
    },
    handleEdit() {
      this.edit = true;
    },
    handleCancel() {
      this.enalbeTwoFactorAuth = this.enabled;
    },
    async disableTwoFactorAuth() {
      try {
        await this.$store.dispatch('management/request', { url: `/v1/management.cattle.io.users/${ this.userId }?link=disableOTP`, method: 'get' });
      } catch (error) {
        this.errors = [stringify(error)];
      }
    }
  },

};
</script>
<style scoped>
.two-factor-auth {
  width: 400px;
}
.two-factor-auth__header {
  display: flex;
  justify-content: space-between;
}
</style>
