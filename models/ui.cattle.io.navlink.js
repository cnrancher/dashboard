import { proxyUrlFromParts } from '@/models/service';
import SteveModel from '@/plugins/steve/steve-class';

export default class extends SteveModel {
  get labelDisplay() {
    return this.spec?.label || this.metadata.name || '?';
  }

  get link() {
    if (this.isIframe) {
      if ( this.spec?.toURL ) {
        return `/c/${ this.$rootGetters['clusterId'] }/legacy/navLinks/iframe?link=${ this.spec.toURL }`;
      } else if ( this.spec?.toService ) {
        const s = this.spec.toService;

        return `/c/${ this.$rootGetters['clusterId'] }/legacy/navLinks/iframe?link=${ proxyUrlFromParts(this.$rootGetters['clusterId'], s.namespace, s.name, s.scheme, s.port, s.path) }`;
      } else {
        return null;
      }
    }

    if ( this.spec?.toURL ) {
      return this.spec.toURL;
    } else if ( this.spec?.toService ) {
      const s = this.spec.toService;

      return proxyUrlFromParts(this.$rootGetters['clusterId'], s.namespace, s.name, s.scheme, s.port, s.path);
    } else {
      return null;
    }
  }

  get normalizedGroup() {
    if ( !this.spec.group ) {
      return null;
    }

    return this.spec.group
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  get actualTarget() {
    return (this.spec.target || '').trim() || '_blank';
  }

  get isIframe() {
    return this.metadata.labels?.['navlink.pandaria.io/iframe'] === 'true';
  }
}
