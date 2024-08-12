<template>
  <div>
    <button
      class="btn btn-sm bg-error"
      @click="showConfirmDialog"
    >
      {{ t('mfa.disableOTP.label') }}
    </button>
    <modal
      class="two-factor-disable-modal"
      name="two-factor-disable"
      :width="600"
      height="auto"
      :click-to-close="false"
    >
      <Card
        class="prompt-disable-two-factor-auth"
        :show-highlight-border="false"
      >
        <h4
          slot="title"
          class="text-default-text"
        >
          {{ t('mfa.disableOTP.label') }}
        </h4>
        <div
          slot="body"
          class="pr-10 pl-10"
        >
          <LabeledInput
            v-model="form.passCode"
            class="mb-10"
            :label="t('mfa.code.label')"
            required
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
              @click="confirm(false)"
            >
              {{ t('generic.cancel') }}
            </button>
            <button
              class="btn role-primary"
              :disabled="loading"
              @click="confirm(true)"
            >
              {{ t('mfa.disable') }}
            </button>
          </div>
        </div>
      </Card>
    </modal>
  </div>
</template>

<script>
import { Card } from '@components/Card';
import { Banner } from '@components/Banner';
import { stringify } from '@shell/utils/error';
import { LabeledInput } from '@components/Form/LabeledInput';
import { mapPref, ENABLE_TWO_FACTOR_AUTH } from '@shell/store/prefs';

export default {
  props: {
    userId: {
      type:    String,
      default: null
    }
  },
  data() {
    return {
      loading: false,
      errors:  [],
      form:    { passCode: '' }
    };
  },
  computed: { enalbeTwoFactorAuth: mapPref(ENABLE_TWO_FACTOR_AUTH) },
  methods:  {
    showConfirmDialog() {
      this.$modal.show('two-factor-disable');
    },
    async confirm(result) {
      if (!result) {
        this.close();

        return;
      }
      this.errors = [];
      if (!this.validate()) {
        return;
      }
      this.loading = true;
      const userId = this.userId;

      try {
        const code = this.form.passCode;

        await this.$store.dispatch('management/request', {
          url:                  `/v1/management.cattle.io.users/${ userId }?link=disableOTP&passcode=${ code }`,
          method:               'get',
          redirectUnauthorized: false
        });
        this.enalbeTwoFactorAuth = false;
        this.close();
      } catch (err) {
        this.errors = [stringify(err)];
      }

      this.loading = false;
    },
    close() {
      this.$modal.hide('two-factor-disable');
    },
    validate() {
      if (this.form.passCode?.trim() === '') {
        this.errors = [this.t('mfa.errors.codeRequired')];

        return false;
      }

      return true;
    },
  },
  components: {
    Card,
    Banner,
    LabeledInput,
  }
};
</script>
<style lang="scss" scoped>
.prompt-disable-two-factor-auth {
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
