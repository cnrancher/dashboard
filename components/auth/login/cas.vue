<script>
import Login from '@/mixins/login';

export default {
  mixins: [Login],

  methods: {
    login() {
      this.$store.dispatch('auth/redirectTo', { provider: this.name });
    },
  },
};
</script>

<template>
  <div class="text-center">
    <button ref="btn" class="btn role-primary" @click="login">
      {{ t('login.loginWithProvider', {provider: displayName}) }}
    </button>
  </div>
</template>
