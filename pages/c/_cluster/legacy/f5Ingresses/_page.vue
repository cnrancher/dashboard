<script>
import EmbeddedPageView from '@/components/EmberPageView';
import { mapGetters } from 'vuex';
import { PROJECT_ID } from '@/config/query-params';

export default {
  components: { EmbeddedPageView },

  computed: {
    ...mapGetters(['currentCluster']),
    pages() {
      return { 'project-f5-ingresses': `/p/${ encodeURIComponent(this.$route.query[PROJECT_ID]) }/f5/controllers` };
    }
  },
};
</script>

<template>
  <EmbeddedPageView :pages="pages" />
</template>
