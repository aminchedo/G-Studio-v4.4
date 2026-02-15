/**
 * Runtime UI Discovery Service
 * Discovers all interactive UI elements at runtime
 */

export interface DiscoveredUIElement {
  id: string;
  type: 'button' | 'link' | 'input' | 'select' | 'custom';
  label: string;
  ref: string;
  selector: string;
  component: string;
  isVisible: boolean;
  isDisabled: boolean;
  location: 'ribbon' | 'sidebar' | 'toolbar' | 'modal' | 'main' | 'activity-bar' | 'preview';
  tab?: string; // For ribbon tabs
}

export class RuntimeUIDiscovery {
  private static elements: DiscoveredUIElement[] = [];
  private static elementCounter = 0;

  static generateId(): string {
    return `ui-elem-${++this.elementCounter}`;
  }

  static parseSnapshot(snapshot: any): DiscoveredUIElement[] {
    this.elements = [];
    this.elementCounter = 0;
    
    if (!snapshot || !snapshot.Page) {
      return [];
    }

    this.traverseSnapshot(snapshot.Page, '');
    return this.elements;
  }

  private static traverseSnapshot(node: any, path: string, location: DiscoveredUIElement['location'] = 'main'): void {
    if (!node || typeof node !== 'object') return;

    // Check if this is a button or interactive element
    if (node.type === 'button' || node.role === 'button') {
      const label = node.name || node.text || node.label || 'Unlabeled Button';
      const ref = node.ref || '';
      
      // Determine location
      let elemLocation = location;
      if (path.includes('ribbon') || path.includes('Ribbon')) {
        elemLocation = 'ribbon';
      } else if (path.includes('sidebar') || path.includes('Sidebar')) {
        elemLocation = 'sidebar';
      } else if (path.includes('activity') || path.includes('Activity')) {
        elemLocation = 'activity-bar';
      } else if (path.includes('preview') || path.includes('Preview')) {
        elemLocation = 'preview';
      }

      const element: DiscoveredUIElement = {
        id: this.generateId(),
        type: 'button',
        label: label.trim(),
        ref: ref,
        selector: `[ref="${ref}"]`,
        component: this.inferComponent(path, label),
        isVisible: !node.hidden,
        isDisabled: node.disabled === true,
        location: elemLocation,
      };

      this.elements.push(element);
    }

    // Traverse children
    if (Array.isArray(node.children)) {
      node.children.forEach((child: any, index: number) => {
        this.traverseSnapshot(child, `${path}/${index}`, location);
      });
    } else if (node.children) {
      this.traverseSnapshot(node.children, `${path}/children`, location);
    }
  }

  private static inferComponent(path: string, label: string): string {
    if (path.includes('ribbon') || label.includes('Ribbon')) {
      return 'Ribbon';
    }
    if (path.includes('sidebar') || label.includes('Sidebar')) {
      return 'Sidebar';
    }
    if (label.includes('Settings')) {
      return 'SettingsModal';
    }
    if (label.includes('Agent') || label.includes('AI')) {
      return 'AgentModal';
    }
    return 'Unknown';
  }

  static getAllElements(): DiscoveredUIElement[] {
    return this.elements;
  }

  static getElementsByLocation(location: DiscoveredUIElement['location']): DiscoveredUIElement[] {
    return this.elements.filter(e => e.location === location);
  }

  static getClickableElements(): DiscoveredUIElement[] {
    return this.elements.filter(e => !e.isDisabled && e.isVisible);
  }
}
