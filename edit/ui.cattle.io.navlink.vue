<script>
import CreateEditView from '@/mixins/create-edit-view';
import Footer from '@/components/form/Footer';
import LabeledInput from '@/components/form/LabeledInput';
import LabeledSelect from '@/components/form/LabeledSelect';
import LabeledInputSugget from '@/components/form/LabeledInputSugget';
import RadioGroup from '@/components/form/RadioGroup';
import FileSelector from '@/components/form/FileSelector';
import SimpleBox from '@/components/SimpleBox';
import Checkbox from '@/components/form/Checkbox';
import Tabbed from '@/components/Tabbed';
import Tab from '@/components/Tabbed/Tab';
import Labels from '@/components/form/Labels';
import { sortBy } from '@/utils/sort';
import { NAMESPACE, UI } from '@/config/types';
import { mapGetters } from 'vuex';

const NAVLINK_IFRAME = 'navlink.pandaria.io/iframe';

export default {
  name:       'EditNavLink',
  props: {
    namespace: {
      type:    String,
      default: 'default',
    },
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
    LabeledInput, LabeledSelect, LabeledInputSugget, RadioGroup, Labels, Footer, FileSelector, SimpleBox, Checkbox, Tabbed, Tab
  },

  mixins: [CreateEditView],

  data() {
    return {
      target: '_self', group: false, url: 'toURL', groupNameChoices: null, customizeIcon: false, errors: []
    };
  },

  computed: {
    ...mapGetters({ theme: 'prefs/theme' }),
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

      return Array.from(new Set(arr)).sort();
    },
  },

  methods: {
    updateURL(neu) {
      if (neu === 'toURL' && this.value.spec.toService) {
        delete this.value.spec.toService;
      }
      if (neu === 'toService' && !this.value.spec.toService) {
        this.$set(this.value.spec, 'toService', { namespace: this.namespace });
      }

      this.url = neu;
    },

    updateGroup(neu) {
      this.group = neu;
    },

    updateGroupNameChoices(neu) {
      this.$set(this, 'groupNameChoices', this.allGroups.filter((item) => {
        return item.includes(neu);
      }));
    },

    updateTarget(neu) {
      if (neu === '_iframe') {
        this.value.spec.target = '_self';
        if (this.value.metadata.labels) {
          this.value.metadata.labels[NAVLINK_IFRAME] = 'true';
        } else {
          this.value.metadata.labels = { [NAVLINK_IFRAME]: 'true' };
        }
      } else {
        this.value.spec.target = neu;
        this.value.metadata?.labels?.[NAVLINK_IFRAME] && delete this.value.metadata.labels[NAVLINK_IFRAME];
      }

      this.target = neu;
    },

    updateIcon(value) {
      this.$set(this.value.spec, 'iconSrc', value);
    },

    removeGroup() {
      const {
        group, description, label, sideLabel
      } = this.value.spec;

      group && delete this.value.spec.group;
      description && delete this.value.spec.description;
      label && delete this.value.spec.label;
      sideLabel && delete this.value.spec.sideLabel;

      this.removeIcon();
    },

    removeIcon() {
      const { iconSrc } = this.value.spec;

      iconSrc && delete this.value.spec.iconSrc;
    },

    removeUrl() {
      const { toURL } = this.value.spec;

      toURL && delete this.value.spec.toURL;
    },

    willSave() {
      const valid = this.validation();

      if (!valid) {
        return Promise.reject(this.errors);
      } else {
        this.saveFormatValue();

        return Promise.resolve();
      }
    },

    saveFormatValue() {
      if (!this.group) {
        this.removeGroup();
      }

      if (!this.customizeIcon) {
        this.removeIcon();
      }

      if (this.value.spec.toService) {
        this.removeUrl();
      }
    },

    validation() {
      const errors = [...this.errors];

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
        } else {
          const reg = /[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*/;

          if (!reg.test(this.value.spec.group)) {
            errors.push(this.t('navlink.group.name.unavailable'));
          }
        }
      }

      if (errors.length > 0) {
        this.$set(this, 'errors', errors);

        return false;
      } else {
        return true;
      }
    },

    setError(e) {
      this.errors = [];
      this.errors.push(e);
    },
  },

  created() {
    if (!this.value.spec) {
      this.$set(this.value, 'spec', {});
    }

    if (this.value.isIframe) {
      this.$set(this, 'target', '_iframe');
    } else if (this.value.actualTarget) {
      this.$set(this, 'target', this.value.actualTarget);
    }

    if (this.value.spec.group) {
      this.$set(this, 'group', true);
    }

    if (this.value.spec.iconSrc) {
      this.$set(this, 'customizeIcon', true);
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
          :disabled="mode === 'edit'"
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
          :options="['_self', '_blank', '_iframe']"
          :labels="[t('navlink.target.self'), t('navlink.target.blank'), t('navlink.target.iframe')]"
          @input="updateTarget"
        />
      </div>
    </div>

    <Tabbed :side-tabs="true" default-tab="url">
      <Tab name="url" label-key="navlink.url.label">
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
              :placeholder="t('navlink.url.service.namespace.placeholder')"
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
              type="number"
              min="1"
              max="65535"
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
      </Tab>

      <Tab name="group" label-key="navlink.group.title">
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
                :options="groupNameChoices || allGroups"
                @input="updateGroupNameChoices"
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
          <h3 class="mt-40 mb-5 pb-5">
            {{ t('navlink.group.uploader.label') }}
          </h3>
          <label class="text-label">
            {{ t('navlink.group.uploader.tip', {}, true) }}
          </label>

          <div class="row mt-10 mb-20">
            <Checkbox v-model="customizeIcon" :label="t('navlink.group.uploader.useCustom')" :mode="mode" />
          </div>

          <div v-if="customizeIcon" class="row mb-20">
            <div class="col icon-container span-6">
              <div class="mb-10">
                <FileSelector
                  :byte-limit="200000"
                  :read-as-data-url="true"
                  class="role-secondary"
                  :label="t('navlink.group.uploader.upload')"
                  :mode="mode"
                  @error="setError"
                  @selected="updateIcon($event, 'uiFavicon')"
                />
              </div>
              <SimpleBox v-if="value.spec.iconSrc" class="mb-10" :class="[`theme-${theme}`]">
                <label class="text-muted">{{ t('navlink.group.uploader.preview') }}</label>
                <img class="icon-preview" :src="value.spec.iconSrc" />
              </SimpleBox>
            </div>
          </div>
        </template>
      </Tab>

      <Tab name="labels" label-key="generic.labelsAndAnnotations">
        <Labels
          default-section-class="mt-20"
          :value="value"
          :mode="mode"
          :display-side-by-side="false"
        />
      </Tab>
    </Tabbed>

    <Footer :mode="mode" :errors="errors" @save="save" @done="done" />
  </form>
</template>

<style scoped lang='scss'>
  .icon-container {
    display: flex;
    flex-direction: column;

    ::v-deep.simple-box {
      position: relative;
      flex: 1;
      max-height: 120px;

      .content {
        height: 100%;
        display: flex;
      }

      .icon-preview {
        max-width: 100%;
      }
    }

    & LABEL {
      position: absolute;
      top: 10px;
      left: 10px;
      margin: 0;
      font-size: 14px;
    }
  }
</style>
