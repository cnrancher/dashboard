<script>
import { _MULTI } from '@shell/plugins/dashboard-store/actions';
import { MANAGEMENT, NORMAN } from '@shell/config/types';
import { SETTING } from '@shell/config/settings';
import Loading from '@shell/components/Loading';

export default {
  components: { Loading },
  name:       'Mfa',
  async fetch() {
    let twoFactorAuthConfig, user, pref;

    // Load settings.
    // For newer versions this will return all settings if you are somehow logged in,
    // and just the public ones if you aren't.
    try {
      const v3User = this.$store.getters['auth/v3User'];

      if (!v3User) {
        user = await this.$store.dispatch('rancher/findAll', {
          type: NORMAN.USER,
          opt:  { url: '/v3/users?me=true', load: _MULTI }
        });
      } else {
        user = [v3User];
      }

      pref = await this.$store.dispatch('management/request', { url: `/v1/userpreferences/${ user?.[0]?.id }`, method: 'GET' });
      twoFactorAuthConfig = this.$store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.TWO_FACTOR_AUTH_CONFIG);
    } catch (e) {
      // Older versions used Norman API to get these
      twoFactorAuthConfig = await this.$store.dispatch('rancher/find', {
        type: 'setting',
        id:   SETTING.TWO_FACTOR_AUTH_CONFIG,
        opt:  { url: `/v3/settings/${ SETTING.TWO_FACTOR_AUTH_CONFIG }` }
      });
    }
    if (twoFactorAuthConfig?.value === 'harden') {
      if (pref?.data?.['enable-two-factor-authenticator'] === 'true') {
        this.$router.replace({ name: 'auth-verify-mfa', query: { userId: user?.[0]?.id } });
      } else {
        this.$router.replace({ name: 'auth-regist-mfa', query: { userId: user?.[0]?.id } });
      }

      return;
    } else if (twoFactorAuthConfig?.value === 'true') {
      if (pref?.data?.['enable-two-factor-authenticator'] === 'true') {
        this.$router.replace({ name: 'auth-verify-mfa', query: { userId: user?.[0]?.id } });

        return;
      }
    }
    this.$router.replace('/');
  },

};
</script>
<template>
  <Loading />
</template>
