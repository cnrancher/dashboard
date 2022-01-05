<script>
import CreateEditView from '@/mixins/create-edit-view';
import Footer from '@/components/form/Footer';
import LabeledInput from '@/components/form/LabeledInput';
import LabeledSelect from '@/components/form/LabeledSelect';
import LabeledInputSugget from '@/components/form/LabeledInputSugget';
import RadioGroup from '@/components/form/RadioGroup';
import Labels from '@/components/form/Labels';
import UploadImageToBase64 from '@/components/form/UploadImageToBase64';
import { sortBy } from '@/utils/sort';
import { NAMESPACE, UI } from '@/config/types';

const NAVLINK_IFRAME = 'navlink.pandaria.io/iframe';

export default {
  name:       'EditNavLink',
  props: {
    namespaceType: {
      type:    String,
      default: NAMESPACE,
    },
    optionLabel: {
      type:    String,
      default: 'label',
    },
  },

  components: {
    LabeledInput, LabeledSelect, LabeledInputSugget, RadioGroup, Labels, Footer, UploadImageToBase64
  },

  mixins: [CreateEditView],

  data() {
    return {
      target: 'self', group: false, url: 'toURL', suggestionGroups3: []
    };
  },

  computed: {
    namespaces() {
      const inStore = this.$store.getters['currentStore'](this.namespaceType);
      const choices = this.$store.getters[`${ inStore }/all`](this.namespaceType);
      const out = sortBy(
        choices.filter( (N) => {
          return this.isVirtualCluster ? !N.isSystem && !N.isFleetManaged : true;
        }).map((obj) => {
          return {
            label: obj.nameDisplay,
            value: obj.id,
          };
        }),
        'label'
      );

      if (this.forceNamespace) {
        out.unshift({
          label: this.forceNamespace,
          value: this.forceNamespace,
        });
      }

      return out;
    },

    allNavLinks() {
      if ( !this.$store.getters['cluster/schemaFor'](UI.NAV_LINK) ) {
        return [];
      }

      return this.$store.getters['cluster/all'](UI.NAV_LINK);
    },

    allGroups() {
      const arr = [];

      this.allNavLinks.forEach((item) => {
        if (item.spec?.group) {
          arr.push(item.spec.group);
        }
      });

      return Array.from(new Set(arr));
    },

    suggestionGroups() {
      const f = this.value.spec.group || '';

      return this.allGroups.filter((item) => {
        return item.includes(f);
      });
    }
  },

  methods: {
    updateURL(neu) {
      if (neu === 'toURL' && this.value.spec.toService) {
        delete this.value.spec.toService;
      }
      if (neu === 'toService' && !this.value.spec.toService) {
        this.$set(this.value.spec, 'toService', {});
      }

      this.url = neu;
    },

    updateGroup(neu) {
      this.group = neu;
    },

    updateTarget(neu) {
      if (neu === 'iframe') {
        this.value.spec.target = '_self';
        this.value.metadata.labels[NAVLINK_IFRAME] = 'true';
      } else {
        this.value.spec.target = `_${ neu }`;
        delete this.value.metadata.labels[NAVLINK_IFRAME];
      }

      this.target = neu;
    },

    onImageSelected(value) {
      this.$set(this.value.spec, 'iconSrc', value);
    },

    willSave() {
      const errors = [];

      if (!this.value.metadata.name) {
        errors.push(this.t('validation.required', { key: this.t('navlink.name.label') }, true));
      }

      if (this.url === 'toURL') {
        if (!this.value.spec.toURL) {
          errors.push(this.t('validation.required', { key: this.t('navlink.url.label') }, true));
        }
      } else {
        if (!this.value.spec.toService.name) {
          errors.push(this.t('validation.required', { key: this.t('navlink.url.service.name.label') }, true));
        }
        if (!this.value.spec.toService.namespace) {
          errors.push(this.t('validation.required', { key: this.t('navlink.url.service.namespace.label') }, true));
        }
        if (!this.value.spec.toService.path) {
          errors.push(this.t('validation.required', { key: this.t('navlink.url.service.path.label') }, true));
        }
        if (!this.value.spec.toService.port) {
          errors.push(this.t('validation.required', { key: this.t('navlink.url.service.port.label') }, true));
        }
        if (!this.value.spec.toService.scheme) {
          errors.push(this.t('validation.required', { key: this.t('navlink.url.service.scheme.label') }, true));
        }
      }

      if (this.group) {
        if (!this.value.spec.group) {
          errors.push(this.t('validation.required', { key: this.t('navlink.group.name.label') }, true));
        }
      }

      if (errors.length > 0) {
        return Promise.reject(errors);
      } else {
        return Promise.resolve();
      }
    },
  },

  created() {
    if (!this.value.spec) {
      this.$set(this.value, 'spec', {});
    }

    if (this.value.isIframe) {
      this.$set(this, 'target', 'iframe');
    }

    if (this.value.spec.group) {
      this.$set(this, 'group', true);
    }

    if (this.value.spec.toService) {
      this.$set(this, 'url', 'toService');
    }

    if (this.registerBeforeHook) {
      this.registerBeforeHook(this.willSave, 'willSave');
    }
  },
};
</script>

<template>
  <form>
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledInput
          v-model="value.metadata.name"
          :mode="mode"
          required
          :label="t('navlink.name.label')"
          :placeholder="t('navlink.name.placeholder')"
        />
      </div>
      <div class="col span-6">
        <RadioGroup
          :mode="mode"
          :value="target"
          name="target"
          :options="['self', 'blank', 'iframe']"
          :labels="[t('navlink.target.self'), t('navlink.target.blank'), t('navlink.target.iframe')]"
          @input="updateTarget"
        />
      </div>
    </div>

    <h2>{{ t('navlink.url.label') }}</h2>
    <div class="row mb-20">
      <div class="col span-4">
        <RadioGroup
          :mode="mode"
          :value="url"
          name="url"
          :options="['toURL', 'toService']"
          :labels="['To URL', 'To Service']"
          @input="updateURL"
        />
      </div>
    </div>

    <div v-if="url === 'toURL'" class="row mb-20">
      <div class="col span-12">
        <LabeledInput
          v-model="value.spec.toURL"
          :mode="mode"
          required
          :label="t('navlink.url.label')"
          :placeholder="t('navlink.url.placeholder', {}, true)"
        />
      </div>
    </div>
    <div v-else class="row mb-20">
      <div class="col span-2">
        <LabeledInput
          v-model="value.spec.toService.name"
          :mode="mode"
          required
          :label="t('navlink.url.service.name.label')"
          :placeholder="t('navlink.url.service.name.placeholder')"
        />
      </div>
      <div class="col span-3">
        <LabeledSelect
          v-model="value.spec.toService.namespace"
          :mode="mode"
          required
          :label="t('navlink.url.service.namespace.label')"
          :options="namespaces"
          :option-label="optionLabel"
        />
      </div>
      <div class="col span-3">
        <LabeledInput
          v-model="value.spec.toService.path"
          :mode="mode"
          required
          :label="t('navlink.url.service.path.label')"
          :placeholder="t('navlink.url.service.path.placeholder')"
        />
      </div>
      <div class="col span-2">
        <LabeledInput
          v-model="value.spec.toService.port"
          :mode="mode"
          required
          :label="t('navlink.url.service.port.label')"
          :placeholder="t('navlink.url.service.port.placeholder')"
        />
      </div>
      <div class="col span-2">
        <LabeledInput
          v-model="value.spec.toService.scheme"
          :mode="mode"
          required
          :label="t('navlink.url.service.scheme.label')"
          :placeholder="t('navlink.url.service.scheme.placeholder')"
        />
      </div>
    </div>

    <h2>{{ t('navlink.group.title') }}</h2>
    <div class="row mb-20">
      <div class="col span-4">
        <RadioGroup
          :mode="mode"
          :value="group"
          name="group"
          :options="[true, false]"
          :labels="[t('generic.enable'), t('generic.disabled')]"
          @input="updateGroup"
        />
      </div>
    </div>

    <template v-if="group">
      <div class="row mb-20">
        <div class="col span-6">
          <LabeledInputSugget
            v-model="value.spec.group"
            :placeholder="t('navlink.group.name.placeholder')"
            required
            :mode="mode"
            :text-label="t('navlink.group.name.label')"
            :searchable="true"
            :options="suggestionGroups"
          />
        </div>
        <div class="col span-6">
          <LabeledInput
            v-model="value.spec.description"
            :mode="mode"
            :label="t('navlink.group.description.label')"
            :placeholder="t('navlink.group.description.placeholder', {}, true)"
          />
        </div>
      </div>

      <div class="row mb-20">
        <div class="col span-6">
          <LabeledInput
            v-model="value.spec.label"
            :mode="mode"
            :label="t('navlink.group.label.label')"
            :placeholder="t('navlink.group.label.placeholder', {}, true)"
          />
        </div>
        <div class="col span-6">
          <LabeledInput
            v-model="value.spec.sideLabel"
            :mode="mode"
            :label="t('navlink.group.sideLabel.label')"
            :placeholder="t('navlink.group.sideLabel.placeholder', {}, true)"
          />
        </div>
      </div>
      <div class="row mb-20">
        <div class="col span-12">
          <UploadImageToBase64
            :img-src="value.spec.iconSrc"
            :mode="mode"
            :label="t('navlink.group.uploader.label')"
            @selected="onImageSelected"
          />
        </div>
      </div>
    </template>

    <Labels
      default-section-class="mt-20"
      :value="value"
      :mode="mode"
      :display-side-by-side="false"
    />

    <Footer :mode="mode" :errors="errors" @save="save" @done="done" />
  </form>
</template>

<style scoped lang='scss'>
  .pipelines {
    display: flex;

    .embed-pipelines {
      flex: 1;
    }
  }
</style>
