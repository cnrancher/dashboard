<script>
import Loading from '@/components/Loading';
import Banner from '@/components/Banner';
import CreateEditView from '@/mixins/create-edit-view';
import LabeledSelect from '@/components/form/LabeledSelect';
import LabeledInput from '@/components/form/LabeledInput';
import KeyValue from '@/components/form/KeyValue';
import UnitInput from '@/components/form/UnitInput';
import RadioGroup from '@/components/form/RadioGroup';
import Checkbox from '@/components/form/Checkbox';
import { NORMAN } from '@/config/types';
import { allHash } from '@/utils/promise';
import { sortBy } from '@/utils/sort';
import { stringify, exceptionToErrorsArray } from '@/utils/error';
import { findBy } from '@/utils/array';
import { delay } from 'lodash';

const DEFAULT_GROUP = 'docker-machine';
const OPTION_CHARGETYPES = [
  {
    label: 'cluster.machineConfig.aliyunecs.internetChargeTypes.payByTraffic',
    value: 'PayByTraffic'
  },
  {
    label: 'cluster.machineConfig.aliyunecs.internetChargeTypes.payByBandwidth',

    value: 'PayByBandwidth'
  },
];
const DISKS = [
  {
    label: 'cluster.machineConfig.aliyunecs.disk.cloud',
    value: 'cloud'
  },
  {
    label: 'cluster.machineConfig.aliyunecs.disk.ephemeralSsd',
    value: 'ephemeral_ssd'
  },
  {
    label: 'cluster.machineConfig.aliyunecs.disk.ssd',
    value: 'cloud_ssd'
  },
  {
    label: 'cluster.machineConfig.aliyunecs.disk.efficiency',
    value: 'cloud_efficiency'
  },
  {
    label: 'cluster.machineConfig.aliyunecs.disk.essd',
    value: 'cloud_essd'
  }
];

export default {
  components: {
    Banner, Loading, LabeledInput, LabeledSelect, Checkbox, RadioGroup, UnitInput, KeyValue
  },

  mixins: [CreateEditView],

  props: {
    uuid: {
      type:     String,
      required: true,
    },

    cluster: {
      type:     Object,
      default: () => ({})
    },

    credentialId: {
      type:     String,
      required: true,
    },

    disabled: {
      type:    Boolean,
      default: false
    },
  },

  async fetch() {
    this.errors = [];
    const cloudCredentialId = this.credentialId;

    if ( !cloudCredentialId ) {
      return;
    }

    if (!this.defaultValue) {
      this.defaultValue = this.$store.getters['aliyun/defaultValue'];
    }

    try {
      if ( this.credential?.id !== cloudCredentialId ) {
        this.credential = await this.$store.dispatch('rancher/find', { type: NORMAN.CLOUD_CREDENTIAL, id: cloudCredentialId });
      }
    } catch (e) {
      this.credential = null;
    }

    if (!this.regions) {
      this.regions = await this.$store.dispatch('aliyun/regions', { cloudCredentialId });
    }

    try {
      const region = this.value.region || this.$store.getters['aliyun/defaultRegion'];
      const hash = {};

      if ( !this.value.region ) {
        this.value.region = region;
      }

      if ( this.value.resourceGroupId === null ) {
        this.value.resourceGroupId = '';
      }

      if (!this.resourceGroups) {
        hash.resourceGroups = this.$store.dispatch('aliyun/resourceGroups', { cloudCredentialId });
      }

      if ( this.loadedRegionalFor !== region ) {
        const { resourceGroupId } = this.value;

        hash.zones = this.$store.dispatch('aliyun/zones', { cloudCredentialId, regionId: region });
        hash.vpcs = this.$store.dispatch('aliyun/vpcs', {
          cloudCredentialId, regionId: region, resourceGroupId
        });
        hash.instanceTypes = this.$store.dispatch('aliyun/instanceTypes', { cloudCredentialId, regionId: region });
      }

      hash.availableInstanceTypes = this.$store.dispatch('aliyun/availableInstanceTypes', {
        cloudCredentialId, regionId: region, destinationResource: 'InstanceType', zoneId: this.value?.zone,
      });

      const res = await allHash(hash).then((h) => {
        const out = (h.instanceTypes || this.instanceTypes).filter(obj => h.availableInstanceTypes.includes(obj.InstanceTypeId));

        h.availableInstanceTypes = sortBy(out, ['isDefault:desc', 'InstanceTypeFamily']);

        return h;
      });

      for ( const k in res ) {
        this[k] = res[k];
      }

      if (!this.value?.zone || !findBy(this.zoneOptions, 'value', this.value.zone )) {
        this.value.zone = this.defaultValue.zone;
      }

      if (!this.value?.vpcId || !findBy(this.vpcOptions, 'value', this.value.vpcId )) {
        this.value.vpcId = this.defaultValue.vpcId;
      }

      if (!this.value?.instanceType || !findBy(this.instanceOptions, 'value', this.value.instanceType )) {
        this.value.instanceType = this.instanceOptions?.[1]?.value;
      }

      if (!this.value?.upgradeKernel) {
        this.$set(this.value, 'upgradeKernel', false);
      }
      if (!this.value?.ioOptimized) {
        this.$set(this.value, 'ioOptimized', 'optimized');
      }
      if (!this.value?.diskFs) {
        this.$set(this.value, 'diskFs', 'ext4');
      }
      if (!this.value?.internetChargeType) {
        this.$set(this.value, 'internetChargeType', 'PayByTraffic');
      }

      this.initTags();
      this.loadedRegionalFor = region;
    } catch (e) {
      this.errors = exceptionToErrorsArray(e);
    }
  },

  data() {
    return {
      securityGroupMode:     'default',
      tag:                   null,
      loadedRegionalFor:     null,
      loadedZoneFor:         null,
      loadedInstanceFor:     null,
      loadedIoOptiomizedFor: null,

      regions:                null,
      resourceGroups:         null,
      zones:                  null,
      vpcs:                   null,
      vSwitches:              null,
      securityGroups:         null,
      instanceTypes:          null,
      availableInstanceTypes: null,
      images:                 null,
      systemDiskCategories:   null,
      dataDiskCategories:     null,
    };
  },

  mounted() {
    this.value?.vpcId && this.vpcChangeFetch();
    this.value?.instanceType && this.instanceChangeFetch();
  },

  watch: {
    'credentialId'() {
      this.$fetch();
    },
    'value.resourceGroupId'() {
      this.loadedRegionalFor = null;
      this.$fetch();
    },
    'value.region'(val) {
      this.$fetch();
    },
    'value.zone'(val) {
      val && this.$fetch();
    },
    'value.vpcId'() {
      this.vpcChangeFetch();
    },
    'value.instanceType'() {
      this.instanceChangeFetch();
    },
    'securityGroupMode'(val) {
      // this.value.securityGroup = val === 'default' ? DEFAULT_GROUP : null;

      if (val === 'default') {
        this.value.securityGroup = DEFAULT_GROUP;
      } else if (this.value?.securityGroup && !findBy(this.securityGroupOptions, 'value', this.value.securityGroup )) {
        this.value.securityGroup = null;
      }
    },
  },

  methods: {
    stringify,

    async vpcChangeFetch() {
      const cloudCredentialId = this.credentialId;
      const { region, vpcId, ResourceGroupId } = this.value;

      if (!vpcId) {
        return;
      }

      this.vSwitches = await this.$store.dispatch('aliyun/vSwitches', {
        cloudCredentialId, regionId: region, vpcId, ResourceGroupId
      });
      this.securityGroups = await this.$store.dispatch('aliyun/securityGroups', {
        cloudCredentialId, regionId: region, vpcId,
      });

      if (!this.value?.vswitchId || !findBy(this.vSwitcheOptions, 'value', this.value.vswitchId )) {
        this.value.vswitchId = this.defaultValue.vswitchId;
      }

      if (this.value?.securityGroup && findBy(this.securityGroupOptions, 'value', this.value.securityGroup )) {
        this.securityGroupMode = 'custom';
      } else {
        this.securityGroupMode = 'default';
      }
    },
    async instanceChangeFetch() {
      const cloudCredentialId = this.credentialId;
      const {
        region, instanceType, zone: zoneId, ioOptimized
      } = this.value;
      const hash = {};

      if (!instanceType) {
        return;
      }

      hash.images = this.$store.dispatch('aliyun/images', {
        cloudCredentialId, regionId: region, instanceType, imageOwnerAlias: 'system', isSupportIoOptimized: true, resourceGroupId: this.value?.resourceGroupId,
      });
      hash.systemDiskCategories = this.$store.dispatch('aliyun/systemDiskCategories', {
        cloudCredentialId, regionId: region, zoneId, instanceType, networkCategory: 'vpc', ioOptimized, destinationResource: 'SystemDisk',
      });
      hash.dataDiskCategories = this.$store.dispatch('aliyun/dataDiskCategories', {
        cloudCredentialId, regionId: region, instanceType, systemDiskCategory: this.value?.systemDiskCategory, networkCategory: 'vpc', ioOptimized, destinationResource: 'DataDisk',
      });

      const res = await allHash(hash);

      for ( const k in res ) {
        this[k] = res[k];
      }

      if (!this.value?.imageId || !findBy(this.imageOptions, 'value', this.value.imageId )) {
        this.value.imageId = this.imageOptions?.[0]?.value;
      }
      if (!this.value?.systemDiskCategory || !findBy(this.systemDiskCategoryOptions, 'value', this.value.systemDiskCategory )) {
        this.value.systemDiskCategory = this.systemDiskCategoryOptions?.[0]?.value;
      }
      if (!this.value?.diskCategory || !findBy(this.diskCategoryOptions, 'value', this.value.diskCategory )) {
        this.value.diskCategory = this.diskCategoryOptions?.[0]?.value;
      }
    },
    updateTags(tag) {
      const ary = [];

      for ( const k in tag ) {
        ary.push(`${ k }=${ tag[k] }`);
      }

      this.$set(this.value, 'tag', ary);
    },

    initTags() {
      const parts = this.value.tag || [];
      const out = {};

      let i = 0;

      while ( i < parts.length ) {
        const arr = parts[i].split('=');
        const key = arr[0];
        const value = arr[1];

        if ( key ) {
          out[key] = value;
        }

        i += 1;
      }

      this.tag = out;
    },

    test() {
      const errors = [];

      const {
        zone, vpcId, vswitchId, instanceType, diskFs, internetChargeType, imageId, systemDiskCategory, diskCategory
      } = this.value;

      if (!zone) {
        const key = this.t('cluster.machineConfig.aliyunecs.zone.label');

        errors.push(this.t('validation.required', { key }, true));
      }
      if (!vpcId) {
        const key = this.t('cluster.machineConfig.aliyunecs.vpcId.label');

        errors.push(this.t('validation.required', { key }, true));
      }
      if (!vswitchId) {
        const key = this.t('cluster.machineConfig.aliyunecs.vswitchId.label');

        errors.push(this.t('validation.required', { key }, true));
      }
      if (!internetChargeType) {
        const key = this.t('cluster.machineConfig.aliyunecs.internetChargeType.label');

        errors.push(this.t('validation.required', { key }, true));
      }

      if (!instanceType) {
        const key = this.t('cluster.machineConfig.aliyunecs.instanceType');

        errors.push(this.t('validation.required', { key }, true));
      }
      if (!diskFs) {
        const key = this.t('cluster.machineConfig.aliyunecs.diskFs.label');

        errors.push(this.t('validation.required', { key }, true));
      }
      if (!imageId) {
        const key = this.t('cluster.machineConfig.aliyunecs.systemImage.label');

        errors.push(this.t('validation.required', { key }, true));
      }
      if (!systemDiskCategory) {
        const key = this.t('cluster.machineConfig.aliyunecs.systemDiskCategory.label');

        errors.push(this.t('validation.required', { key }, true));
      }
      if (!diskCategory) {
        const key = this.t('cluster.machineConfig.aliyunecs.dataDiskCategory.label');

        errors.push(this.t('validation.required', { key }, true));
      }

      return { errors };
    },

    unitInputRangeLimit(min, max, key) {
      delay(() => {
        const value = this.value?.[key];

        if (!value) {
          return;
        }

        if (value < min) {
          this.value[key] = min;
        }

        if (value > max) {
          this.value[key] = max;
        }
      }, 500);
    }
  },

  computed: {
    defaultGroup() {
      return DEFAULT_GROUP;
    },
    securityGroupLabels() {
      return [
        this.t('cluster.machineConfig.aliyunecs.securityGroup.mode.default', { defaultGroup: DEFAULT_GROUP }),
        this.t('cluster.machineConfig.aliyunecs.securityGroup.mode.custom')
      ];
    },
    regionOptions() {
      if ( !this.regions ) {
        return [];
      }

      return this.regions.map((obj) => {
        return {
          label: obj.LocalName,
          value: obj.RegionId,
        };
      });
    },
    zoneOptions() {
      if ( !this.zones ) {
        return [];
      }

      return this.zones.map((obj) => {
        return {
          label: obj.LocalName,
          value: obj.ZoneId,
        };
      });
    },
    resourceGroupOptions() {
      if ( !this.resourceGroups ) {
        return [];
      }

      const out = this.resourceGroups.map((obj) => {
        return {
          label: `${ obj.DisplayName || obj.Name } (${ obj.Id })`,
          value: obj.Id,
        };
      }).sort();

      out.unshift({
        label: this.t('cluster.machineConfig.aliyunecs.resourceGroup.all'),
        value: ''
      });

      return out;
    },
    vpcOptions() {
      if ( !this.vpcs ) {
        return [];
      }

      return this.vpcs.map((obj) => {
        return {
          label: `${ obj.IsDefault ? this.t('cluster.machineConfig.aliyunecs.vpcId.default') : obj.VpcName } (${ obj.VpcId })`,
          value: obj.VpcId,
        };
      }).sort();
    },
    securityGroupOptions() {
      if ( !this.securityGroups ) {
        return [];
      }

      return this.securityGroups.map((obj) => {
        return {
          label: `${ obj.SecurityGroupName } (${ obj.SecurityGroupId })`,
          value: obj.SecurityGroupName,
        };
      }).sort();
    },
    vSwitcheOptions() {
      if ( !this.vSwitches ) {
        return [];
      }

      return this.vSwitches.filter(i => i.ZoneId === this.value.zone).map((obj) => {
        return {
          label: `${ obj.IsDefault ? this.t('cluster.machineConfig.aliyunecs.vswitchId.default') : obj.VSwitchName } (${ obj.VSwitchId })`,
          value: obj.VSwitchId,
        };
      }).sort();
    },
    internetChargeTypeOptions() {
      return OPTION_CHARGETYPES.map(item => ({
        value: item.value,
        label: this.t(item.label),
      }));
    },
    instanceOptions() {
      if ( !this.availableInstanceTypes ) {
        return [];
      }

      let lastGroup;
      const out = [];

      this.availableInstanceTypes.forEach((obj) => {
        if (obj.InstanceTypeFamily !== lastGroup) {
          out.push({
            kind:     'group',
            disabled: true,
            label:    obj.InstanceTypeFamily
          });

          lastGroup = obj.InstanceTypeFamily;
        }
        out.push({
          label: `${ obj.InstanceTypeId } ( ${ obj.CpuCoreCount } ${ obj.CpuCoreCount > 1 ? 'Cores' : 'Core' } ${ obj.MemorySize }GB RAM )`,
          value: obj.InstanceTypeId,
        });
      });

      return out;
    },
    imageOptions() {
      if ( !this.images ) {
        return [];
      }

      return this.images.map((obj) => {
        return {
          label: obj.ImageOwnerAlias === 'system' ? obj.OSName : obj.ImageName,
          value: obj.ImageId,
        };
      });
    },
    systemDiskCategoryOptions() {
      if ( !this.systemDiskCategories ) {
        return [];
      }

      return this.systemDiskCategories.map((item) => {
        const disk = DISKS.find(disk => disk.value === item);

        return {
          label: this.t(disk.label),
          value: item,
        };
      }).sort();
    },
    diskCategoryOptions() {
      if ( !this.dataDiskCategories ) {
        return [];
      }

      return this.dataDiskCategories.map((item) => {
        const disk = DISKS.find(disk => disk.value === item);

        return {
          label: this.t(disk.label),
          value: item,
        };
      }).sort();
    },
  }
};
</script>

<template>
  <div>
    <Loading v-if="$fetchState.pending" />
    <template v-else>
      <div v-if="errors.length">
        <div
          v-for="(err, idx) in errors"
          :key="idx"
        >
          <Banner
            color="error"
            :label="stringify(err)"
          />
        </div>
      </div>

      <div class="row mb-20">
        <div class="col span-6">
          <LabeledSelect
            v-model="value.resourceGroupId"
            :mode="mode"
            :options="resourceGroupOptions"
            :required="true"
            :disabled="disabled"
            :label="t('cluster.machineConfig.aliyunecs.resourceGroup.label')"
          />
        </div>
        <div class="col span-6">
          <LabeledSelect
            v-model="value.region"
            :mode="mode"
            :options="regionOptions"
            :required="true"
            :searchable="true"
            :disabled="disabled"
            :label="t('cluster.machineConfig.aliyunecs.region.label')"
          />
        </div>
      </div>
      <div class="row mb-20">
        <div class="col span-6">
          <LabeledSelect
            v-model="value.zone"
            :mode="mode"
            :options="zoneOptions"
            :required="true"
            :disabled="disabled"
            :label="t('cluster.machineConfig.aliyunecs.zone.label')"
            :placeholder="t('cluster.machineConfig.aliyunecs.zone.prompt')"
          />
        </div>
        <div class="col span-6">
          <LabeledSelect
            v-model="value.vpcId"
            :mode="mode"
            :options="vpcOptions"
            :required="true"
            :searchable="true"
            :disabled="disabled"
            :label="t('cluster.machineConfig.aliyunecs.vpcId.label')"
            :placeholder="t('cluster.machineConfig.aliyunecs.vpcId.prompt')"
          />
        </div>
      </div>
      <div class="row mb-20">
        <div class="col span-6">
          <LabeledSelect
            v-model="value.vswitchId"
            :mode="mode"
            :options="vSwitcheOptions"
            :required="true"
            :searchable="true"
            :disabled="disabled"
            :label="t('cluster.machineConfig.aliyunecs.vswitchId.label')"
            :placeholder="t('cluster.machineConfig.aliyunecs.vswitchId.prompt')"
          />
        </div>
        <div class="col span-6">
          <LabeledSelect
            v-model="value.internetChargeType"
            :mode="mode"
            :options="internetChargeTypeOptions"
            :required="true"
            :searchable="true"
            :disabled="disabled"
            :label="t('cluster.machineConfig.aliyunecs.internetChargeType.label')"
            :placeholder="t('cluster.machineConfig.aliyunecs.internetChargeType.prompt')"
          />
        </div>
      </div>
      <div class="row mb-20">
        <div class="col span-6">
          <LabeledSelect
            v-model="value.instanceType"
            :mode="mode"
            :options="instanceOptions"
            :required="true"
            :selectable="option => !option.disabled"
            :searchable="true"
            :disabled="disabled"
            :label="t('cluster.machineConfig.aliyunecs.instanceType')"
          >
            <template v-slot:option="opt">
              <template v-if="opt.kind === 'group'">
                <b>{{ opt.label }}</b>
              </template>
              <template v-else>
                <span class="pl-10">{{ opt.label }}</span>
              </template>
            </template>
          </LabeledSelect>
        </div>
        <div class="col span-6">
          <LabeledSelect
            v-model="value.diskFs"
            :mode="mode"
            :options="['ext4','xfs']"
            :required="true"
            :disabled="disabled"
            :label="t('cluster.machineConfig.aliyunecs.diskFs.label')"
          />
        </div>
      </div>

      <div class="row mb-20">
        <div class="col span-6">
          <LabeledSelect
            v-model="value.imageId"
            :mode="mode"
            :options="imageOptions"
            :required="true"
            :searchable="true"
            :disabled="disabled"
            :label="t('cluster.machineConfig.aliyunecs.systemImage.label')"
            :placeholder="t('cluster.machineConfig.aliyunecs.systemImage.placeholder')"
          />
        </div>
        <div class="col span-6">
          <UnitInput
            v-model="value.internetMaxBandwidth"
            output-as="string"
            :mode="mode"
            :disabled="disabled"
            :min="1"
            :max="200"
            :label="t('cluster.machineConfig.aliyunecs.internetMaxBandwidth.label')"
            :placeholder="t('cluster.machineConfig.aliyunecs.internetMaxBandwidth.placeholder')"
            :suffix="t('cluster.machineConfig.aliyunecs.internetMaxBandwidth.suffix')"
            @blur="unitInputRangeLimit(1, 200, 'internetMaxBandwidth')"
          />
        </div>
      </div>

      <div class="row mb-20">
        <div class="col span-6">
          <LabeledSelect
            v-model="value.systemDiskCategory"
            :mode="mode"
            :options="systemDiskCategoryOptions"
            :required="true"
            :searchable="true"
            :disabled="disabled"
            :label="t('cluster.machineConfig.aliyunecs.systemDiskCategory.label')"
          />
        </div>
        <div class="col span-6">
          <UnitInput
            v-model="value.systemDiskSize"
            output-as="string"
            :mode="mode"
            :min="20"
            :max="500"
            :disabled="disabled"
            :label="t('cluster.machineConfig.aliyunecs.systemDiskSize.label')"
            :placeholder="t('cluster.machineConfig.aliyunecs.systemDiskSize.placeholder')"
            :suffix="t('cluster.machineConfig.aliyunecs.systemDiskSize.suffix')"
            @blur="unitInputRangeLimit(20, 500, 'systemDiskSize')"
          />
        </div>
      </div>

      <portal :to="'advanced-'+uuid">
        <div class="row mb-20">
          <div class="col span-6">
            <LabeledInput
              v-model="value.slbId"
              :mode="mode"
              :disabled="disabled"
              :placeholder="t('cluster.machineConfig.aliyunecs.aliyunSLB.placeholder')"
              :label="t('cluster.machineConfig.aliyunecs.aliyunSLB.label')"
            />
          </div>
        </div>
        <div class="row mb-20">
          <div class="col span-6">
            <LabeledSelect
              v-model="value.diskCategory"
              :mode="mode"
              :options="diskCategoryOptions"
              :required="true"
              :searchable="true"
              :disabled="disabled"
              :label="t('cluster.machineConfig.aliyunecs.dataDiskCategory.label')"
            />
          </div>
          <div class="col span-6">
            <UnitInput
              v-model="value.diskSize"
              output-as="string"
              :mode="mode"
              :min="20"
              :max="32768"
              :disabled="disabled"
              :label="t('cluster.machineConfig.aliyunecs.diskSize.label')"
              :placeholder="t('cluster.machineConfig.aliyunecs.diskSize.placeholder')"
              :suffix="t('cluster.machineConfig.aliyunecs.diskSize.suffix')"
              @blur="unitInputRangeLimit(20, 32768, 'diskSize')"
            />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-6">
            <div class="title">
              <h3>{{ t('cluster.machineConfig.aliyunecs.ioOptimized.label') }}</h3>
            </div>
            <RadioGroup
              v-model="value.ioOptimized"
              name="ioOptimized"
              :mode="mode"
              :disabled="disabled"
              :labels="[t('generic.yes'), t('generic.no')]"
              :options="['optimized','none']"
            />
          </div>
          <div class="col span-6">
            <div class="title">
              <h3>{{ t('cluster.machineConfig.aliyunecs.upgradeKernel.label') }}</h3>
            </div>
            <RadioGroup
              v-model="value.upgradeKernel"
              name="upgradeKernel"
              :mode="mode"
              :disabled="disabled"
              :labels="[t('generic.yes'), t('generic.no')]"
              :options="[true,false]"
            />
          </div>
        </div>

        <div class="row mt-20">
          <div class="col span-12">
            <h3>
              {{ t('cluster.machineConfig.aliyunecs.securityGroup.title') }}
              <span v-if="!value.vpcId" class="text-muted text-small">
                {{ t('cluster.machineConfig.aliyunecs.securityGroup.vpcId') }}
              </span>
            </h3>
            <RadioGroup
              v-model="securityGroupMode"
              name="securityGroupMode"
              :mode="mode"
              :disabled="!value.vpcId || disabled"
              :labels="securityGroupLabels"
              :options="['default','custom']"
            />
            <LabeledSelect
              v-if="value.vpcId && securityGroupMode === 'custom'"
              v-model="value.securityGroup"
              :mode="mode"
              :disabled="!value.vpcId || disabled"
              :options="securityGroupOptions"
              :searchable="true"
              :taggable="true"
            />
          </div>
        </div>

        <div class="row mt-20">
          <div class="col span-12">
            <div>
              <Checkbox
                v-model="value.privateAddressOnly"
                :mode="mode"
                :disabled="disabled"
                :label="t('cluster.machineConfig.aliyunecs.privateAddressOnly.label')"
              />
            </div>
          </div>
        </div>
        <div class="row mt-20">
          <div class="col span-12">
            <KeyValue
              :value="tag"
              :mode="mode"
              :read-allowed="false"
              :label="t('cluster.machineConfig.aliyunecs.tagTitle')"
              :add-label="t('labels.addTag')"
              :disabled="disabled"
              @input="updateTags"
            />
          </div>
        </div>
      </portal>
    </template>
  </div>
</template>
