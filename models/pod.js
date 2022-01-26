import { insertAt } from '@/utils/array';
import { colorForState, stateDisplay } from '@/plugins/steve/resource-class';
import { NODE, WORKLOAD_TYPES } from '@/config/types';
import SteveModel from '@/plugins/steve/steve-class';
import { shortenedImage } from '@/utils/string';

export const WORKLOAD_PRIORITY = {
  [WORKLOAD_TYPES.DEPLOYMENT]:             1,
  [WORKLOAD_TYPES.CRON_JOB]:               2,
  [WORKLOAD_TYPES.DAEMON_SET]:             3,
  [WORKLOAD_TYPES.STATEFUL_SET]:           4,
  [WORKLOAD_TYPES.JOB]:                    5,
  [WORKLOAD_TYPES.REPLICA_SET]:            6,
  [WORKLOAD_TYPES.REPLICATION_CONTROLLER]: 7,
};

export default class Pod extends SteveModel {
  get _availableActions() {
    const out = super._availableActions;

    // Add backwards, each one to the top
    insertAt(out, 0, { divider: true });
    insertAt(out, 0, this.openLogsMenuItem);
    insertAt(out, 0, this.openShellMenuItem);

    return out;
  }

  get openShellMenuItem() {
    return {
      action:     'openShell',
      enabled:    !!this.links.view && this.isRunning,
      icon:       'icon icon-fw icon-chevron-right',
      label:      'Execute Shell',
      total:      1,
    };
  }

  get openLogsMenuItem() {
    return {
      action:     'openLogs',
      enabled:    !!this.links.view,
      icon:       'icon icon-fw icon-chevron-right',
      label:      'View Logs',
      total:      1,
    };
  }

  get downloadFileMenuItem() {
    return {
      action:     'downloadFile',
      enabled:    !!this.actions?.download,
      icon:       'icon icon-download',
      label:      this.t('action.downloadFile'),
    };
  }

  get containerActions() {
    const out = [];

    insertAt(out, 0, this.downloadFileMenuItem);
    insertAt(out, 0, { divider: true });
    insertAt(out, 0, this.openLogsMenuItem);
    insertAt(out, 0, this.openShellMenuItem);

    return out;
  }

  get defaultContainerName() {
    const containers = this.spec.containers;
    const desirable = containers.filter(c => c.name !== 'istio-proxy');

    if ( desirable.length ) {
      return desirable[0].name;
    }

    return containers[0]?.name;
  }

  async openShell(containerName = this.defaultContainerName) {
    if (this.$rootGetters['auth/isReadOnlyAdmin']) {
      try {
        const clusterId = this.$rootGetters['clusterId'];
        const { namespace, name } = this.metadata;
        const endpoint = `/k8s/clusters/${ clusterId }`;
        const path = `/api/v1/namespaces/${ namespace }/pods/${ name }/exec`;
        const resp = await this.hasExecShellPermission(endpoint, path);

        if (resp?.status?.allowed === false) {
          this.$dispatch('growl/error', {
            title:   this.t('wm.containerShell.permissionDenied.title'),
            message: this.t('wm.containerShell.permissionDenied.message')
          }, { root: true });

          return;
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(error);
      }
    }

    this.$dispatch('wm/open', {
      id:        `${ this.id }-shell`,
      label:     this.nameDisplay,
      icon:      'terminal',
      component: 'ContainerShell',
      attrs:     {
        pod:              this,
        initialContainer: containerName
      }
    }, { root: true });
  }

  openLogs(containerName = this.defaultContainerName) {
    this.$dispatch('wm/open', {
      id:        `${ this.id }-logs`,
      label:     this.nameDisplay,
      icon:      'file',
      component: 'ContainerLogs',
      attrs:     {
        pod:              this,
        initialContainer: containerName
      }
    }, { root: true });
  }

  downloadFile() {
    const resources = this;

    this.$dispatch('promptModal', {
      resources,
      component: 'DownloadFileDialog'
    });
  }

  containerStateDisplay(container) {
    const state = Object.keys(container.state || {})[0];

    return stateDisplay(state);
  }

  containerStateColor(container) {
    const state = Object.keys(container.state || {})[0];

    return colorForState(state);
  }

  get imageNames() {
    return this.spec.containers.map(container => shortenedImage(container.image));
  }

  get workloadRef() {
    const owners = this.getOwners() || [];
    const workloads = owners.filter((owner) => {
      return Object.values(WORKLOAD_TYPES).includes(owner.type);
    }).sort((a, b) => {
      // Prioritize types so that deployments come before replicasets and such.
      const ia = WORKLOAD_PRIORITY[a.type];
      const ib = WORKLOAD_PRIORITY[b.type];

      return ia - ib;
    });

    return workloads[0];
  }

  get details() {
    const out = [
      {
        label:   this.t('workload.detailTop.podIP'),
        content: this.status.podIP
      },
    ];

    if ( this.workloadRef ) {
      out.push({
        label:         'Workload',
        formatter:     'LinkName',
        formatterOpts: {
          value:     this.workloadRef.name,
          type:      this.workloadRef.type,
          namespace: this.workloadRef.namespace
        },
        content: this.workloadRef.name
      });
    }

    if ( this.spec.nodeName ) {
      out.push({
        label:         'Node',
        formatter:     'LinkName',
        formatterOpts: { type: NODE, value: this.spec.nodeName },
        content:       this.spec.nodeName,
      });
    }

    out.push({
      label:         'Macvlan IP',
      content:       this.displayMacvlanIp,
    });

    return out;
  }

  get isRunning() {
    return this.status.phase === 'Running';
  }

  get macvlanIpv6() {
    const annotations = this.metadata?.annotations || {};
    const networkStatusStr = annotations?.['k8s.v1.cni.cncf.io/networks-status'];

    if (!networkStatusStr) {
      return '';
    }
    let networkStatus;

    try {
      networkStatus = JSON.parse(networkStatusStr);
    } catch (err) {
      return '';
    }
    if (networkStatus) {
      const macvlan = networkStatus.find(n => n.interface === 'eth1');

      return `${ (macvlan && macvlan.ips && macvlan.ips[1]) || '' }`;
    }

    return '';
  }

  get displayMacvlanIp() {
    const macvlanIpWithoutType = this.macvlanIpWithoutType;
    const macvlanIpv6 = this.macvlanIpv6;
    let divide = '';

    if (macvlanIpWithoutType && macvlanIpv6) {
      divide = ` / `;
    }

    return `${ macvlanIpWithoutType }${ divide }${ macvlanIpv6 }`;
  }

  // macvlanIpType() {
  //   const labels = this.labels;
  //   const type = labels && labels['macvlan.panda.io/macvlanIpType'];

  //   return type || '';
  // }

  get macvlanIpWithoutType() {
    const annotations = this.metadata?.annotations || {};
    const networkStatusStr = annotations && annotations['k8s.v1.cni.cncf.io/networks-status'];

    if (!networkStatusStr) {
      return '';
    }
    let networkStatus;

    try {
      networkStatus = JSON.parse(networkStatusStr);
    } catch (err) {
      return '';
    }
    if (networkStatus) {
      const macvlan = networkStatus.find(n => n.interface === 'eth1');

      return `${ (macvlan && macvlan.ips && macvlan.ips[0]) || '' }`;
    }

    return '';
  }

  async hasExecShellPermission(endpoint, path) {
    const url = `${ endpoint }/apis/authorization.k8s.io/v1/selfsubjectaccessreviews`;
    const params = {
      spec: {
        nonResourceAttributes: {
          verb: 'create',
          path,
        }
      }
    };
    const resp = await this.$dispatch('cluster/request', {
      url,
      method: 'POST',
      data:   params,
    }, { root: true });

    return resp;
  }
}
