
import {
  HOST, IPAMVS_LABEL, VIRTUAL_SERVER_ADDRESS, DOMAIN_NAME, CREATED_ON, STATUS
} from './table-headers.js';
import { AGE, NAME } from '@shell/config/table-headers';

export function init(plugin, store) {
  const F5CIS = 'F5CISExtension';
  const {
    headers, basicType, configureType, virtualType, weightGroup, weightType, product
  } = plugin.DSL(store, F5CIS);

  const F5CISInstallView = 'f5cis-install-view';
  const VirtualServer = 'cis.f5.com.virtualserver';
  const TransportServer = 'cis.f5.com.transportserver';
  const TLSprofile = 'cis.f5.com.tlsprofile';
  const Policy = 'cis.f5.com.policy';
  const ExternalDNS = 'cis.f5.com.externaldns';
  const IngressLink = 'cis.f5.com.ingresslink';

  product({
    inStore:             'cluster',
    inExplorer:          true,
    icon:                'globe',
    removeable:          false,
    showNamespaceFilter: true,
    ifHave(rootGetters) {
      return rootGetters['features/get']('f5-ui-extension');
    }
  });

  virtualType({
    showMenuFun(state, getters, rootState, rootGetters) {
      return !rootGetters['cluster/schemaFor']('cis.f5.com.virtualserver');
    },
    labelKey:         'f5cis.installView.label',
    group:            'Root',
    icon:             'globe',
    namespaced:       false,
    ifRancherCluster: true,
    name:             F5CISInstallView,
    weight:           98,
    route:            { name: 'c-cluster-f5cis' },
    exact:            true,
    overview:         true
  });

  basicType([
    F5CISInstallView,
    VirtualServer,
    TransportServer,
    TLSprofile,
    Policy,
    ExternalDNS,
    IngressLink
  ]);

  weightType(VirtualServer, 99, true);
  weightType(TransportServer, 98, true);
  weightType(TLSprofile, 97, true);
  weightType(Policy, 96, true);
  weightType(ExternalDNS, 95, true);
  weightType(IngressLink, 94, true);

  configureType(F5CISInstallView, { displayName: store.getters['i18n/t'](`f5cis.installView.label`) });
  configureType(VirtualServer, { displayName: store.getters['i18n/t'](`f5cis.virtualServer.label`) });
  configureType(TransportServer, { displayName: store.getters['i18n/t'](`f5cis.transportServer.label`) });
  configureType(TLSprofile, { displayName: store.getters['i18n/t'](`f5cis.tlsProfile.label`) });
  configureType(Policy, { displayName: store.getters['i18n/t'](`f5cis.policy.label`) });
  configureType(ExternalDNS, { displayName: store.getters['i18n/t'](`f5cis.externaldns.label`) });
  configureType(IngressLink, { displayName: store.getters['i18n/t'](`f5cis.ingressLink.label`) });
  weightGroup(F5CIS, 1, true);

  headers(VirtualServer, [
    NAME,
    HOST,
    VIRTUAL_SERVER_ADDRESS,
    STATUS,
    AGE
  ]);

  headers(TransportServer, [
    NAME,
    HOST,
    VIRTUAL_SERVER_ADDRESS,
    STATUS,
    AGE
  ]);

  headers(TLSprofile, [
    NAME,
    AGE
  ]);

  headers(Policy, [
    NAME,
    AGE
  ]);

  headers(ExternalDNS, [
    DOMAIN_NAME,
    AGE,
    CREATED_ON
  ]);

  headers(IngressLink, [
    IPAMVS_LABEL,
    AGE
  ]);
}
