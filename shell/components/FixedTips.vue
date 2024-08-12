<template>
  <div
    v-if="showTips"
    class="fixed-tips"
  >
    {{ t('mfa.bindApp.bindAppTips.desc') }} <nuxt-link
      :to="{name: 'prefs'}"
    >
      {{ t('mfa.bindApp.bindAppTips.link') }}
    </nuxt-link>
  </div>
</template>
<script>
import { SETTING } from '@shell/config/settings';
import { MANAGEMENT } from '@shell/config/types';
import { mapPref, ENABLE_TWO_FACTOR_AUTH } from '@shell/store/prefs';
export default {
  data() {
    const twoFactorAuthConfig = this.$store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.TWO_FACTOR_AUTH_CONFIG);

    return { twoFactorAuthConfig };
  },
  computed: {
    enalbeTwoFactorAuth: mapPref(ENABLE_TWO_FACTOR_AUTH),
    showTips() {
      return this.twoFactorAuthConfig?.value === 'true' && this.enalbeTwoFactorAuth === false;
    }
  },

};
</script>
<style scoped>
.fixed-tips {
  background: var(--warning);
  line-height: 2em;
  text-align: center;
}
</style>
