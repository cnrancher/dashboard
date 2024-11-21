<script>
import Loading from '@shell/components/Loading';
import { CAPI } from '@shell/config/labels-annotations';
import CreateEditView from '@shell/mixins/create-edit-view';
import { mapGetters } from 'vuex';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import { RadioButton } from '@components/Form/Radio';

export default {
  components: {
    Loading, LabeledInput, RadioButton
  },
  mixins: [CreateEditView],

  fetch() {
  },

  data() {
    return { stsToken: false };
  },

  mounted() {
    if (this.value.annotations[CAPI.CREDENTIAL_DRIVER_ALIYUN_SST] === 'true') {
      this.stsToken = true;
    }
  },

  computed: { ...mapGetters({ t: 'i18n/t' }) },

  watch: {
    'value.decodedData.accessKeyId'(neu) {
      this.$emit('validationChanged', !!neu);
    },

    'value.decodedData.accessKeySecret'(neu) {
      this.$emit('validationChanged', !!neu);
    },
  },

  methods: {
    async test() {
      try {
        const authConfig = {
          accessKeyID:     this.value.decodedData.accessKeyId,
          accessKeySecret: this.value.decodedData.accessKeySecret,
          acceptLanguage:  'zh-CN',
        };

        await this.$store.dispatch('rancher/request', {
          url:    '/meta/ack/ackCheckCredentials',
          method: 'POST',
          data:   authConfig,
        });

        return true;
      } catch (e) {
        return false;
      }
    },
    listeners() {
      this.stsToken = !this.stsToken;
      this.$emit('setAliyunSTSTokenAnno', this.stsToken);
    }
  }
};
</script>

<template>
  <Loading
    v-if="$fetchState.pending"
    :delayed="true"
  />
  <div v-else>
    <LabeledInput
      :value="value.decodedData.accessKeyId"
      label-key="cluster.credential.aliyun.accessKey.label"
      placeholder-key="cluster.credential.aliyun.accessKey.placeholder"
      type="text"
      :mode="mode"
      @input="value.setData('accessKeyId', $event);"
    />
    <LabeledInput
      :value="value.decodedData.accessKeySecret"
      class="mt-20"
      label-key="cluster.credential.aliyun.secretKey.label"
      placeholder-key="cluster.credential.aliyun.secretKey.placeholder"
      type="password"
      :mode="mode"
      @input="value.setData('accessKeySecret', $event);"
    />
    <div class="mt-10">
      <RadioButton
        :val="true"
        name="stsToken"
        :value="stsToken"
        :label="t('cluster.credential.aliyun.stsToken.label')"
        @input="listeners"
      />
    </div>
  </div>
</template>
