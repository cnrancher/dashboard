<template>
  <div>
    <h5>{{ t('mfa.recoveryCode.title') }}</h5>
    <p>
      {{ t('mfa.recoveryCode.tips') }} <a
        href="javascript: void(0);"
        @click="viewCode"
      >{{ t('mfa.recoveryCode.viewCode') }}</a>
    </p>
    <br>
    <button
      class="btn btn-sm role-secondary"
      @click="newCode"
    >
      {{ t('mfa.recoveryCode.new') }}
    </button>

    <modal
      class="view-recovery-code-modal"
      name="view-recovery-code"
      :width="600"
      height="auto"
      :click-to-close="false"
    >
      <Card
        class="prompt-view-recovery-code"
        :show-highlight-border="false"
      >
        <h4
          slot="title"
          class="text-default-text"
        >
          {{ t('mfa.recoveryCode.title') }}
        </h4>
        <div
          slot="body"
          class="pr-10 pl-10 recovery-code__content"
        >
          <VerifyCode
            v-if="codes.length === 0"
            :handleVerify="handleVerify"
            @on-errors="handleErrors"
          />
          <template v-else>
            <p
              v-for="c in codes"
              :key="c"
            >
              {{ c }}
            </p>
          </template>

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
            <CopyToClipboard
              :text="codeString"
              :disabled="codes.length === 0"
            />
            <button
              class="mr-10 btn role-secondary"
              :disabled="codes.length === 0"
              @click="download"
            >
              {{ t('mfa.recoveryCode.download') }}
            </button>

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
    <modal
      class="view-recovery-code-modal"
      name="new-recovery-code"
      :width="600"
      height="auto"
      :click-to-close="false"
    >
      <Card
        class="prompt-view-recovery-code"
        :show-highlight-border="false"
      >
        <h4
          slot="title"
          class="text-default-text"
        >
          {{ t('mfa.recoveryCode.new') }}
        </h4>
        <div
          slot="body"
          class="pr-10 pl-10 recovery-code__content"
        >
          <VerifyCode
            v-if="codes.length === 0"
            :handleVerify="generateNewCodes"
            @on-errors="handleErrors"
          />
          <template v-else>
            <p
              v-for="c in codes"
              :key="c"
            >
              {{ c }}
            </p>
          </template>

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
            <CopyToClipboard
              :text="codeString"
              :disabled="codes.length === 0"
            />
            <button
              class="mr-10 btn role-secondary"
              :disabled="codes.length === 0"
              @click="download"
            >
              {{ t('mfa.recoveryCode.download') }}
            </button>

            <button
              class="mr-10 btn role-secondary"
              @click="closeNewCodeView"
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
import CopyToClipboard from '@shell/components/CopyToClipboard.vue';
import { downloadFile } from '@shell/utils/download';
import VerifyCode from '@shell/components/TwoFactorAuth/VerifyCode.vue';
import { Card } from '@components/Card';
import { Banner } from '@components/Banner';

export default {
  components: {
    CopyToClipboard, VerifyCode, Card, Banner
  },
  data() {
    return {
      codes: [], loading: false, errors: []
    };
  },
  computed: {
    codeString() {
      return this.codes.join(', ');
    }
  },
  methods: {
    viewCode() {
      this.errors = [];
      this.$modal.show('view-recovery-code');
    },
    newCode() {
      this.errors = [];
      this.codes = [];
      this.$modal.show('new-recovery-code');
    },
    download() {
      downloadFile('rancher-recovery-codes.txt', this.codeString);
    },
    closeNewCodeView() {
      this.$modal.hide('new-recovery-code');
    },
    close() {
      this.$modal.hide('view-recovery-code');
    },
    async handleVerify({ userId, passCode }) {
      this.loading = true;
      this.errors = [];
      try {
        const resp = await this.$store.dispatch('management/request', { url: `/v1/management.cattle.io.users/${ userId }?link=recoveryCode&passcode=${ passCode }&view=true`, redirectUnauthorized: false });

        this.codes = [resp.Value];
      } finally {
        this.loading = false;
      }
    },
    handleErrors(errors) {
      this.errors = errors;
    },
    async generateNewCodes({ userId, passCode }) {
      this.errors = [];
      this.loading = true;
      try {
        const resp = await this.$store.dispatch('management/request', { url: `/v1/management.cattle.io.users/${ userId }?link=recoveryCode&passcode=${ passCode }` });

        this.codes = [resp.Value];
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
<style lang="scss" scoped>
.prompt-view-recovery-code {
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
    gap: 10px;
    width: 100%;
  }
  .recovery-code__content {
    display: grid;
    justify-items: center;
    min-height: 100px;
  }
}
</style>
