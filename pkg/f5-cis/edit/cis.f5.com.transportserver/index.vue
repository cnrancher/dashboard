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
      ref="transportServerTabbed"
      class="transport-server-tabs"
      :show-tabs-add-remove="true"
      :default-tab="defaultTab"
      :flat="true"
      @changed="changed"
    >
      <Tab
        :label="t('f5cis.transportServer.label')"
        name="transportServer"
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
            :label="t('f5cis.transportServer.titles.general')"
            name="general"
            :weight="98"
            :error="tabErrors.general"
          >
            <div class="row mb-20">
              <div class="col span-6">
                <LabeledSelect
                  v-model="value.spec.type"
                  :label="t('f5cis.transportServer.form.type.label')"
                  :options="typeOptions"
                  :mode="mode"
                />
              </div>
              <div class="col span-6">
                <LabeledInput
                  v-model="value.spec.host"
                  :label="t('f5cis.transportServer.form.host.label')"
                  :mode="mode"
                />
              </div>
            </div>
            <div class="row mb-20">
              <div class="col span-6">
                <LabeledInput
                  v-model="value.spec.ipamLabel"
                  :label="t('f5cis.transportServer.form.ipamLabel.label')"
                  :mode="mode"
                />
              </div>
              <div class="col span-6">
                <LabeledSelect
                  v-model="value.spec.mode"
                  :label="t('f5cis.transportServer.form.mode.label')"
                  :options="modeOptions"
                  :mode="mode"
                  required
                />
              </div>
            </div>
            <div class="row mb-20">
              <div class="col span-6">
                <LabeledInput
                  v-model="value.spec.virtualServerAddress"
                  :mode="mode"
                  :label="t('f5cis.transportServer.form.virtualServerAddress.label')"
                />
              </div>
              <div class="col span-6">
                <LabeledInput
                  v-model="value.spec.virtualServerName"
                  :mode="mode"
                  :label="t('f5cis.transportServer.form.virtualServerName.label')"
                />
              </div>
            </div>
            <div class="row mb-20">
              <div class="col span-6">
                <LabeledInput
                  v-model.number="value.spec.virtualServerPort"
                  required
                  type="number"
                  :mode="mode"
                  :label="t('f5cis.transportServer.form.virtualServerPort.label')"
                />
              </div>
            </div>
          </Tab>
        </Tabbed>
      </Tab>
      <Tab
        label-key="f5cis.transportServer.pool.label"
        name="pool"
        :weight="95"
      >
        <Tabbed :side-tabs="true">
          <Tab
            label-key="f5cis.transportServer.titles.general"
            name="general"
            :weight="99"
          >
            <div class="row mb-20">
              <div class="col span-6">
                <LabeledInput
                  v-model="value.spec.pool.name"
                  :mode="mode"
                  :label="t('f5cis.transportServer.form.pool.name.label')"
                />
              </div>
            </div>

            <NamespaceServiceSelect
              class="mb-20"
              :namespaces="activeNamespaces"
              :services="allServices"
              :init-namespace="value.spec.pool.serviceNamespace"
              :init-service="value.spec.pool.service"
              :init-service-port="value.spec.pool.servicePort"
              :mode="mode"
              @update-namespace="value.spec.pool.serviceNamespace = $event"
              @update-service="value.spec.pool.service = $event"
              @update-service-port="value.spec.pool.servicePort = $event"
            />
          </Tab>
          <Tab
            :label="t('f5cis.transportServer.titles.monitor')"
            name="monitor"
            :weight="98"
          >
            <div
              v-if="value.spec.pool.monitor"
              class="monitor"
            >
              <button
                type="button"
                class="btn role-link close btn-sm remove"
                @click="removeMonitor(value.spec.pool)"
              >
                <i class="icon icon-x" />
              </button>
              <div class="row mb-20">
                <div class="col span-6">
                  <LabeledSelect
                    v-model="value.spec.pool.monitor.type"
                    :label="t('f5cis.transportServer.form.pool.monitor.type.label')"
                    :options="monitorTypeOptions"
                    :mode="mode"
                    required
                  />
                </div>
                <div class="col span-6">
                  <LabeledInput
                    v-model.number="value.spec.pool.monitor.interval"
                    required
                    type="number"
                    :label="t('f5cis.transportServer.form.pool.monitor.interval.label')"
                    :mode="mode"
                  />
                </div>
              </div>
              <div
                class="row mb-20"
              >
                <div class="col span-6">
                  <LabeledInput
                    v-model="value.spec.pool.monitor.recv"
                    :mode="mode"
                    :label="t('f5cis.transportServer.form.pool.monitor.recv.label')"
                  />
                </div>
                <div class="col span-6">
                  <LabeledInput
                    v-model="value.spec.pool.monitor.send"
                    required
                    :mode="mode"
                    :label="t('f5cis.transportServer.form.pool.monitor.send.label')"
                  />
                </div>
              </div>
              <div class="row mb-20">
                <div class="col span-6">
                  <LabeledInput
                    v-model.number="value.spec.pool.monitor.targetPort"
                    type="number"
                    :label="t('f5cis.transportServer.form.pool.monitor.targetPort.label')"
                    :mode="mode"
                  />
                </div>
                <div class="col span-6">
                  <LabeledInput
                    v-model.number="value.spec.pool.monitor.timeout"
                    type="number"
                    :label="t('f5cis.transportServer.form.pool.monitor.timeout.label')"
                    :mode="mode"
                  />
                </div>
              </div>
            </div>
            <ArrayListGrouped
              v-model="value.spec.pool.monitors"
              class="mt-20"
              :default-add-value="defaultMonitorValue"
              :mode="mode"
              :add-label="t('f5cis.transportServer.form.pool.monitor.addLabel')"
            >
              <template #default="{row}">
                <div class="row mb-20">
                  <div class="col span-6">
                    <LabeledSelect
                      v-model="row.value.type"
                      :label="t('f5cis.transportServer.form.pool.monitor.type.label')"
                      :options="monitorTypeOptions"
                      :mode="mode"
                      required
                    />
                  </div>
                  <div class="col span-6">
                    <LabeledInput
                      v-model.number="row.value.interval"
                      required
                      type="number"
                      :label="t('f5cis.transportServer.form.pool.monitor.interval.label')"
                      :mode="mode"
                    />
                  </div>
                </div>
                <div
                  class="row mb-20"
                >
                  <div class="col span-6">
                    <LabeledInput
                      v-model="row.value.recv"
                      :mode="mode"
                      :label="t('f5cis.transportServer.form.pool.monitor.recv.label')"
                    />
                  </div>
                  <div class="col span-6">
                    <LabeledInput
                      v-model="row.value.send"
                      required
                      :mode="mode"
                      :label="t('f5cis.transportServer.form.pool.monitor.send.label')"
                    />
                  </div>
                </div>
                <div class="row mb-20">
                  <div class="col span-6">
                    <LabeledInput
                      v-model.number="row.value.targetPort"
                      type="number"
                      :label="t('f5cis.transportServer.form.pool.monitor.targetPort.label')"
                      :mode="mode"
                    />
                  </div>
                  <div class="col span-6">
                    <LabeledInput
                      v-model.number="row.value.timeout"
                      type="number"
                      :label="t('f5cis.transportServer.form.pool.monitor.timeout.label')"
                      :mode="mode"
                    />
                  </div>
                </div>
              </template>
            </ArrayListGrouped>
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
import ArrayListGrouped from '@shell/components/form/ArrayListGrouped';
import { SERVICE } from '@shell/config/types';
import { allHash } from '@shell/utils/promise';
import { mapGetters } from 'vuex';
import NamespaceServiceSelect from '../../components/NamespaceServiceSelect.vue';
import FormValidation from '@shell/mixins/form-validation';
import { cleanUp } from '@shell/utils/object';
import isString from 'lodash/isString';
import isNumber from 'lodash/isNumber';
import isPlainObject from 'lodash/isPlainObject';

const monitorTemplate = {
  type:       '', // options: http, https,tcp
  interval:   5, // required
  recv:       '',
  send:       'GET /rn', // required
  targetPort: null,
  timeout:    16,
};
const poolTemplate = {
  name:             '',
  service:          '', // required, namespace -> service
  serviceNamespace: '', // namespace
  servicePort:      '',
  // monitor:             monitorTemplate,
  monitors:         [], // monitorTemplate
};

const specTemplate = {
  type:                 'tcp', // "tcp", "udp" or "sctp"
  allowSourceRange:     [],
  botDefense:           '',
  host:                 '',
  ipamLabel:            '',
  mode:                 'standard', // standard performance
  pool:                 poolTemplate,
  virtualServerAddress: '',
  virtualServerName:    '',
  virtualServerPort:    null,
};
const idKey = Symbol('pool id key');
const errorKey = Symbol('pool error key');

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
    ArrayListGrouped,
    NamespaceServiceSelect
  },
  async fetch() {
    const hash = await allHash({
      tlsProfiles: this.$store.dispatch('cluster/findAll', { type: 'cis.f5.com.tlsprofile' }),
      allServices: this.$store.dispatch('cluster/findAll', { type: SERVICE })
    });

    this.tlsProfiles = hash.tlsProfiles;
    this.allServices = hash.allServices;
  },
  data() {
    return {
      idKey,
      errorKey,
      id:                  0,
      tabErrors:           { general: null },
      tlsProfiles:         [],
      defaultMonitorValue: cloneDeep(monitorTemplate),
      allServices:         [],
    };
  },

  computed: {
    ...mapGetters(['namespaces']),
    activeNamespaces() {
      return Object.entries(this.namespaces()).filter(([_, a]) => a).map(([n]) => n);
    },
    validationPassed() {
      const result = [];

      result.push(!!this.value.name);

      return result.every((v) => v === true);
    },
    defaultTab() {
      return '';
    },
    typeOptions() {
      return ['tcp', 'udp', 'sctp'].map((v) => ({
        label: this.t(`f5cis.transportServer.form.type.options.${ v }`),
        value: v
      }));
    },
    modeOptions() {
      return ['standard', 'performance'].map((v) => ({
        label: this.t(`f5cis.transportServer.form.mode.options.${ v }`),
        value: v
      }));
    },
    icmpEchoOptions() {
      return ['enable', 'disable', 'selective'].map((v) => ({
        value: v,
        label: this.t(`f5cis.virtualServer.form.icmpEcho.options.${ v }`)
      }));
    },
    routeAdvertisementOptions() {
      return ['enable', 'disable', 'selective', 'always', 'any', 'all'].map((v) => ({
        value: v,
        label: this.t(`f5cis.virtualServer.form.routeAdvertisement.options.${ v }`)
      }));
    },
    monitorTypeOptions() {
      return ['http', 'https', 'tcp'].map((p) => ({ label: p, value: p }));
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
    removeMonitor(p) {
      this.$delete(p, 'monitor');
    },
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
      const p = this.value.spec.pool;
      const errors = [];

      errors.push(this.valueRequired(this.value.spec.virtualServerPort, `virtualServerPort`, 'int'));

      if (!p.monitor && p.monitors?.length === 1) {
        p.monitor = p.monitors[0];
        p.monitors = [];
      } else if (p.monitor && p.monitors?.length > 1) {
        p.monitors.splice(0, 0, p.monitor);
        this.$delete(p, 'monitor');
      }

      errors.push(this.valueRequired(p?.path, `pool.path`));
      errors.push(this.valueRequired(p?.service, `pool.service`));
      errors.push(this.valueRequired(p?.serviceNamespace, `pool.serviceNamespace`));
      const m = p?.monitor;

      if (m) {
        errors.push(this.valueRequired(m.type, `pool.monitor.type`));
        errors.push(this.valueRequired(m.interval, `pool.monitor.interval`, 'int'));
        this.valueRequired(m.send, `pool.monitor.send`);
      }

      p?.monitors?.forEach((m, j) => {
        errors.push(this.valueRequired(m.type, `pool.monitor.type`));
        errors.push(this.valueRequired(m.interval, `pool.monitor.interval`, 'int'));
        errors.push(this.valueRequired(m.send, `pool.monitor.send`));
      });

      const messages = errors.filter((e) => e);

      if (messages.length > 0) {
        this.errors.push(...messages);
        p[this.errorKey] = true;
      } else {
        p[this.errorKey] = false;
      }
      if (this.errors.length > 0) {
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

.transport-server-tabs {
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
