<script>
import EmbeddedPageView from '@shell/components/EmberPageView';
import { mapGetters } from 'vuex';

export default {
  components: { EmbeddedPageView },

  computed: {
    ...mapGetters(['currentCluster']),
    pages() {
      return { 'cluster-cisF5': `/c/${ this.currentCluster.id }/cis/f5` };
    }
  },
};
</script>

<template>
  <EmbeddedPageView :pages="pages" />
</template>
