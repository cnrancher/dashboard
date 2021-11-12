import { SETTING } from '@/config/settings';
import { MANAGEMENT } from '@/config/types';
import throttle from 'lodash/throttle';

const defaultEvents = ['mousemove', 'mousedown', 'resize', 'keydown', 'touchstart', 'wheel'];

export default {
  async asyncData({ store }) {
    const uiSessionLogoutMinutes = await store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.UI_SESSION_LOGOUT_MINUTES);

    return { uiSessionLogoutMinutes };
  },

  data() {
    return {
      $_lastActive:      new Date().getTime(),
      $_autoLogoutTimer: null,
    };
  },

  computed: {
    uiSessionTimeout() {
      return parseInt(this.uiSessionLogoutMinutes ?? 30, 10) * 1000 * 60;
    }
  },

  methods: {
    $_resetLastActive: throttle(function() {
      this.$_lastActive = new Date().getTime();
    }, 250, { leading: true }),

    $_checkTimeout() {
      const now = new Date().getTime();

      if (now - this.$_lastActive < this.uiSessionTimeout) {
        return;
      }

      this.$store.dispatch('growl/warning', {
        title:   this.t('autoLogout.title'),
        message: this.t('autoLogout.message', { autoLogoutTime: this.uiSessionLogoutMinutes })
      }, { root: true });

      window.setTimeout(() => {
        this.$router.push({ name: 'auth-logout' });
      }, 5000);

      this.$_clear();
    },

    $_clear() {
      if (this.$_autoLogoutTimer) {
        window.clearInterval(this.$_autoLogoutTimer);
      }

      defaultEvents.forEach((e) => {
        window.document.removeEventListener(e, this.$_resetLastActive);
      });
    },

    $_init() {
      this.$_autoLogoutTimer = window.setInterval(() => {
        this.$_checkTimeout();
      }, 60 * 1000);

      defaultEvents.forEach((e) => {
        window.document.addEventListener(e, this.$_resetLastActive);
      });
    }
  },

  created() {
    if ( process.client ) {
      this.$_init();
    }
  },

  beforeDestroy() {
    if ( process.client ) {
      this.$_clear();
    }
  }
};
