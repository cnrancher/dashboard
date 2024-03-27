<template>
  <div>
    <Card
      class="prompt-suspend-cluster"
      :show-highlight-border="false"
    >
      <h4
        slot="title"
        class="text-default-text"
      >
        {{ t('cluster.k3s.actions.suspend.label') }}
      </h4>
      <div
        slot="body"
        class="pr-10 pl-10"
      >
        {{ t('cluster.k3s.actions.suspend.confirm', { name: names}) }}
      </div>
      <div
        slot="actions"
        class="bottom"
      >
        <div class="buttons">
          <button
            class="mr-10 btn role-secondary"
            @click="confirm(false)"
          >
            {{ t('generic.cancel') }}
          </button>
          <button
            class="btn role-primary"
            @click="confirm(true)"
          >
            {{ t('generic.confirm') }}
          </button>
        </div>
      </div>
    </Card>
  </div>
</template>

<script>
import { Card } from '@components/Card';

export default {
  props: {
    resources: {
      type:     Array,
      required: true
    },
  },
  computed: {
    names() {
      return this.resources.map((r) => r.nameDisplay).join(', ');
    }
  },
  methods: {
    confirm(result) {
      if (!result) {
        this.close();

        return;
      }
      const store = this.$store;

      this.resources.forEach(async(r) => {
        const inStore = store.getters['currentStore'](r);
        const c = await store.dispatch(`${ inStore }/clone`, { resource: r });

        c.spec['cluster-pause'] = true;
        c.save();
      });

      this.close();
    },
    close() {
      this.$emit('close');
    },
  },
  components: { Card }
};
</script>
<style lang="scss" scoped>
.prompt-suspend-cluster {
  margin: 0;
  .bottom {
    display: block;
    width: 100%;
  }
  .banner {
    margin-top: 0
  }
  .buttons {
    display: flex;
    justify-content: flex-end;
    width: 100%;
  }
}
</style>
