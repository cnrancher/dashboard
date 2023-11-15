<template>
  <div class="row">
    <div class="col span-4">
      <LabeledSelect
        v-model="namespace"
        required
        :options="nsOptions"
        :mode="mode"
        :label="t('namespace.label')"
        :placeholder="t('namespace.selectNamespace')"
      />
    </div>
    <div class="col span-4">
      <LabeledSelect
        v-model="service"
        required
        :options="serviceNameOptions"
        :mode="mode"
        :label="t('f5cis.virtualServer.form.pool.serviceName.label')"
      />
    </div>
    <div
      v-show="showServicePort"
      class="col span-4"
    >
      <LabeledInput
        v-if="portOptions.length === 0 || isView"
        v-model.number="servicePort"
        :mode="mode"
        :label="t('f5cis.virtualServer.form.pool.serciePort.label')"
      />
      <LabeledSelect
        v-else
        v-model="servicePort"
        :mode="mode"
        :options="portOptions"
        :label="t('f5cis.virtualServer.form.pool.serciePort.label')"
      />
    </div>
  </div>
</template>

<script>
import { _EDIT, _VIEW } from '@shell/config/query-params';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { LabeledInput } from '@components/Form/LabeledInput';

export default {
  components: { LabeledSelect, LabeledInput },
  props:      {
    mode: {
      type:    String,
      default: _EDIT,
    },
    initNamespace: {
      type:    String,
      default: ''
    },
    initService: {
      type:    String,
      default: ''
    },
    initServicePort: {
      type:    [Number, String],
      default: ''
    },
    namespaces: {
      type:    Array,
      default: () => []
    },
    services: {
      type:    Array,
      default: () => []
    },
    showServicePort: {
      type:    Boolean,
      default: true
    }
  },
  data() {
    return {
      namespace:   this.initNamespace,
      service:     this.initService,
      servicePort: this.initServicePort,
    };
  },
  computed: {
    isView() {
      return this.mode === _VIEW;
    },
    nsOptions() {
      const namespaces = this.namespaces;

      return namespaces.map((ns) => ({ value: ns, label: ns }));
    },
    serviceNameOptions() {
      const services = this.services;
      const namespace = this.namespace;

      return services.filter((service) => service.metadata.namespace === namespace).map((service) => ({ value: service.metadata.name, label: service.nameDisplay ?? service.metadata.name }));
    },
    portOptions() {
      const service = this.services.find((s) => s.metadata.name === this.service);

      return service?.spec?.ports?.map((p) => ({ label: p.port, value: p.port })) || [];
    },
  },
  watch: {

    namespace(val) {
      this.serviceName = '';
      this.servicePort = '';
      this.$emit('update-namespace', val);
      this.$emit('update-service', '');
      this.$emit('update-service-port', '');
    },
    service(val) {
      this.servicePort = '';
      this.$emit('update-service', val);
      this.$emit('update-service-port', '');
    },
    servicePort(val) {
      this.$emit('update-service-port', val);
    }
  },
  methods: {}
};
</script>
