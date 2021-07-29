<script>
export default {
  middleware: ['authenticated'],

  head() {
    const theme = this.$store.getters['prefs/theme'];
    let title = this.$store.getters['i18n/t']('nav.title');

    if (process.client) {
      const t = window.localStorage.getItem('dashbaord_title');

      if (t) {
        title = t;
      }
    }

    return {
      bodyAttrs: { class: `theme-${ theme } dashboard-body` },
      title,
    };
  },
};
</script>

<template>
  <main>
    <nuxt />
  </main>
</template>

<style lang="scss" scoped>
</style>
