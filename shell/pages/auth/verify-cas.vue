<script>
import { BACK_TO, IS_SLO, _FLAGGED } from '@shell/config/query-params';
import loadPlugins from '@shell/plugins/plugin';

function reply(err, code) {
  try {
    window.opener.window.onAuthTest(err, code);
    setTimeout(() => {
      window.close();
    }, 250);
  } catch (e) {
    window.close();
  }
}

export default {
  layout: 'unauthenticated',

  async fetch() {
    const ticket = this.$route.query.ticket;
    const {
      error, error_description: errorDescription, errorCode, errorMsg
    } = this.$route.query;

    if (error || errorDescription || errorCode || errorMsg) {
      let out = errorDescription || error || errorCode;

      if (this.isSlo) {
        console.error('Failed to log out of auth provider', error, errorDescription, errorCode, errorMsg); // eslint-disable-line no-console

        let out = this.$store.getters['i18n/withFallback'](`logout.specificError.unknown`);

        if (errorCode) {
          out = this.$store.getters['i18n/withFallback'](`logout.specificError.${ errorCode }`, null, out);
        }

        this.$router.replace(`/auth/login?${ IS_SLO }&err=${ escape(out) }`);

        return;
      } else {
        if (errorMsg) {
          out = this.$store.getters['i18n/withFallback'](`login.serverError.${ errorMsg }`, null, errorMsg);
        }

        this.$router.replace(`/auth/login?err=${ escape(out) }`);

        return;
      }
    }

    // check for existence of IS_SLO query param to differentiate between a login and a logout
    if (this.isSlo) {
      this.$store.dispatch('auth/uiLogout');

      return;
    }
    if (ticket && window.opener) {
      return;
    }

    try {
      const res = await this.$store.dispatch('auth/verifyCASAuth', { ticket });

      if ( res._status === 200) {
        const backTo = this.$route.query[BACK_TO] || '/';

        // Load plugins
        await loadPlugins({
          app:     this.$store.app,
          store:   this.$store,
          $plugin: this.$store.$plugin
        });

        this.$router.replace(backTo);
      } else {
        this.$router.replace(`/auth/login?err=${ escape(res) }`);
      }
    } catch (err) {
      this.$router.replace(`/auth/login?err=${ escape(err) }`);
    }
  },

  data() {
    const ticket = this.$route.query.ticket;
    // Is Single Log Out
    const isSlo = this.$route.query[IS_SLO] === _FLAGGED;

    return { testing: ticket && window.opener, isSlo };
  },

  mounted() {
    if ( this.testing ) {
      try {
        const {
          error: respError, error_description: respErrorDescription, ticket, errorMsg
        } = this.$route.query;

        let error = respErrorDescription || respError || (!ticket ? 'No ticket supplied by auth provider' : null);

        if (errorMsg) {
          error = this.$store.getters['i18n/withFallback'](`login.serverError.${ errorMsg }`, null, errorMsg);
        }

        reply(error, ticket );
      } catch (e) {
        window.close();
      }
    } else if ( window.opener ) {
      if ( window.opener.window.onAuthTest ) {
        reply(null, null);
      } else {
        reply({ err: 'failure' });
      }
    }
  }
};
</script>

<template>
  <main class="main-layout">
    <h1 class="text-center mt-50">
      <span v-if="testing">
        Testing Configuration&hellip;
      </span>
      <span v-else-if="isSlo">
        Logging Out&hellip;
      </span>
      <span v-else>
        Logging In&hellip;
      </span>
    </h1>
  </main>
</template>
