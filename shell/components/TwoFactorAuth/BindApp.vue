<template>
  <div>
    <div class="bind-app__contnet">
      <div class="text-center">
        <h5>{{ t('mfa.bindApp.title') }}</h5>

        <p>{{ t('mfa.bindApp.tips') }}</p>
      </div>
      <div>
        <img
          width="200"
          :src="`/v1/management.cattle.io.users/${ userId }?link=genQRCode&time=${time}`"
        >
      </div>
      <div>
        {{ t('mfa.bindApp.manualConfigTips') }} <a
          href="javascript: void(0);"

          @click="viewSecret"
        >
          {{ t('mfa.bindApp.viewSecret') }}
        </a>
      </div>
      <VerifyCode
        :is-bind="true"
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
            :value="form.Secret"
            label-key="mfa.bindApp.secretView.secret"
            class="mt-20"
          />
          <Banner
            v-for="e in errors"
            :key="e"
            color="error"
            :label="e"
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

export default {
  components: {
    VerifyCode, Banner, DetailText, Card
  },
  props: {
    handleEnableOtp: {
      type:    Function,
      default: null
    }
  },
  data() {
    const time = new Date().getTime();

    return {
      errors:       [],
      qrCode:       '',
      form:         { Secret: '' },
      secretErrors: [],
      time,
    };
  },
  computed: {
    userId() {
      return this.$store.getters['auth/v3User']?.id ?? this.$route.query?.userId;
    }
  },

  methods: {
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
      this.loadSecretData();
      this.$modal.show('two-factor-secret');
    },
    async loadSecretData() {
      const userId = this.$store.getters['auth/v3User']?.id ?? this.$route.query?.userId;

      try {
        const resp = await this.$store.dispatch('management/request', { url: `/v1/management.cattle.io.users/${ userId }?link=genQRCode&secret=true`, method: 'GET' });

        this.form = resp;
      } catch (error) {
        this.secretErrors = [stringify(error)];
      }
    },
    close() {
      this.$modal.hide('two-factor-secret');
    }
  },

};
</script>
<style scoped>
.bind-app__contnet {
  display: grid;
  justify-items: center;
  gap: 10px;
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
</style>
