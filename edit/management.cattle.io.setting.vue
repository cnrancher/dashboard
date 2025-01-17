<script>
import CruResource from '@/components/CruResource';
import LabeledInput from '@/components/form/LabeledInput';
import LabeledSelect from '@/components/form/LabeledSelect';
import CreateEditView from '@/mixins/create-edit-view';
import TextAreaAutoGrow from '@/components/form/TextAreaAutoGrow';

import { ALLOWED_SETTINGS, SETTING } from '@/config/settings';
import RadioGroup from '@/components/form/RadioGroup';
import { setBrand } from '@/config/private-label';
import { MANAGEMENT } from '@/config/types';

const URL_DOMAIN_REG = /[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+\.?/;

export default {
  components: {
    CruResource,
    LabeledInput,
    LabeledSelect,
    RadioGroup,
    TextAreaAutoGrow
  },

  mixins: [CreateEditView],

  data() {
    const t = this.$store.getters['i18n/t'];
    const setting = ALLOWED_SETTINGS[this.value.id];

    let enumOptions = [];

    if (setting.kind === 'enum' ) {
      enumOptions = setting.options.map(id => ({
        label: `advancedSettings.enum.${ this.value.id }.${ id }`,
        value: id,
      }));
    } else if (setting.kind === 'enum-map') {
      enumOptions = Object.entries(setting.options).map(e => ({
        label: e[1],
        value: e[0],
      }));
    }

    const canReset = setting.canReset || !!this.value.default;

    this.value.value = this.value.value || this.value.default;
    const originValue = this.value.value;

    return {
      setting,
      description: t(`advancedSettings.descriptions.${ this.value.id }`),
      editHelp:    t(`advancedSettings.editHelp.${ this.value.id }`),
      enumOptions,
      canReset,
      errors:      [],
      originValue,
    };
  },

  created() {
    this.registerBeforeHook(this.willSave, 'willSave');
  },

  methods: {
    saveSettings(done) {
      const t = this.$store.getters['i18n/t'];

      // Validate the JSON if the setting is a json value
      if (this.setting.kind === 'json') {
        try {
          JSON.parse(this.value.value);
          this.errors = [];
        } catch (e) {
          this.errors = [t('advancedSettings.edit.invalidJSON')];

          return done(false);
        }
      }

      if (this.value?.id === SETTING.BRAND) {
        setBrand(this.value.value);
      }

      this.save(done);
    },

    useDefault(ev) {
      // Lose the focus on the button after click
      if (ev && ev.srcElement) {
        ev.srcElement.blur();
      }
      this.value.value = this.value.default;
    },
    async willSave() {
      if (this.value?.id === SETTING.AUDIT_LOG_SERVER_URL) {
        const s = await this.$store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.WHITELIST_DOMAIN);
        let values = s?.value?.split(',') ?? [];

        if (this.originValue) {
          const originDomain = URL_DOMAIN_REG.exec(this.originValue)?.[0] ?? '';

          if (originDomain !== 'forums.rancher.com') {
            values = values.filter(v => v !== originDomain);
          }
        }
        const v = this.value.value?.trim();

        if (v) {
          const newDomain = URL_DOMAIN_REG.exec(v)?.[0] ?? v;

          values.push(newDomain);
        }

        s.value = [...new Set(values)].filter(v => v).join(',');

        return s.save();
      }
    }
  }
};
</script>

<template>
  <CruResource
    class="route"
    :done-route="'c-cluster-product-resource'"
    :errors="errors"
    :mode="mode"
    :resource="value"
    :subtypes="[]"
    :can-yaml="false"
    @error="e=>errors = e"
    @finish="saveSettings"
    @cancel="done"
  >
    <h4 v-html="description" />

    <h5 v-if="editHelp" class="edit-help" v-html="editHelp" />

    <div class="edit-change mt-20">
      <h5 v-t="'advancedSettings.edit.changeSetting'" />
      <button :disabled="!canReset" type="button" class="btn role-primary" @click="useDefault">
        {{ t('advancedSettings.edit.useDefault') }}
      </button>
    </div>

    <div class="mt-20">
      <div v-if="setting.kind === 'enum'">
        <LabeledSelect
          v-model="value.value"
          :label="t('advancedSettings.edit.value')"
          :localized-label="true"
          :mode="mode"
          :options="enumOptions"
        />
      </div>
      <div v-else-if="setting.kind === 'enum-map'">
        <LabeledSelect
          v-model="value.value"
          :label="t('advancedSettings.edit.value')"
          :mode="mode"
          :options="enumOptions"
        />
      </div>
      <div v-else-if="setting.kind === 'boolean'">
        <RadioGroup
          v-model="value.value"
          name="settings_value"
          :labels="[t('advancedSettings.edit.trueOption'), t('advancedSettings.edit.falseOption')]"
          :options="['true', 'false']"
        />
      </div>
      <div v-else-if="setting.kind === 'multiline' || setting.kind === 'json'">
        <TextAreaAutoGrow
          v-model="value.value"
          v-focus
          :min-height="254"
        />
      </div>
      <div v-else>
        <LabeledInput
          v-model="value.value"
          v-focus
          :label="t('advancedSettings.edit.value')"
        />
      </div>
    </div>
  </CruResource>
</template>

<style lang="scss" scoped>
  .edit-change {
    align-items: center;
    display: flex;

    > h5 {
      flex: 1;
    }
  }

  ::v-deep .edit-help code {
    padding: 1px 5px;
  }
</style>
