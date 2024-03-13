<template>
  <div>
    <Card
      class="prompt-resume-cluster"
      :show-highlight-border="false"
    >
      <h4
        slot="title"
        class="text-default-text"
      >
        {{ t('cluster.k3s.actions.resume.label') }}
      </h4>
      <div
        slot="body"
        class="pr-10 pl-10"
      >
        {{ t('cluster.k3s.actions.resume.confirm', { name: names}) }}
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

      this.resources.forEach((r) => {
        r.doAction('resume');
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
.prompt-resume-cluster {
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
