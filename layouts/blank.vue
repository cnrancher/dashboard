<script>
import Brand from '@/mixins/brand';
import AutoLogout from '@/mixins/auto-logout';

export default {
  middleware: ['authenticated'],
  mixins:     [Brand, AutoLogout],
};
</script>

<template>
  <main>
    <nuxt />
  </main>
</template>

<style lang="scss" scoped>
</style>
