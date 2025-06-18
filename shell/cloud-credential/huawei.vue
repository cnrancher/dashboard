<script>
import CreateEditView from '@shell/mixins/create-edit-view';
import { LabeledInput } from '@components/Form/LabeledInput';
import LabeledSelect from '@shell/components/form/LabeledSelect';

const REGIONS = [
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-southeast-3',
  'ap-southeast-4',
  'ap_southeast_5',
  'cn-east-2',
  'cn-east-3',
  'cn-east-4',
  'cn-east-5',
  'cn-north-1',
  'cn-north-3',
  'cn-north-4',
  'cn-north-9',
  'cn-south-1',
  'cn-south-4',
  'cn-southwest-2',
  'la-north-2',
  'la-south-2',
  'na-mexico-1',
  'sa-brazil-1',
  'tr-west-1',
  'me-east-1',
  'af-north-1',
  'af-south-1',
];

const getHuaweiRegionChoices = (regions) => {
  return regions.map((item) => {
    return {
      label: `cluster.credential.huawei.regionID.${ item.replace(/\-/g, '_') }`,
      value: item
    };
  });
};

const HUAWEI_REGION_CHOICES = getHuaweiRegionChoices(REGIONS);

export default {
  components: { LabeledInput, LabeledSelect },
  mixins:     [CreateEditView],
  emits:      ['validationChanged'],
  data() {
    return { huaweiRegionChoices: HUAWEI_REGION_CHOICES };
  },

  watch: {
    'value.decodedData.regionID'() {
      this.$emit('validationChanged', this.validate());
    },

    'value.decodedData.projectID'() {
      this.$emit('validationChanged', this.validate());
    },

    'value.decodedData.accessKey'() {
      this.$emit('validationChanged', this.validate());
    },

    'value.decodedData.secretKey'() {
      this.$emit('validationChanged', this.validate());
    },
  },

  methods: {
    async test() {
      try {
        const authConfig = {
          projectID: this.value.decodedData.projectID,
          accessKey: this.value.decodedData.accessKey,
          secretKey: this.value.decodedData.secretKey,
          regionID:  this.value.decodedData.regionID,
        };

        await this.$store.dispatch('rancher/request', {
          url:    '/meta/cce/cceCheckCredentials',
          method: 'POST',
          data:   authConfig,
        });

        return true;
      } catch (e) {
        return false;
      }
    },
    validate() {
      const projectID = this.value.decodedData.projectID;
      const accessKey = this.value.decodedData.accessKey;
      const secretKey = this.value.decodedData.secretKey;
      const regionID = this.value.decodedData.regionID;

      return !!projectID && !!accessKey && !!secretKey && !!regionID;
    },
  },

  mounted() {
    if (!this.value?.decodedData?.regionID) {
      this.value.setData('regionID', 'cn-east-3');
    }
  }
};
</script>

<template>
  <div>
    <LabeledSelect
      v-model:value="value.decodedData.regionID"
      label-key="cluster.credential.huawei.regionID.label"
      :localized-label="true"
      :options="huaweiRegionChoices"
      :mode="mode"
      @update:value="value.setData('regionID', $event);"
    />
    <LabeledInput
      :value="value.decodedData.projectID"
      class="mt-20"
      label-key="cluster.credential.huawei.projectId.label"
      placeholder-key="cluster.credential.huawei.projectId.placeholder"
      type="text"
      :mode="mode"
      @update:value="value.setData('projectID', $event);"
    />
    <LabeledInput
      :value="value.decodedData.accessKey"
      class="mt-20"
      label-key="cluster.credential.huawei.accessKey.label"
      placeholder-key="cluster.credential.huawei.accessKey.placeholder"
      type="text"
      :mode="mode"
      @update:value="value.setData('accessKey', $event);"
    />
    <LabeledInput
      :value="value.decodedData.secretKey"
      class="mt-20"
      label-key="cluster.credential.huawei.secretKey.label"
      placeholder-key="cluster.credential.huawei.secretKey.placeholder"
      type="password"
      :mode="mode"
      @update:value="value.setData('secretKey', $event);"
    />
    <p
      v-clean-html="t('cluster.credential.huawei.regionID.help', {}, true)"
      class="text-muted mt-5"
    />
  </div>
</template>
