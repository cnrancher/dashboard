<script>
import EmberPage from '@/components/EmberPage';

export default {
  components: { EmberPage },

  props: {
    pages: {
      type:     Object,
      required: true
    },
  },

  data() {
    const page = this.$route.params.page;
    let src = '';

    if (page) {
      src = this.pages[page];
    }

    return {
      src,
      page
    };
  },
  computed: {
    path() {
      const page = this.$route.params.page;
      const query = this.$route.query;
      const q = Object.entries(query).map(e => `${ e[0] }=${ e[1] }`).join('&');

      return `${ this.pages[page] ?? '' }${ q ? `?${ q }` : '' }`;
    }
  },
  // watch: {
  //   $route() {
  //     const page = this.$route.params.page;

  //     this.src = this.pages[page] ?? '';
  //   }
  // },
};
</script>

<template>
  <EmberPage v-if="path" :src="path" />
  <div v-else>
    <h1>{{ t('generic.notFound') }}</h1>
    <h2>{{ page }}</h2>
  </div>
</template>
