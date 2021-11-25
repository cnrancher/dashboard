<script>
import LabeledInput from '@/components/form/LabeledInput';
import RadioGroup from '@/components/form/RadioGroup';
import { set } from '@/utils/object';

const HARBOR_AUTH_KEY = 'rancher.cn/registry-harbor-auth';
const HARBOR_ADMIN_AUTH_KEY = 'rancher.cn/registry-harbor-admin-auth';

export default {
  components: { LabeledInput, RadioGroup },

  props: {
    value: {
      type:     Object,
      required: true,
    },

    mode: {
      type:     String,
      required: true,
    }
  },

  data() {
    let registryProvider = 'Custom';

    let auths;

    try {
      const parsed = JSON.parse(this.value.decodedData['.dockerconfigjson']);

      auths = parsed.auths;
    } catch (e) {}

    auths = auths || {};

    const registryUrl = Object.keys(auths)[0] || '';

    if (registryUrl === 'index.docker.io/v1/') {
      registryProvider = 'DockerHub';
    } else if (registryUrl === 'quay.io') {
      registryProvider = 'Quay.io';
    } else if (registryUrl.includes('artifactory')) {
      registryProvider = 'Artifactory';
    }

    const username = auths[registryUrl]?.username || '';
    const password = auths[registryUrl]?.password || '';

    this.initHarborConfig();

    return {
      registryProvider,
      username,
      password,
      registryUrl,
      harborConfig: {},
    };
  },

  computed: {
    registryAddresses() {
      if (this.enabledHarborService) {
        return ['Custom', 'DockerHub', 'Harbor', 'Quay.io', 'Artifactory'];
      }

      return ['Custom', 'DockerHub', 'Quay.io', 'Artifactory'];
    },

    needsDockerServer() {
      return this.registryProvider === 'Artifactory' || this.registryProvider === 'Custom';
    },
    isHarbor() {
      return this.registryProvider === 'Harbor';
    },
    isNew() {
      return this.mode === 'create';
    },
    isHarborCred() {
      const labels = this.value?.metadata?.labels || {};

      return labels?.[HARBOR_AUTH_KEY] === 'true';
    },
    enabledHarborService() {
      const isAdmin = this.$store.getters['auth/isAdmin'];
      const v3User = this.$store.getters['auth/v3User'] || {};

      if (this?.harborConfig?.registryUrl) {
        if (isAdmin) {
          return true;
        }
        const a = v3User.annotations || {};

        if (a && a['management.harbor.pandaria.io/synccomplete'] === 'true') {
          return true;
        }
      }

      return false;
    },

    dockerconfigjson() {
      let dockerServer = this.registryProvider === 'DockerHub' ? 'index.docker.io/v1/' : 'quay.io';

      if (this.needsDockerServer) {
        dockerServer = this.registryUrl;
      }

      if (this.registryProvider === 'Harbor' && this.enabledHarborService) {
        dockerServer = this?.harborConfig?.registryUrl;
        dockerServer = dockerServer.includes('://') ? dockerServer.substr(dockerServer.indexOf('://') + 3) : dockerServer;
        const labels = this.value?.metadata?.labels || {};
        const isAdmin = this.$store.getters['auth/isAdmin'];

        labels[HARBOR_AUTH_KEY] = 'true';
        if (isAdmin) {
          labels[HARBOR_ADMIN_AUTH_KEY] = 'true';
        }
        this.value.setLabels(labels);
      } else {
        const labels = this.value?.metadata?.labels || {};

        if (labels) {
          const keys = Object.keys(labels);

          if (keys.includes(HARBOR_AUTH_KEY)) {
            delete labels[HARBOR_AUTH_KEY];
          }
          if (keys.includes(HARBOR_ADMIN_AUTH_KEY)) {
            delete labels[HARBOR_ADMIN_AUTH_KEY];
          }
          if (Object.keys(labels).length === 0) {
            delete this.value.metadata.labels;
          }
        }
      }

      if (dockerServer) {
        const config = {
          auths: {
            [dockerServer]: {
              username: this.username,
              password: this.password,
            }
          }
        };
        const json = JSON.stringify(config);

        return json;
      } else {
        return null;
      }
    },
  },

  watch: {
    registryProvider: 'update',
    registryUrl:      'update',
    username:         'update',
    password:         'update',

    registryAddresses: 'setHarbor'
  },

  methods: {
    setHarbor() {
      if (this.isHarborCred) {
        set(this, 'registryProvider', 'Harbor');
      }
    },
    update() {
      this.value.setData('.dockerconfigjson', this.dockerconfigjson);
    },
    initHarborConfig() {
      this.getHarborConfig().then((harborConfig) => {
        this.harborConfig = harborConfig;
      });
    },
    getHarborConfig() {
      const v3User = this.$store.getters['auth/v3User'] || {};
      const isAdmin = this.$store.getters['auth/isAdmin'];

      return this.loadHarborRegistryUrl().then((registryUrl) => {
        if (!registryUrl) {
          return {
            registryUrl:  '',
            username:    '',
          };
        }
        if (!!isAdmin) {
          return this.loadHarborAccount().then((account) => {
            return {
              registryUrl,
              username: account,
            };
          });
        } else {
          const account = v3User.annotations['authz.management.cattle.io.cn/harborauth'];

          return {
            registryUrl,
            harborAccount: account || '',
          };
        }
      });
    },

    loadHarborRegistryUrl() {
      return this.$store.dispatch('management/request', { url: '/v3/settings/harbor-server-url' }).then((resp) => {
        return resp?.value || '';
      });
    },
    loadHarborAccount() {
      return this.$store.dispatch('management/request', { url: '/v3/settings/harbor-admin-auth' }).then((resp) => {
        return resp?.value || '';
      });
    },
  }
};
</script>

<template>
  <div>
    <div class="row mb-10">
      <div class="col span-12">
        <RadioGroup
          v-model="registryProvider"
          name="registryProvider"
          :mode="mode"
          :options="registryAddresses"
        />
      </div>
    </div>
    <div v-if="needsDockerServer" class="row mb-20">
      <LabeledInput v-model="registryUrl" required :label="t('secret.registry.domainName')" placeholder="e.g. index.docker.io" :mode="mode" />
    </div>
    <div v-if="!isHarbor" class="row mb-20">
      <div class="col span-6">
        <LabeledInput v-model="username" :label="t('secret.registry.username')" :mode="mode" />
      </div>
      <div class="col span-6">
        <LabeledInput v-model="password" :label="t('secret.registry.password')" :mode="mode" type="password" />
      </div>
    </div>

    <div v-else>
      <div class="row mb-20">
        <div class="col span-6">
          <LabeledInput :value="harborConfig.username" :disabled="isNew" :label="t('secret.registry.username')" :mode="mode" />
        </div>
        <div v-if="isNew" class="col span-6">
          <LabeledInput value="已保存" disabled :label="t('secret.registry.password')" :mode="mode" type="text" />
        </div>
        <div v-else class="col span-6">
          <LabeledInput :value="harborConfig.password" :disabled="isNew" :label="t('secret.registry.password')" :mode="mode" type="password" />
        </div>
      </div>
    </div>
  </div>
</template>
