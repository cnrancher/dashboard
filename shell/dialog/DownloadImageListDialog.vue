<template>
  <div>
    <Card
      class="prompt-download-image-list"
      :show-highlight-border="false"
    >
      <h4
        slot="title"
        class="title"
      >
        <i :class="`icon ${imageList.icon} mr-5`" /> {{ t(imageList.label) }} {{ t('about.downloadImageList.title') }}
      </h4>
      <div
        slot="body"
        class="pr-10 pl-10"
        style="min-height: 300px;"
      >
        <div class="mb-20 row">
          <div class="col span-12">
            <Banner
              color="warning"
              label-key="about.downloadImageList.tokenTips"
            />
          </div>
        </div>
        <div class="mb-20 row">
          <div class="col span-12">
            <LabeledInput
              v-model.trim="token"
              :label="t('about.downloadImageList.accessToken.label')"
              :placeholder="t('about.downloadImageList.accessToken.placeholder')"
            />
          </div>
        </div>
      </div>
      <div
        slot="actions"
        class="bottom"
      >
        <Banner
          v-for="(err, i) in errors"
          :key="i"
          color="error"
          :label="err"
        />
        <div class="buttons">
          <button
            class="mr-10 btn role-secondary"
            @click="close"
          >
            {{ t('generic.cancel') }}
          </button>
          <AsyncButton
            mode="download"
            :disabled="loading"
            @click="download"
          />
        </div>
      </div>
    </Card>
  </div>
</template>

<script>
import { Card } from '@components/Card';
import AsyncButton from '@shell/components/AsyncButton';
import { Banner } from '@components/Banner';
import { LabeledInput } from '@components/Form/LabeledInput';
import { stringify } from '@shell/utils/error';

export default {
  props: {
    resources: {
      type:     Array,
      required: true
    },
  },

  data() {
    return {
      token:   '',
      loading: false,
      errors:  [],

    };
  },
  computed: {
    imageList() {
      return this.resources[0];
    },
  },
  methods: {
    close() {
      this.$emit('close');
    },
    async download(buttonDone) {
      this.loading = true;
      try {
        await this.imageList.imageList(this.token);
        buttonDone(true);
        this.close();
      } catch (err) {
        buttonDone(false);
        this.errors = [stringify(err)];
      }
      this.loading = false;
    },
  },
  components: {
    Card,
    AsyncButton,
    Banner,
    LabeledInput
  }
};
</script>
<style lang="scss" scoped>
.prompt-download-image-list {
  margin: 0;
  .title {
    display: flex;
    align-items: center;
  }
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
