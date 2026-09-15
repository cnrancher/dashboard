import CruTke from './components/CruTke.vue';
import { isProviderEnabled } from '@shell/utils/settings';
import { shouldUseTkeProvisionerEditForm } from './util/hostedProvisionerEditForm.js';

class TkeProvisioner {
  static ID = 'tke';

  constructor(context) {
    this.context = context;
  }

  get id() {
    return TkeProvisioner.ID;
  }

  get icon() {
    return require('./icon.svg');
  }

  get group() {
    return 'hosted';
  }

  get label() {
    return this.context.t('tkeCn.label');
  }

  get component() {
    return CruTke;
  }

  get showImport() {
    return true;
  }

  get hidden() {
    return !isProviderEnabled(this.context, this.id);
  }

  get detailTabs() {
    return {
      machines:     false,
      logs:         false,
      registration: false,
      snapshots:    false,
      related:      true,
      events:       false,
      conditions:   false,
    };
  }

  get description() {
    return this.context.t('tkeCn.description');
  }

  shouldUseProvisionerEditForm(args) {
    return shouldUseTkeProvisionerEditForm(args);
  }
}

export { TkeProvisioner };
