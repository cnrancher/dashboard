<template>
  <div>
    <div
      class="bind-app__contnet"
      :class="{'bindApp__content--center': center}"
    >
      <p
        v-clean-html="t('mfa.bindApp.appTips', {}, true)"
        class="mt-20 bind-app__label"
      />
      <div>
        <p>{{ t('mfa.bindApp.tips.1') }}</p>
      </div>
      <div>
        <img
          v-if="imageUrl"
          width="200"
          :src="imageUrl"
        >
      </div>
      <div v-show="secret">
        <span class="bind-app__label">{{ t('mfa.bindApp.manualConfigTips') }}</span> <a
          href="javascript: void(0);"

          @click="viewSecret"
        >
          {{ t('mfa.bindApp.viewSecret') }}
        </a>
      </div>
      <p>{{ t('mfa.bindApp.tips.2') }}</p>
      <VerifyCode
        :is-bind="true"
        :secret="secret"
        @on-done="handleDone"
        @on-errors="handleError"
      />
      <Banner
        v-for="e in errors"
        :key="e"
        color="error"
        :label="e"
      />
    </div>
    <modal
      class="two-factor-secret-modal"
      name="two-factor-secret"
      :width="600"
      height="auto"
      :click-to-close="false"
    >
      <Card
        class="prompt-two-factor-secret"
        :show-highlight-border="false"
      >
        <h4
          slot="title"
          class="text-default-text"
        >
          {{ t('mfa.bindApp.secretView.title') }}
        </h4>
        <div
          slot="body"
          class="pr-10 pl-10"
        >
          <DetailText
            :value="secret"
            label-key="mfa.bindApp.secretView.secret"
            class="mt-20"
          />
        </div>
        <div
          slot="actions"
          class="bottom"
        >
          <div class="buttons">
            <button
              class="mr-10 btn role-secondary"
              @click="close"
            >
              {{ t('generic.cancel') }}
            </button>
          </div>
        </div>
      </Card>
    </modal>
  </div>
</template>
<script>
import { Banner } from '@components/Banner';
import VerifyCode from './VerifyCode.vue';
import { stringify } from '@shell/utils/error';
import DetailText from '@shell/components/DetailText';
import { Card } from '@components/Card';
import { NORMAN, MANAGEMENT } from '@shell/config/types';
import { SETTING } from '@shell/config/settings';
import qrcode from 'qrcode';

export default {
  components: {
    VerifyCode, Banner, DetailText, Card
  },
  props: {
    handleEnableOtp: {
      type:    Function,
      default: null
    },
    center: {
      type:    Boolean,
      default: false
    }
  },

  async created() {
    try {
      await this.loadPrincipal();
      await this.loadBindAppInfo();
    } catch (error) {
      this.errors = [stringify(error)];
    }
  },
  data() {
    return {
      errors:    [],
      secret:    '',
      imageUrl:  '',
      principal: null
    };
  },
  computed: {
    userId() {
      return this.$store.getters['auth/v3User']?.id ?? this.$route.query?.userId;
    },

    serverUrlSetting() {
      return this.$store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.SERVER_URL);
    },
  },

  methods: {
    async loadPrincipal() {
      const principals = await this.$store.dispatch('rancher/findAll', {
        type: NORMAN.PRINCIPAL,
        opt:  {
          url:                  '/v3/principals',
          redirectUnauthorized: false,
        }
      });

      this.principal = principals.find((p) => p.me === true) ?? {};
    },
    async handleDone() {
      try {
        if (typeof this.handleEnableOtp === 'function') {
          await this.handleEnableOtp();
        } else {
          const userId = this.$store.getters['auth/v3User']?.id ?? this.$route.query?.userId;
          const pref = await this.$store.dispatch('management/request', { url: `/v1/userpreferences/${ userId }`, method: 'GET' });

          pref.data['enable-two-factor-authenticator'] = 'true';

          await this.$store.dispatch('management/request', {
            url: `/v1/userpreferences/${ userId }`, method: 'PUT', data: pref
          });
          this.$emit('on-done');
        }
      } catch (error) {
        this.errors = [stringify(error)];
      }
    },
    handleError(err) {
      this.errors = err.map((e) => stringify(e));
    },
    viewSecret() {
      this.$modal.show('two-factor-secret');
    },

    close() {
      this.$modal.hide('two-factor-secret');
    },
    async loadBindAppInfo() {
      const buffer = await import('@otplib/preset-browser/buffer');

      if (!window.Buffer) {
        window.Buffer = buffer.Buffer;
      }
      const resp = await import( '@otplib/preset-browser');

      const secret = resp.authenticator.generateSecret();
      const user = this.principal.loginName;
      const service = this.serverUrlSetting.value.split('://')[1].replaceAll(':', '.');
      const otpauth = resp.authenticator.keyuri(user, service, secret);
      const imageUrl = await qrcode.toDataURL(otpauth);

      this.imageUrl = imageUrl;
      this.secret = secret;
    }
  },

};
</script>
<style scoped>
.bind-app__contnet {
  display: grid;
  gap: 10px;
}
.bindApp__content--center {
  justify-items: center;
}
.prompt-two-factor-secret {
  margin: 0;
  .bottom {
    display: block;
    width: 100%;
  }
  .banner {
    margin-top: 0
  }
  .buttons {
    display: flex;
    justify-content: flex-end;
    width: 100%;
  }
}
.bind-app__label {
  color: var(--input-label);
}
</style>
