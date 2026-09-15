import CruCce from './components/CruCce.vue';
import { isProviderEnabled } from '@shell/utils/settings';
import { shouldUseCceProvisionerEditForm } from './util/hostedProvisionerEditForm.js';

class CceProvisioner {
  static ID = 'cce';

  constructor(context) {
    this.context = context;
  }

  get id() {
    return CceProvisioner.ID;
  }

  get icon() {
    return require('./icon.svg');
  }

  get group() {
    return 'hosted';
  }

  get label() {
    return this.context.t('cceCn.label');
  }

  get component() {
    return CruCce;
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
    return this.context.t('cceCn.description');
  }

  shouldUseProvisionerEditForm(args) {
    return shouldUseCceProvisionerEditForm(args);
  }
}

export { CceProvisioner };
