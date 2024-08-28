<script>
import BrandImage from '@shell/components/BrandImage';
import { Banner } from '@components/Banner';
import { mapGetters } from 'vuex';
import { _MULTI } from '@shell/plugins/dashboard-store/actions';
import { MANAGEMENT, NORMAN } from '@shell/config/types';
import { SETTING } from '@shell/config/settings';
import { LOGGED_OUT } from '@shell/config/query-params';

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
  components: {
    BrandImage, Banner, VerifyCode, Checkbox
  },

  async fetch() {
    let uiLoginLandscape, plSetting, brand, user;

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
      product: getProduct(), user: [], errors: [], vendor: '', uiLoginLandscape: '', isRecoveryCode: false
    };
  },

  computed: { ...mapGetters({ t: 'i18n/t' }) },

  methods: {
    displayName(provider) {
      return this.t(`model.authConfig.provider.${ provider }`);
    },

    back() {
      this.$router.replace({ name: 'auth-logout', query: { [LOGGED_OUT]: true } });
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
          <h3>{{ t('mfa.code.title') }}</h3>
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
        <div class="mt-20">
          <p class="text-center veriry-code__tips">
            {{ t('mfa.code.tips') }}
          </p>
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
  .veriry-code__tips {
    color: var(--input-label);
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
