<script>
import BrandImage from '@shell/components/BrandImage';
import { mapGetters } from 'vuex';
import { _MULTI } from '@shell/plugins/dashboard-store/actions';
import { MANAGEMENT, NORMAN } from '@shell/config/types';
import BindApp from '@shell/components/TwoFactorAuth/BindApp.vue';
import { SETTING } from '@shell/config/settings';
import loadPlugins from '@shell/plugins/plugin';
import { LOGGED_OUT } from '@shell/config/query-params';

import {
  getBrand,
  getVendor,
  getProduct,
  setBrand,
  setVendor

} from '@shell/config/private-label';

export default {
  name:       'RegistMFA',
  components: { BrandImage, BindApp },

  async fetch() {
    let uiLoginLandscape, plSetting, brand, user;

    try {
      await this.$store.dispatch('management/findAll', {
        type: MANAGEMENT.SETTING,
        opt:  { url: `/v1/${ MANAGEMENT.SETTING }`, redirectUnauthorized: false },
      });

      const v3User = this.$store.getters['auth/v3User'];

      if (!v3User) {
        user = await this.$store.dispatch('rancher/findAll', {
          type: NORMAN.USER,
          opt:  { url: '/v3/users?me=true', load: _MULTI }
        });
      } else {
        user = [v3User];
      }

      plSetting = this.$store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.PL);
      brand = this.$store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.BRAND);
    } catch (e) {
      // Older versions used Norman API to get these
      plSetting = await this.$store.dispatch('rancher/find', {
        type: 'setting',
        id:   SETTING.PL,
        opt:  { url: `/v3/settings/${ SETTING.PL }` }
      });
      brand = await this.$store.dispatch('rancher/find', {
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

    this.vendor = getVendor();
    this.user = user;
    this.uiLoginLandscape = uiLoginLandscape?.value;
  },

  data() {
    return {
      product: getProduct(), user: [], vendor: '', uiLoginLandscape: ''
    };
  },

  computed: { ...mapGetters({ t: 'i18n/t' }) },

  methods: {
    displayName(provider) {
      return this.t(`model.authConfig.provider.${ provider }`);
    },

    backToLogin() {
      this.$router.replace({ name: 'auth-logout', query: { [LOGGED_OUT]: true } });
    },
    async handleDone() {
      try {
        await loadPlugins({
          app:     this.$store.app,
          store:   this.$store,
          $plugin: this.$store.$plugin
        });
      } catch (error) {

      }

      this.$router.replace('/');
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
        <div class="mt-20 bind-app__container">
          <BindApp
            class="bind-app__content"
            :center="true"
            @on-done="handleDone"
          />
        </div>

        <div
          class="mt-20 text-center"
        >
          <a
            role="button"
            @click="backToLogin"
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
  .bind-app__container {
    display: flex;
    justify-content: center;
  }
  .bind-app__content {
    max-width: 600px;
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

    .login-messages {
      display: flex;
      justify-content: center;
      align-items: center;

      .banner {
        margin: 5px;
      }
      h4 {
        margin: 0;
      }
      &--hasContent {
        min-height: 70px;
      }

      .text-error, .banner {
        max-width: 80%;
      }
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
