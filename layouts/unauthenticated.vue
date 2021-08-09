<script>
export default {
  head() {
    const theme = this.$store.getters['prefs/theme'];
    let title = this.$store.getters['i18n/t']('nav.title');

    if (process.client) {
      const m = window.location.pathname.match(/\/proxy\/explorer\/([^/]+)\//);

      if (m?.length === 2) {
        const t = m[1]?.split('.')[0];

        if (t) {
          title = t;
        }
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
main {
  height: 100vh;
}
</style>
