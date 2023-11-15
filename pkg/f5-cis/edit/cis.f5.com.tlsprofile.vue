<template>
  <CruResource
    ref="cru"
    :done-route="doneRoute"
    :mode="mode"
    :resource="value"
    :subtypes="[]"
    :validation-passed="validationPassed"
    :errors="errors"
    @error="e=>errors = e"
    @finish="save"
    @cancel="done"
  >
    <NameNsDescription
      :value="value"
      :mode="mode"
      :register-before-hook="registerBeforeHook"
    />
    <Tabbed
      ref="tlsProfileTabbed"
      class="tls-profile-tabs"
      :show-tabs-add-remove="true"
      :default-tab="defaultTab"
      :flat="true"
      @changed="changed"
    >
      <Tab
        :label="t('f5cis.tlsProfile.label')"
        name="tlsProfile"
        :weight="Number.POSITIVE_INFINITY"
      >
        <Tabbed :side-tabs="true">
          <Tab
            name="labels"
            label-key="generic.labelsAndAnnotations"
            :weight="99"
          >
            <Labels
              v-model="value"
              :mode="mode"
            />
          </Tab>
          <Tab
            :label="t('f5cis.tlsProfile.titles.hosts')"
            name="hosts"
            :weight="98"
            :error="tabErrors.hosts"
          >
            <div class="row mb-20">
              <div class="col span-6">
                <ArrayList
                  v-model="value.spec.hosts "
                  :title="t('f5cis.tlsProfile.form.hosts.label')"
                  :add-label="t('f5cis.tlsProfile.form.hosts.addLabel')"
                  :mode="mode"
                  :protip="false"
                />
              </div>
            </div>
            <div class="spacer" />
          </Tab>
          <Tab
            name="tls"
            label-key="f5cis.tlsProfile.titles.tls"
            :weight="97"
          >
            <div class="row mb-20">
              <div class="col span-6">
                <LabeledSelect
                  v-model="value.spec.tls.reference"
                  required
                  :label="t('f5cis.tlsProfile.form.reference.label')"
                  :options="referenceOptions"
                  :mode="mode"
                />
              </div>
              <div class="col span-6">
                <LabeledSelect
                  v-model="value.spec.tls.termination"
                  required
                  :label="t('f5cis.tlsProfile.form.termination.label')"
                  :options="terminationOptions"
                  :mode="mode"
                />
              </div>
            </div>
            <div class="row mb-20">
              <div class="col span-6">
                <LabeledInput
                  v-model="value.spec.tls.clientSSL"
                  :mode="mode"
                  :label="t('f5cis.tlsProfile.form.clientSSL.label')"
                />
              </div>
              <div class="col span-6">
                <LabeledInput
                  v-model="value.spec.tls.serverSSL"
                  :mode="mode"
                  :label="t('f5cis.tlsProfile.form.serverSSL.label')"
                />
              </div>
            </div>
          </Tab>
        </Tabbed>
      </Tab>
    </Tabbed>
  </CruResource>
</template>
<script>
import CreateEditView from '@shell/mixins/create-edit-view';
import CruResource from '@shell/components/CruResource';
import NameNsDescription from '@shell/components/form/NameNsDescription';
import Tab from '@shell/components/Tabbed/Tab';
import Tabbed from '@shell/components/Tabbed';
import Labels from '@shell/components/form/Labels';
import cloneDeep from 'lodash/cloneDeep';
import { LabeledInput } from '@components/Form/LabeledInput';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import ArrayList from '@shell/components/form/ArrayList';
import { allHash } from '@shell/utils/promise';
import { mapGetters } from 'vuex';
import FormValidation from '@shell/mixins/form-validation';
import { cleanUp } from '@shell/utils/object';
import isString from 'lodash/isString';
import isNumber from 'lodash/isNumber';
import isPlainObject from 'lodash/isPlainObject';

const specTemplate = {
  hosts: [],
  tls:   {
    clientSSL:   '',
    reference:   'bigip',
    serverSSL:   '',
    termination: ''
  },

};

export default {
  mixins:     [CreateEditView, FormValidation],
  components: {
    CruResource,
    NameNsDescription,
    Tab,
    Tabbed,
    Labels,
    LabeledInput,
    LabeledSelect,
    ArrayList,
  },
  async fetch() {
    const hash = await allHash({ tlsProfiles: this.$store.dispatch('cluster/findAll', { type: 'cis.f5.com.tlsprofile' }) });

    this.tlsProfiles = hash.tlsProfiles;
  },
  data() {
    return { tlsProfiles: [], tabErrors: {} };
  },

  computed: {
    ...mapGetters(['namespaces']),
    referenceOptions() {
      return ['bigip', 'secret', 'hybrid'].map((item) => ({ value: item, label: this.t(`f5cis.tlsProfile.form.reference.options.${ item }`) }));
    },
    terminationOptions() {
      return ['edge', 'reencrypt', 'passthrough'].map((item) => ({ value: item, label: this.t(`f5cis.tlsProfile.form.termination.options.${ item }`) }));
    },
    activeNamespaces() {
      return Object.entries(this.namespaces()).filter(([_, a]) => a).map(([n]) => n);
    },
    validationPassed() {
      const result = [];

      result.push(!!this.value.name);

      return result.every((v) => v === true);
    },
    defaultTab() {
      return 'tlsProfile';
    },
    tlsProfileNameOptions() {
      return this.tlsProfiles.map((p) => ({
        name:  p.metadata.name,
        label: p.metadata.name
      }));
    },
  },
  created() {
    if (!this.value.spec) {
      const spec = cloneDeep(specTemplate);

      this.$set(this.value, 'spec', spec);
    }

    if (this.value.metadata.labels.f5cr !== 'true') {
      this.$set(this.value.metadata.labels, 'f5cr', 'true');
    }

    this.registerBeforeHook(this.willSave, 'willSave');
  },
  methods: {
    valueRequired(value, name, type = 'string') {
      if (type === 'string') {
        if (value?.trim() === '') {
          return this.t('f5cis.errors.required', { name });
        }

        return;
      }
      if (type === 'int') {
        const v = parseInt(value, 10);

        if (Number.isNaN(v)) {
          return this.t('f5cis.errors.required', { name });
        }
      }
    },
    willSave() {
      this.errors = [];
      const errors = [];

      errors.push(this.valueRequired(this.value.spec.tls.termination, `tls.termination`));
      const messages = errors.filter((e) => e);

      if (messages.length > 0) {
        this.errors.push(...messages);
        throw new Error(this.errors.join('\n'));
      }
      this.removeEmptyProps(this.value);
      if (this.value.metadata.labels.f5cr !== 'true') {
        this.$set(this.value.metadata.labels, 'f5cr', 'true');
      }
    },
    filterByCurrentResourceNamespace(resources) {
      return resources.filter((resource) => {
        return resource.metadata.namespace === this.value.metadata.namespace;
      });
    },
    updateServiceNamespace(p) {
      p.serviceNamespace = this.value.metadata.namespace;
    },
    changed() {},
    cleanEmptyProps(obj) {
      if (Array.isArray(obj)) {
        obj.forEach((item) => {
          if (isPlainObject(item) || Array.isArray(item)) {
            this.cleanEmptyProps(item);
          }
        });

        return;
      }
      Object.keys(obj).filter((k) => !k.startsWith('_') && !k.startsWith('$') && k !== 'links' && k !== 'actions')
        .forEach((k) => {
          const v = obj[k];

          if (isString(v) && v === '') {
            delete obj[k];
          } else if (isNumber(v) && v === 0) {
            delete obj[k];
          } else if (isPlainObject(v) || Array.isArray(v)) {
            this.cleanEmptyProps(v);
          }
        });
    },
    removeEmptyProps(obj) {
      cleanUp(obj);
      this.cleanEmptyProps(obj);
    }
  }

};
</script>
<style lang="scss" scoped>

.tls-profile-tabs {
  > ::v-deep .tabs.horizontal {
    border-bottom: 1px solid var(--border);
    margin-bottom: 10px;
  }
}
.tablist-controls {
  .role-link {
    padding: 10px 15px;
    min-height: unset;
    line-height: unset;

    &:focus {
      background: none;
      box-shadow: none;
    }

    &:hover {
      border: none;
    }
  }

}
.monitor {
  position: relative;
  padding: 10px 25px 10px 10px;
  border: 2px solid var(--tabbed-border);
  border-radius: var(--border-radius);
  & > .remove {
    position: absolute;
    top: 0;
    right: 0;
  }
}

</style>
