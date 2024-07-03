<script>
import BrandImage from '@shell/components/BrandImage';
import { Banner } from '@components/Banner';
import { mapGetters } from 'vuex';
import { _ALL_IF_AUTHED, _MULTI } from '@shell/plugins/dashboard-store/actions';
import { MANAGEMENT, NORMAN } from '@shell/config/types';
import { SETTING } from '@shell/config/settings';

import {
  getBrand,
  getVendor,
  getProduct,
  setBrand,
  setVendor
} from '@shell/config/private-label';
import loadPlugins from '@shell/plugins/plugin';
import VerifyCode from '@shell/components/TwoFactorAuth/VerifyCode.vue';
import { stringify } from '@shell/utils/error';
import { Checkbox } from '@components/Form/Checkbox';

export default {
  name:       'VerfyMFA',
  layout:     'unauthenticated',
  components: {
    BrandImage, Banner, VerifyCode, Checkbox
  },

  async asyncData({ route, redirect, store }) {
    let firstLoginSetting, uiLoginLandscape, plSetting, brand, user;

    try {
      await store.dispatch('management/findAll', {
        type: MANAGEMENT.SETTING,
        opt:  {
          load: _ALL_IF_AUTHED, url: `/v1/${ MANAGEMENT.SETTING }`, redirectUnauthorized: false
        },
      });
      user = await this.$store.dispatch('rancher/findAll', {
        type: NORMAN.USER,
        opt:  { url: '/v3/users?me=true', load: _MULTI }
      });

      if (!!user?.[0]) {
        this.$store.dispatch('auth/gotUser', user[0]);
      }
      firstLoginSetting = store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.FIRST_LOGIN);
      plSetting = store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.PL);
      brand = store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.BRAND);
    } catch (e) {
      // Older versions used Norman API to get these
      firstLoginSetting = await store.dispatch('rancher/find', {
        type: 'setting',
        id:   SETTING.FIRST_LOGIN,
        opt:  { url: `/v3/settings/${ SETTING.FIRST_LOGIN }` }
      });
      plSetting = await store.dispatch('rancher/find', {
        type: 'setting',
        id:   SETTING.PL,
        opt:  { url: `/v3/settings/${ SETTING.PL }` }
      });
      brand = await store.dispatch('rancher/find', {
        type: 'setting',
        id:   SETTING.BRAND,
        opt:  { url: `/v3/settings/${ SETTING.BRAND }` }
      });
    }
    if (plSetting.value?.length && plSetting.value !== getVendor()) {
      setVendor(plSetting.value);
    }

    if (brand?.value?.length && brand.value !== getBrand()) {
      setBrand(brand.value);
    }

    return {
      vendor:           getVendor(),
      firstLogin:       firstLoginSetting?.value === 'true',
      user,
      uiLoginLandscape: uiLoginLandscape?.value,
      isRecoveryCode:   false
    };
  },

  data() {
    return {
      product: getProduct(), user: [], firstLogin: false, errors: []
    };
  },

  computed: { ...mapGetters({ t: 'i18n/t' }) },

  methods: {
    displayName(provider) {
      return this.t(`model.authConfig.provider.${ provider }`);
    },

    back() {
      this.$router.replace('/auth/login');
    },

    async handleDone() {
      if (this.isRecoveryCode) {
        this.$router.replace({ name: 'auth-regist-mfa', query: { userId: this.user?.[0]?.id ?? this.$route.query?.userId } });

        return;
      }
      try {
        await loadPlugins({
          app:     this.$store.app,
          store:   this.$store,
          $plugin: this.$store.$plugin
        });
      } catch (error) {

      }

      this.$router.replace('/');
    },
    handleErrors(errors) {
      this.errors = errors.map((e) => stringify(e));
    }

  }
};
</script>

<template>
  <main class="main-layout login">
    <div class="row gutless mb-20">
      <div class="col span-6 p-20">
        <p class="text-center">
          {{ t('login.howdy') }}
        </p>
        <h1 class="text-center login-welcome">
          {{ t('login.welcome', {vendor}) }}
        </h1>

        <div class="veriry-code mt-20">
          <VerifyCode
            :is-recovery-code="isRecoveryCode"
            @on-done="handleDone"
            @on-errors="handleErrors"
          />
        </div>
        <div class="text-center mt-20">
          <Checkbox
            v-model="isRecoveryCode"
            :label="t('mfa.recoveryCode.label')"
            type="checkbox"
          />
        </div>
        <Banner
          v-for="e in errors"
          :key="e"
          :label="e"
          color="error"
        />

        <div
          class="mt-20 text-center"
        >
          <a
            role="button"
            @click="back"
          >
            {{ t('mfa.back') }}
          </a>
        </div>
      </div>
      <img
        v-if="uiLoginLandscape"
        :src="uiLoginLandscape"
        class="col span-6 landscape"
      >
      <BrandImage
        v-else
        class="col span-6 landscape"
        file-name="login-landscape.svg"
      />
    </div>
  </main>
</template>

<style lang="scss" scoped>
  .veriry-code {
    display: grid;
    justify-items: center;
  }
  .login {
    overflow: hidden;

    .row {
      align-items: center;
    }

    .landscape {
      height: 100vh;
      margin: 0;
      object-fit: cover;
    }

    .login-welcome {
      margin: 0
    }
  }

  .gutless {
    height: 100vh;
    & > .span-6 {
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      height: 100%;
      place-content: center;
    }
  }

</style>
