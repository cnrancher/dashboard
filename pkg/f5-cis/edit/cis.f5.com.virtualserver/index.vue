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
      ref="verturlServerTabbed"
      class="virtual-server-tabs"
      :show-tabs-add-remove="true"
      :default-tab="defaultTab"
      :flat="true"
      @changed="changed"
    >
      <Tab
        :label="t('f5cis.virtualServer.label')"
        name="virtualServer"
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
            :label="t('f5cis.virtualServer.titles.general')"
            name="general"
            :weight="98"
            :error="tabErrors.general"
          >
            <div class="row mb-20">
              <div class="col span-6">
                <LabeledInput
                  v-model="value.spec.virtualServerAddress "
                  :mode="mode"
                  :label="t('f5cis.virtualServer.form.virtualServerAddress.label')"
                />
              </div>
              <div class="col span-6">
                <LabeledInput
                  v-model.number="value.spec.virtualServerHTTPPort"
                  type="number"
                  :label="t('f5cis.virtualServer.form.virtualServerHTTPPort.label')"
                  :mode="mode"
                />
              </div>
            </div>
            <div class="row mb-20">
              <div class="col span-6">
                <LabeledInput
                  v-model.number="value.spec.virtualServerHTTPSPort"
                  type="number"
                  :label="t('f5cis.virtualServer.form.virtualServerHTTPSPort.label')"
                  :mode="mode"
                />
              </div>
              <div class="col span-6">
                <LabeledInput
                  v-model="value.spec.virtualServerName"
                  :mode="mode"
                  :label="t('f5cis.virtualServer.form.virtualServerName.label')"
                />
              </div>
            </div>
            <div class="row mb-20">
              <div class="col span-6">
                <LabeledSelect
                  v-model="value.spec.tlsProfileName"
                  :label="t('f5cis.virtualServer.form.tlsProfileName.label')"
                  :options="tlsProfileNameOptions"
                  :mode="mode"
                />
              </div>
              <div class="col span-6">
                <LabeledInput
                  v-model="value.spec.host"
                  :mode="mode"
                  :label="t('f5cis.virtualServer.form.host.label')"
                />
              </div>
            </div>
          </Tab>
        </Tabbed>
      </Tab>
      <Tab
        v-for="(p, i) in value.spec.pools"
        :key="p[idKey]"
        :label="p.name ? p.name : 'pool-' + i"
        :name="'name-' + p[idKey]"
        :weight="-p[idKey]"
        :error="!!p[errorKey]"
      >
        <Tabbed :side-tabs="true">
          <Tab
            :label="t('f5cis.virtualServer.titles.general')"
            name="general"
            :weight="99"
          >
            <template
              #tab-header-right
              class="tab-content-controls"
            >
              <button
                v-if="value.spec.pools.length > 1 && !isView"
                type="button"
                class="btn-sm role-link"
                @click="removePool(p)"
              >
                {{ t('f5cis.virtualServer.pool.removePool') }}
              </button>
            </template>
            <div class="row mb-20">
              <div class="col span-6">
                <LabeledInput
                  v-model="p.name"
                  :mode="mode"
                  :label="t('f5cis.virtualServer.form.pool.name.label')"
                />
              </div>
              <div class="col span-6">
                <LabeledInput
                  v-model="p.path"
                  :mode="mode"
                  :label="t('f5cis.virtualServer.form.pool.path.label')"
                  required
                />
              </div>
            </div>
            <div class="row mb-20">
              <div class="col span-6">
                <LabeledInput
                  v-model="p.hostRewrite"
                  :mode="mode"
                  :label="t('f5cis.virtualServer.form.pool.hostRewrite.label')"
                />
              </div>
              <div class="col span-6">
                <LabeledInput
                  v-model="p.rewrite"
                  :mode="mode"
                  :label="t('f5cis.virtualServer.form.pool.rewrite.label')"
                />
              </div>
            </div>
            <NamespaceServiceSelect
              class="mb-20"
              :namespaces="activeNamespaces"
              :services="allServices"
              :init-namespace="p.serviceNamespace"
              :init-service="p.service"
              :init-service-port="p.servicePort"
              :mode="mode"
              @update-namespace="p.serviceNamespace = $event"
              @update-service="p.service = $event"
              @update-service-port="p.servicePort = $event"
            />
          </Tab>
          <Tab
            :label="t('f5cis.virtualServer.titles.monitor')"
            name="monitor"
            :weight="98"
          >
            <div
              v-if="p.monitor"
              class="monitor"
            >
              <button
                type="button"
                class="btn role-link close btn-sm remove"
                @click="removeMonitor(p)"
              >
                <i class="icon icon-x" />
              </button>
              <div class="row mb-20">
                <div class="col span-6">
                  <LabeledSelect
                    v-model="p.monitor.type"
                    :label="t('f5cis.virtualServer.form.pool.monitor.type.label')"
                    :options="monitorTypeOptions"
                    :mode="mode"
                    required
                  />
                </div>
                <div class="col span-6">
                  <LabeledInput
                    v-model.number="p.monitor.interval"
                    required
                    type="number"
                    :label="t('f5cis.virtualServer.form.pool.monitor.interval.label')"
                    :mode="mode"
                  />
                </div>
              </div>
              <div
                class="row mb-20"
              >
                <div class="col span-6">
                  <LabeledInput
                    v-model="p.monitor.recv"
                    :mode="mode"
                    :label="t('f5cis.virtualServer.form.pool.monitor.recv.label')"
                  />
                </div>
                <div class="col span-6">
                  <LabeledInput
                    v-model="p.monitor.send"
                    required
                    :mode="mode"
                    :label="t('f5cis.virtualServer.form.pool.monitor.send.label')"
                  />
                </div>
              </div>
              <div class="row mb-20">
                <div class="col span-6">
                  <LabeledInput
                    v-model.number="p.monitor.targetPort"
                    type="number"
                    :label="t('f5cis.virtualServer.form.pool.monitor.targetPort.label')"
                    :mode="mode"
                  />
                </div>
                <div class="col span-6">
                  <LabeledInput
                    v-model.number="p.monitor.timeout"
                    type="number"
                    :label="t('f5cis.virtualServer.form.pool.monitor.timeout.label')"
                    :mode="mode"
                  />
                </div>
              </div>
            </div>
            <ArrayListGrouped
              v-model="p.monitors"
              class="mt-20"
              :default-add-value="defaultMonitorValue"
              :mode="mode"
              :add-label="t('f5cis.virtualServer.form.pool.monitor.addLabel')"
            >
              <template #default="{row}">
                <div class="row mb-20">
                  <div class="col span-6">
                    <LabeledSelect
                      v-model="row.value.type"
                      :label="t('f5cis.virtualServer.form.pool.monitor.type.label')"
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
                      :label="t('f5cis.virtualServer.form.pool.monitor.interval.label')"
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
                      :label="t('f5cis.virtualServer.form.pool.monitor.recv.label')"
                    />
                  </div>
                  <div class="col span-6">
                    <LabeledInput
                      v-model="row.value.send"
                      required
                      :mode="mode"
                      :label="t('f5cis.virtualServer.form.pool.monitor.send.label')"
                    />
                  </div>
                </div>
                <div class="row mb-20">
                  <div class="col span-6">
                    <LabeledInput
                      v-model.number="row.value.targetPort"
                      type="number"
                      :label="t('f5cis.virtualServer.form.pool.monitor.targetPort.label')"
                      :mode="mode"
                    />
                  </div>
                  <div class="col span-6">
                    <LabeledInput
                      v-model.number="row.value.timeout"
                      type="number"
                      :label="t('f5cis.virtualServer.form.pool.monitor.timeout.label')"
                      :mode="mode"
                    />
                  </div>
                </div>
              </template>
            </ArrayListGrouped>
          </Tab>
        </Tabbed>
      </Tab>
      <template #tab-row-extras>
        <li class="tablist-controls">
          <button
            v-if="!isView"
            type="button"
            class="btn-sm role-link"
            @click="addPool"
          >
            <i class="icon icon-plus pr-5" /> {{ t('f5cis.virtualServer.pool.addPool') }}
          </button>
        </li>
      </template>
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
  path:             '', // required
  rewrite:          '',
  service:          '', // required, namespace -> service
  serviceNamespace: '', // namespace
  servicePort:      '',
  hostRewrite:      '',
  // monitor:             monitorTemplate,
  monitors:         [], // monitorTemplate
};

const specTemplate = {
  host:                   '',
  pools:                  [],
  tlsProfileName:         '', // options: namespace -> TLSProfile
  virtualServerAddress:   '',
  virtualServerHTTPPort:  null,
  virtualServerHTTPSPort: null,
  virtualServerName:      '',
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
    tlsProfileNameOptions() {
      return this.tlsProfiles.map((p) => ({
        name:  p.metadata.name,
        label: p.metadata.name
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
    serviceOptions() {
      return this.filterByCurrentResourceNamespace(this.allServices)
        .map((service) => ({
          label: service.metadata.name,
          value: service.metadata.name,
          ports: service.spec.ports?.map((p) => p.port)
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
      this.addPool();
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
      this.value.spec.pools.forEach((p, i) => {
        const errors = [];

        if (!p.monitor && p.monitors?.length === 1) {
          p.monitor = p.monitors[0];
          p.monitors = [];
        } else if (p.monitor && p.monitors?.length > 1) {
          p.monitors.splice(0, 0, p.monitor);
          this.$delete(p, 'monitor');
        }

        errors.push(this.valueRequired(p?.path, `pool[${ i }].path`));
        errors.push(this.valueRequired(p?.service, `pool[${ i }].service`));
        errors.push(this.valueRequired(p?.serviceNamespace, `pool[${ i }].serviceNamespace`));
        const m = p?.monitor;

        if (m) {
          errors.push(this.valueRequired(m.type, `pool[${ i }].monitor.type`));
          errors.push(this.valueRequired(m.interval, `pool[${ i }].monitor.interval`, 'int'));
          this.valueRequired(m.send, `pool[${ i }].monitor.send`);
        }
        const t = m ? 1 : 0;

        p?.monitors?.forEach((m, j) => {
          errors.push(this.valueRequired(m.type, `pool[${ i }].monitor[${ j + t }].type`));
          errors.push(this.valueRequired(m.interval, `pool[${ i }].monitor[${ j + t }].interval`, 'int'));
          errors.push(this.valueRequired(m.send, `pool[${ i }].monitor[${ j + t }].send`));
        });
        const messages = errors.filter((e) => e);

        if (messages.length > 0) {
          this.errors.push(...messages);
          p[this.errorKey] = true;
        } else {
          p[this.errorKey] = false;
        }
      });
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
    addPool() {
      const pool = cloneDeep(poolTemplate);

      pool.serviceNamespace = this.value?.metadata?.namespace ?? '';
      pool[this.idKey] = this.genId();
      this.value.spec.pools.push(pool);
    },
    removePool(p) {
      const idx = this.value.spec.pools.indexOf(p);

      if (idx >= 0) {
        this.value.spec.pools.splice(idx, 1);
      }
    },
    genId() {
      const id = this.id + 1;

      this.id = id;

      return id;
    },
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

.virtual-server-tabs {
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
