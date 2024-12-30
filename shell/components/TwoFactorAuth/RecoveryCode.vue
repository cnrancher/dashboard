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

    <AppModal
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
        <template #title>
          <h4
            class="text-default-text"
          >
            {{ t('mfa.recoveryCode.title') }}
          </h4>
        </template>
        <template #body>
          <div
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
        </template>
        <template #actions>
          <div
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
        </template>
      </Card>
    </AppModal>
    <AppModal
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
        <template #title>
          <h4
            class="text-default-text"
          >
            {{ t('mfa.recoveryCode.new') }}
          </h4>
        </template>
        <template #body>
          <div
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
        </template>
        <template #actions>
          <div
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
        </template>
      </Card>
    </AppModal>
  </div>
</template>
<script>
import CopyToClipboard from '@shell/components/CopyToClipboard.vue';
import { downloadFile } from '@shell/utils/download';
import VerifyCode from '@shell/components/TwoFactorAuth/VerifyCode.vue';
import { Card } from '@components/Card';
import { Banner } from '@components/Banner';
import AppModal from '@shell/components/AppModal.vue';

export default {
  components: {
    CopyToClipboard, VerifyCode, Card, Banner, AppModal
  },
  data() {
    return {
      codes:                     [],
      loading:                   false,
      errors:                    [],
      showViewRecoveryCodeModal: false,
      showNewRecoveryCodeModal:  false
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
      this.codes = [];
      this.showViewRecoveryCodeModal = true;
    },
    newCode() {
      this.errors = [];
      this.codes = [];
      this.showNewRecoveryCodeModal = true;
    },
    download() {
      downloadFile('rancher-recovery-codes.txt', this.codeString);
    },
    closeNewCodeView() {
      this.showNewRecoveryCodeModal = false;
    },
    close() {
      this.showViewRecoveryCodeModal = false;
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
        const resp = await this.$store.dispatch('management/request', { url: `/v1/management.cattle.io.users/${ userId }?link=recoveryCode&passcode=${ passCode }`, redirectUnauthorized: false });

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
